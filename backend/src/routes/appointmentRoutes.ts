import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppointmentService } from '../services/appointmentService';
import { verifyServiceAuth, resolveUser } from '../middleware/auth';

export const appointmentRoutes = Router();

appointmentRoutes.use(verifyServiceAuth);
appointmentRoutes.use(resolveUser);

const ConfirmationSchema = z.object({
  confirmed: z.literal(true),
  confirmationId: z.string().min(1)
});

const BookAppointmentSchema = z.object({
  clinicId: z.string().uuid(),
  doctorId: z.string().uuid(),
  startsAt: z.string().datetime(),
  patientName: z.string().min(2),
  patientPhone: z.string().min(8),
  confirmation: ConfirmationSchema
});

const VerifyAppointmentSchema = z.object({
  bookingCode: z.string().min(4),
  phone: z.string().optional(),
  name: z.string().optional()
});

const CancelAppointmentSchema = z.object({
  confirmation: ConfirmationSchema,
  reason: z.string().optional()
});

const RescheduleAppointmentSchema = z.object({
  newStartsAt: z.string().datetime(),
  confirmation: ConfirmationSchema
});

// POST /v1/appointments (Book with mandatory confirmation)
appointmentRoutes.post('/v1/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = BookAppointmentSchema.parse(req.body);
    const actorId = req.user?.telegramId || (req.headers['x-telegram-user-id'] as string) || 'ANONYMOUS';
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    const result = await AppointmentService.bookAppointment(
      {
        ...body,
        idempotencyKey
      },
      actorId,
      req.requestId
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/appointments/verify (Patient verification)
appointmentRoutes.post('/v1/appointments/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = VerifyAppointmentSchema.parse(req.body);
    const trackingKey = (req.headers['x-telegram-user-id'] as string) || req.ip || 'ANON_IP';

    const result = await AppointmentService.verifyPatient(trackingKey, body.bookingCode, body.phone || body.name);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/appointments/:id/cancel
appointmentRoutes.post('/v1/appointments/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CancelAppointmentSchema.parse(req.body);
    const actorId = req.user?.telegramId || 'UNKNOWN';

    const result = await AppointmentService.cancelAppointment(
      req.params.id,
      body.confirmation,
      actorId,
      body.reason,
      req.requestId
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/appointments/:id/reschedule
appointmentRoutes.post('/v1/appointments/:id/reschedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = RescheduleAppointmentSchema.parse(req.body);
    const actorId = req.user?.telegramId || 'UNKNOWN';

    const result = await AppointmentService.rescheduleAppointment(
      req.params.id,
      body.newStartsAt,
      body.confirmation,
      actorId,
      req.requestId
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

