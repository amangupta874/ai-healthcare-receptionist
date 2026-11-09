import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EscalationService } from '../services/escalationService';
import { verifyServiceAuth, resolveUser, requireRole } from '../middleware/auth';
import { Role, EscalationStatus } from '@prisma/client';
import { uuidSchema } from '../lib/validation';

export const escalationRoutes = Router();

escalationRoutes.use(verifyServiceAuth);
escalationRoutes.use(resolveUser);

const CreateEscalationSchema = z.object({
  clinicId: uuidSchema,
  userId: z.string().nullable().optional(),
  patientName: z.string().nullable().optional(),
  patientPhone: z.string().nullable().optional(),
  reason: z.string().min(2),
  summary: z.string().min(5)
});

// POST /v1/escalations
escalationRoutes.post('/v1/escalations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateEscalationSchema.parse(req.body);
    const escalation = await EscalationService.createEscalation({
      clinicId: body.clinicId,
      reason: body.reason,
      summary: body.summary,
      userId: body.userId || undefined,
      patientName: body.patientName || undefined,
      patientPhone: body.patientPhone || undefined,
      requestId: req.requestId
    });
    res.status(201).json(escalation);
  } catch (err) {
    next(err);
  }
});

// GET /v1/escalations (Manager only)
escalationRoutes.get(
  '/v1/escalations',
  requireRole(Role.MANAGER, Role.STAFF),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clinicId = (req.query.clinicId as string) || req.user?.clinicId;
      if (!clinicId) {
        return res.status(400).json({
          error: { code: 'MISSING_CLINIC_ID', message: 'Query parameter ?clinicId=UUID is required.' }
        });
      }

      const status = req.query.status as EscalationStatus | undefined;
      const list = await EscalationService.listEscalations(clinicId, status);
      res.json({ escalations: list });
    } catch (err) {
      next(err);
    }
  }
);

