import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IdentityService } from '../services/identityService';
import { verifyServiceAuth } from '../middleware/auth';

export const identityRoutes = Router();

identityRoutes.use(verifyServiceAuth);

const LinkInviteSchema = z.object({
  inviteCode: z.string().min(4).max(32),
  name: z.string().optional()
});

identityRoutes.post('/v1/identity/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const telegramId = req.headers['x-telegram-user-id'] as string;
    if (!telegramId) {
      return res.status(400).json({
        error: { code: 'MISSING_HEADER', message: 'Header x-telegram-user-id is required.' }
      });
    }

    const identity = await IdentityService.resolveIdentity(telegramId);
    res.json(identity);
  } catch (err) {
    next(err);
  }
});

identityRoutes.post('/v1/identity/link-invite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const telegramId = req.headers['x-telegram-user-id'] as string;
    if (!telegramId) {
      return res.status(400).json({
        error: { code: 'MISSING_HEADER', message: 'Header x-telegram-user-id is required.' }
      });
    }

    const body = LinkInviteSchema.parse(req.body);
    const result = await IdentityService.linkInviteCode(telegramId, body.inviteCode, body.name, req.requestId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

