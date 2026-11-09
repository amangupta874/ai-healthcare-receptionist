import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICE_KEY = process.env.SERVICE_API_KEY!;
const DEMO_CLINIC_ID = '11111111-1111-1111-1111-111111111111';

describe('Escalations API', () => {
  let managerTgId: string;

  beforeAll(async () => {
    managerTgId = `mgr_esc_test_${Date.now()}`;
    await prisma.user.create({
      data: {
        telegramId: managerTgId,
        role: 'MANAGER',
        clinicId: DEMO_CLINIC_ID
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { telegramId: managerTgId } });
  });

  it('POST /v1/escalations should record an escalation ticket', async () => {
    const res = await request(app)
      .post('/v1/escalations')
      .set('x-service-api-key', SERVICE_KEY)
      .send({
        clinicId: DEMO_CLINIC_ID,
        reason: 'PATIENT_REQUEST',
        summary: 'Patient wants to speak directly to Dr. Sharma regarding previous treatment.',
        patientName: 'Ravi Kumar',
        patientPhone: '9876543210'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('OPEN');
  });

  it('GET /v1/escalations should list open escalations for clinic manager', async () => {
    const res = await request(app)
      .get(`/v1/escalations?clinicId=${DEMO_CLINIC_ID}`)
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', managerTgId);

    expect(res.status).toBe(200);
    expect(res.body.escalations).toBeInstanceOf(Array);
    expect(res.body.escalations.length).toBeGreaterThan(0);
  });
});

