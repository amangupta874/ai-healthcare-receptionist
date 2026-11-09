import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DoctorService } from '../services/doctorService';
import { AvailabilityService } from '../services/availabilityService';
import { verifyServiceAuth, resolveUser, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

export const doctorRoutes = Router();

doctorRoutes.use(verifyServiceAuth);
doctorRoutes.use(resolveUser);

const UpdateDoctorSchema = z.object({
  name: z.string().min(2).optional(),
  specialty: z.string().min(2).optional(),
  consultationFee: z.number().positive().optional(),
  isActive: z.boolean().optional()
});

const CreateScheduleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().positive().optional()
});

// GET /v1/doctors/:id
doctorRoutes.get('/v1/doctors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await DoctorService.getDoctorById(req.params.id);
    res.json(doctor);
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/doctors/:id (Manager only)
doctorRoutes.patch(
  '/v1/doctors/:id',
  requireRole(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = UpdateDoctorSchema.parse(req.body);
      const actorId = req.user?.telegramId || 'UNKNOWN';
      const doctor = await DoctorService.updateDoctor(req.params.id, body, actorId, req.requestId);
      res.json(doctor);
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/doctors/:id/schedules
doctorRoutes.get('/v1/doctors/:id/schedules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedules = await DoctorService.getDoctorSchedules(req.params.id);
    res.json({ schedules });
  } catch (err) {
    next(err);
  }
});

// POST /v1/doctors/:id/schedules (Manager only)
doctorRoutes.post(
  '/v1/doctors/:id/schedules',
  requireRole(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = CreateScheduleSchema.parse(req.body);
      const actorId = req.user?.telegramId || 'UNKNOWN';
      const schedule = await DoctorService.addSchedule(req.params.id, body, actorId, req.requestId);
      res.status(201).json(schedule);
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/doctors/:id/availability?date=YYYY-MM-DD
doctorRoutes.get('/v1/doctors/:id/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateStr = req.query.date as string;
    if (!dateStr) {
      return res.status(400).json({
        error: { code: 'MISSING_DATE', message: 'Query parameter ?date=YYYY-MM-DD is required.' }
      });
    }

    const availability = await AvailabilityService.getAvailableSlots(req.params.id, dateStr);
    res.json(availability);
  } catch (err) {
    next(err);
  }
});

