import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICE_KEY = process.env.SERVICE_API_KEY!;
const DEMO_CLINIC_ID = '11111111-1111-1111-1111-111111111111';

describe('Auth & Identity API', () => {
  it('should reject requests without service key with 401', async () => {
    const res = await request(app).post('/v1/identity/resolve');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SERVICE_KEY');
  });

  it('should resolve new telegram user as PATIENT', async () => {
    const testTgId = `test_tg_${Date.now()}`;
    const res = await request(app)
      .post('/v1/identity/resolve')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', testTgId);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('PATIENT');
    expect(res.body.telegramId).toBe(testTgId);
  });

  it('should link manager via invite code', async () => {
    const managerTgId = `manager_tg_${Date.now()}`;
    // Create an invite code
    const inviteCode = `INV-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    await prisma.inviteCode.create({
      data: {
        clinicId: DEMO_CLINIC_ID,
        code: inviteCode,
        role: 'MANAGER',
        expiresAt
      }
    });

    const res = await request(app)
      .post('/v1/identity/link-invite')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', managerTgId)
      .send({ inviteCode, name: 'Clinic Manager' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe('MANAGER');
    expect(res.body.clinicId).toBe(DEMO_CLINIC_ID);

    // Verify resolve returns MANAGER now
    const checkRes = await request(app)
      .post('/v1/identity/resolve')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', managerTgId);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.role).toBe('MANAGER');
    expect(checkRes.body.clinicId).toBe(DEMO_CLINIC_ID);
  });

  it('should reject already-used or invalid invite code', async () => {
    const res = await request(app)
      .post('/v1/identity/link-invite')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', 'some_tg_id')
      .send({ inviteCode: 'INVALID_CODE_999' });

    expect(res.status).toBe(404);
  });
});
