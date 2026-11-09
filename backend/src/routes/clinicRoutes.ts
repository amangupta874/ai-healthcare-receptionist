import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ClinicService } from '../services/clinicService';
import { DoctorService } from '../services/doctorService';
import { KnowledgeService } from '../services/knowledgeService';
import { verifyServiceAuth, resolveUser, requireRole, requireClinicBoundary } from '../middleware/auth';
import { Role, KnowledgeType } from '@prisma/client';

export const clinicRoutes = Router();

clinicRoutes.use(verifyServiceAuth);
clinicRoutes.use(resolveUser);

const UpdateClinicSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  phone: z.string().min(5).optional(),
  workingHours: z.record(z.any()).optional()
});

const CreateDoctorSchema = z.object({
  name: z.string().min(2),
  specialty: z.string().min(2),
  consultationFee: z.number().positive()
});

// GET /v1/clinics/:clinicId/profile
clinicRoutes.get('/v1/clinics/:clinicId/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await ClinicService.getProfile(req.params.clinicId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/clinics/:clinicId/profile (Manager only, strict clinic boundary)
clinicRoutes.patch(
  '/v1/clinics/:clinicId/profile',
  requireRole(Role.MANAGER),
  requireClinicBoundary((req) => req.params.clinicId),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = UpdateClinicSchema.parse(req.body);
      const actorId = req.user?.telegramId || 'UNKNOWN';
      const updated = await ClinicService.updateProfile(req.params.clinicId, body, actorId, req.requestId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/clinics/:clinicId/doctors
clinicRoutes.get('/v1/clinics/:clinicId/doctors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const specialty = req.query.specialty as string | undefined;
    const doctors = await DoctorService.listDoctors(req.params.clinicId, specialty);
    res.json({ doctors });
  } catch (err) {
    next(err);
  }
});

// POST /v1/clinics/:clinicId/doctors (Manager only)
clinicRoutes.post(
  '/v1/clinics/:clinicId/doctors',
  requireRole(Role.MANAGER),
  requireClinicBoundary((req) => req.params.clinicId),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = CreateDoctorSchema.parse(req.body);
      const actorId = req.user?.telegramId || 'UNKNOWN';
      const doctor = await DoctorService.createDoctor(req.params.clinicId, body, actorId, req.requestId);
      res.status(201).json(doctor);
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/clinics/:clinicId/knowledge
clinicRoutes.get('/v1/clinics/:clinicId/knowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const typeParam = req.query.type as KnowledgeType | undefined;
    const items = await KnowledgeService.getApprovedKnowledge(req.params.clinicId, typeParam);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});
