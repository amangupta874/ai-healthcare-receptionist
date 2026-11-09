import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EscalationService } from '../services/escalationService';
import { verifyServiceAuth, resolveUser, requireRole } from '../middleware/auth';
import { Role, EscalationStatus } from '@prisma/client';

export const escalationRoutes = Router();

escalationRoutes.use(verifyServiceAuth);
escalationRoutes.use(resolveUser);

const CreateEscalationSchema = z.object({
  clinicId: z.string().uuid(),
  userId: z.string().optional(),
  patientName: z.string().optional(),
  patientPhone: z.string().optional(),
  reason: z.string().min(2),
  summary: z.string().min(5)
});

// POST /v1/escalations
escalationRoutes.post('/v1/escalations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateEscalationSchema.parse(req.body);
    const escalation = await EscalationService.createEscalation({
      ...body,
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
