import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICE_KEY = process.env.SERVICE_API_KEY!;
const DEMO_CLINIC_ID = '11111111-1111-1111-1111-111111111111';
const DOCTOR_ID = '22222222-2222-2222-2222-222222222222';

describe('Appointments API (Booking, Verification, Reschedule, Cancel)', () => {
  let createdAppointmentId: string;
  let createdBookingCode: string;
  let testSlotDate: string;

  beforeAll(() => {
    // Pick a future date (e.g. 10 days ahead at 10:00 AM UTC)
    const future = new Date();
    future.setDate(future.getDate() + 10);
    future.setUTCHours(4, 30, 0, 0); // 10:00 AM IST is 04:30 AM UTC
    testSlotDate = future.toISOString();
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { clinicId: DEMO_CLINIC_ID, patientPhone: '9876500001' }
    });
  });

  it('should REJECT booking without confirmation with 400 CONFIRMATION_REQUIRED', async () => {
    const res = await request(app)
      .post('/v1/appointments')
      .set('x-service-api-key', SERVICE_KEY)
      .send({
        clinicId: DEMO_CLINIC_ID,
        doctorId: DOCTOR_ID,
        startsAt: testSlotDate,
        patientName: 'Aman Test',
        patientPhone: '9876500001',
        confirmation: { confirmed: false, confirmationId: 'test-token' }
      });

    expect(res.status).toBe(400);
  });

  it('should SUCCEED booking with explicit confirmation', async () => {
    const res = await request(app)
      .post('/v1/appointments')
      .set('x-service-api-key', SERVICE_KEY)
      .send({
        clinicId: DEMO_CLINIC_ID,
        doctorId: DOCTOR_ID,
        startsAt: testSlotDate,
        patientName: 'Aman Test',
        patientPhone: '9876500001',
        confirmation: { confirmed: true, confirmationId: 'token-12345' }
      });

    expect(res.status).toBe(201);
    expect(res.body.bookingCode).toBeDefined();
    expect(res.body.bookingCode.startsWith('APT-')).toBe(true);
    expect(res.body.status).toBe('BOOKED');

    createdAppointmentId = res.body.appointmentId;
    createdBookingCode = res.body.bookingCode;
  });

  it('should PREVENT double-booking the same slot with 409 conflict', async () => {
    const res = await request(app)
      .post('/v1/appointments')
      .set('x-service-api-key', SERVICE_KEY)
      .send({
        clinicId: DEMO_CLINIC_ID,
        doctorId: DOCTOR_ID,
        startsAt: testSlotDate,
        patientName: 'Another Patient',
        patientPhone: '9876500002',
        confirmation: { confirmed: true, confirmationId: 'token-67890' }
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_ALREADY_BOOKED');
  });

  it('should VERIFY appointment with matching booking code and phone', async () => {
    const res = await request(app)
      .post('/v1/appointments/verify')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', 'verify_test_user')
      .send({
        bookingCode: createdBookingCode,
        phone: '9876500001'
      });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.appointment).toBeDefined();
    expect(res.body.appointment.bookingCode).toBe(createdBookingCode);
  });

  it('should fail verification and decrement attempts for wrong code', async () => {
    const trackingTgId = `wrong_test_${Date.now()}`;
    const res1 = await request(app)
      .post('/v1/appointments/verify')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', trackingTgId)
      .send({ bookingCode: 'APT-WRONG1' });

    expect(res1.status).toBe(200);
    expect(res1.body.verified).toBe(false);
    expect(res1.body.attemptsRemaining).toBe(2);

    const res2 = await request(app)
      .post('/v1/appointments/verify')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', trackingTgId)
      .send({ bookingCode: 'APT-WRONG2' });

    expect(res2.body.attemptsRemaining).toBe(1);

    const res3 = await request(app)
      .post('/v1/appointments/verify')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', trackingTgId)
      .send({ bookingCode: 'APT-WRONG3' });

    expect(res3.body.attemptsRemaining).toBe(0);
    expect(res3.body.locked).toBe(true);
  });

  it('should RESCHEDULE appointment to new slot with confirmation', async () => {
    const newSlot = new Date(new Date(testSlotDate).getTime() + 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post(`/v1/appointments/${createdAppointmentId}/reschedule`)
      .set('x-service-api-key', SERVICE_KEY)
      .send({
        newStartsAt: newSlot,
        confirmation: { confirmed: true, confirmationId: 'resched-token-1' }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newBookingCode).toBeDefined();

    // Verify old appointment status is RESCHEDULED
    const oldAppt = await prisma.appointment.findUnique({ where: { id: createdAppointmentId } });
    expect(oldAppt?.status).toBe('RESCHEDULED');

    // Update appointment ID for cancellation test
    createdAppointmentId = res.body.newAppointmentId;
  });

  it('should CANCEL appointment with confirmation and release slot', async () => {
    const res = await request(app)
      .post(`/v1/appointments/${createdAppointmentId}/cancel`)
      .set('x-service-api-key', SERVICE_KEY)
      .send({
        confirmation: { confirmed: true, confirmationId: 'cancel-token-1' },
        reason: 'Patient requested cancellation'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('CANCELLED');

    const appt = await prisma.appointment.findUnique({ where: { id: createdAppointmentId } });
    expect(appt?.status).toBe('CANCELLED');
  });
});
