import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICE_KEY = process.env.SERVICE_API_KEY!;
const DEMO_CLINIC_ID = '11111111-1111-1111-1111-111111111111';

describe('Clinic API & Isolation', () => {
  let managerTgId: string;
  let otherClinicManagerTgId: string;
  let otherClinicId: string;

  beforeAll(async () => {
    managerTgId = `mgr_clinic_test_${Date.now()}`;
    await prisma.user.create({
      data: {
        telegramId: managerTgId,
        role: 'MANAGER',
        clinicId: DEMO_CLINIC_ID
      }
    });

    // Create a second clinic for isolation tests
    const otherClinic = await prisma.clinic.create({
      data: {
        name: 'Second Clinic',
        address: '456 Other Street',
        phone: '+91 99999 88888',
        workingHours: { monday: { open: '10:00', close: '16:00' } }
      }
    });
    otherClinicId = otherClinic.id;

    otherClinicManagerTgId = `other_mgr_${Date.now()}`;
    await prisma.user.create({
      data: {
        telegramId: otherClinicManagerTgId,
        role: 'MANAGER',
        clinicId: otherClinicId
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { telegramId: { in: [managerTgId, otherClinicManagerTgId] } }
    });
    await prisma.clinic.delete({ where: { id: otherClinicId } });
  });

  it('GET /v1/clinics/:id/profile should return clinic profile', async () => {
    const res = await request(app)
      .get(`/v1/clinics/${DEMO_CLINIC_ID}/profile`)
      .set('x-service-api-key', SERVICE_KEY);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('City Care Clinic');
  });

  it('PATCH /v1/clinics/:id/profile should update profile if manager of that clinic', async () => {
    const res = await request(app)
      .patch(`/v1/clinics/${DEMO_CLINIC_ID}/profile`)
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', managerTgId)
      .send({ phone: '+91 98765 43211' });

    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+91 98765 43211');
  });

  it('PATCH /v1/clinics/:id/profile should reject cross-clinic access with 403', async () => {
    const res = await request(app)
      .patch(`/v1/clinics/${otherClinicId}/profile`)
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', managerTgId) // manager of DEMO_CLINIC_ID
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CROSS_CLINIC_DENIED');
  });

  it('PATCH /v1/clinics/:id/profile should reject patient role with 403', async () => {
    const patientTgId = `pat_${Date.now()}`;
    const res = await request(app)
      .patch(`/v1/clinics/${DEMO_CLINIC_ID}/profile`)
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', patientTgId)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_ROLE');
  });
});
