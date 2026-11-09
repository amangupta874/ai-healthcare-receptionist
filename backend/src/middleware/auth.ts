import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  telegramId: string;
  role: Role;
  clinicId: string | null;
  name: string | null;
  phone: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export function verifyServiceAuth(req: Request, res: Response, next: NextFunction) {
  const serviceKey = req.headers['x-service-api-key'];
  const expectedKey = process.env.SERVICE_API_KEY;

  if (!expectedKey) {
    return next(new UnauthorizedError('Server misconfigured: SERVICE_API_KEY missing', 'AUTH_CONFIG_ERROR'));
  }

  if (!serviceKey || serviceKey !== expectedKey) {
    return next(new UnauthorizedError('Invalid or missing service API key', 'INVALID_SERVICE_KEY'));
  }

  next();
}

export async function resolveUser(req: Request, res: Response, next: NextFunction) {
  const telegramId = req.headers['x-telegram-user-id'] as string;

  if (!telegramId) {
    return next();
  }

  try {
    let user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      // Auto-create default PATIENT user for new Telegram interactions
      user = await prisma.user.create({
        data: {
          telegramId,
          role: Role.PATIENT
        }
      });
    }

    req.user = {
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
      clinicId: user.clinicId,
      name: user.name,
      phone: user.phone
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Telegram user identity required', 'IDENTITY_REQUIRED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Action requires role ${allowedRoles.join(' or ')}. Current role is ${req.user.role}`,
          'INSUFFICIENT_ROLE'
        )
      );
    }

    next();
  };
}

export function requireClinicBoundary(clinicIdExtractor: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Telegram user identity required', 'IDENTITY_REQUIRED'));
    }

    const targetClinicId = clinicIdExtractor(req);
    if (!targetClinicId) {
      return next();
    }

    // Managers and Staff can ONLY operate within their linked clinic
    if ((req.user.role === Role.MANAGER || req.user.role === Role.STAFF) && req.user.clinicId !== targetClinicId) {
      return next(
        new ForbiddenError('Access denied: You cannot access or modify records of another clinic', 'CROSS_CLINIC_DENIED')
      );
    }

    next();
  };
}
