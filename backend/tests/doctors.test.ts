import request from 'supertest';
import { app } from '../src/app';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICE_KEY = process.env.SERVICE_API_KEY!;
const DEMO_CLINIC_ID = '11111111-1111-1111-1111-111111111111';
const DOCTOR_ID = '22222222-2222-2222-2222-222222222222'; // Dr. Priya Sharma (Cardiology)

describe('Doctor & Availability API', () => {
  it('GET /v1/clinics/:id/doctors should return list of active doctors', async () => {
    const res = await request(app)
      .get(`/v1/clinics/${DEMO_CLINIC_ID}/doctors`)
      .set('x-service-api-key', SERVICE_KEY);

    expect(res.status).toBe(200);
    expect(res.body.doctors).toBeInstanceOf(Array);
    expect(res.body.doctors.length).toBeGreaterThanOrEqual(1);
    expect(res.body.doctors[0]).toHaveProperty('consultationFee');
  });

  it('GET /v1/clinics/:id/doctors?specialty=Cardiology should filter doctors', async () => {
    const res = await request(app)
      .get(`/v1/clinics/${DEMO_CLINIC_ID}/doctors?specialty=Cardiology`)
      .set('x-service-api-key', SERVICE_KEY);

    expect(res.status).toBe(200);
    expect(res.body.doctors.every((d: any) => d.specialty.includes('Cardiology'))).toBe(true);
  });

  it('GET /v1/doctors/:id/availability should compute available slots', async () => {
    // Tomorrow date in YYYY-MM-DD
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // If tomorrow is Sunday, pick Monday
    if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .get(`/v1/doctors/${DOCTOR_ID}/availability?date=${dateStr}`)
      .set('x-service-api-key', SERVICE_KEY);

    expect(res.status).toBe(200);
    expect(res.body.doctorId).toBe(DOCTOR_ID);
    expect(res.body.slots).toBeInstanceOf(Array);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.slots[0]).toHaveProperty('formattedTime');
  });
});
