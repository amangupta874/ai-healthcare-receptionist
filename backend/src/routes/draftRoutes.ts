import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { KnowledgeService } from '../services/knowledgeService';
import { verifyServiceAuth, resolveUser, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import { AppError } from '../lib/errors';

export const draftRoutes = Router();

draftRoutes.use(verifyServiceAuth);
draftRoutes.use(resolveUser);

const CreateDraftSchema = z.object({
  clinicId: z.string().uuid(),
  fileName: z.string().min(1),
  extractedJson: z.record(z.any()),
  issuesJson: z.record(z.any()).optional()
});

const ApproveDraftSchema = z.object({
  approve: z.literal(true)
});

// POST /v1/drafts
draftRoutes.post('/v1/drafts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateDraftSchema.parse(req.body);
    const actorId = req.user?.telegramId || 'UNKNOWN';

    const draft = await KnowledgeService.createDraft(
      body.clinicId,
      actorId,
      body.fileName,
      body.extractedJson,
      body.issuesJson,
      req.requestId
    );

    res.status(201).json(draft);
  } catch (err) {
    next(err);
  }
});

// GET /v1/drafts/:id
draftRoutes.get('/v1/drafts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draft = await KnowledgeService.getDraft(req.params.id);
    res.json(draft);
  } catch (err) {
    next(err);
  }
});

// POST /v1/drafts/:id/approve (Manager only)
draftRoutes.post(
  '/v1/drafts/:id/approve',
  requireRole(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = ApproveDraftSchema.parse(req.body);
      if (!body.approve) {
        throw new AppError('Explicit approval flag approve: true is required.', 400, 'APPROVAL_FLAG_REQUIRED');
      }

      const actorId = req.user?.telegramId || 'UNKNOWN';
      const result = await KnowledgeService.approveDraft(req.params.id, actorId, req.requestId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /v1/drafts/:id/reject (Manager only)
draftRoutes.post(
  '/v1/drafts/:id/reject',
  requireRole(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user?.telegramId || 'UNKNOWN';
      const result = await KnowledgeService.rejectDraft(req.params.id, actorId, req.requestId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

