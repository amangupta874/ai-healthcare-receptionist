import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.requestId || (req.headers['x-request-id'] as string);

  if (err instanceof AppError) {
    logger.warn(`Application error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      requestId,
      path: req.path
    });

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    logger.warn(`Validation error: ${issues}`, { requestId, path: req.path });

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Invalid request payload: ${issues}`
      }
    });
  }

  // Handle Prisma unique constraint error
  if ((err as any).code === 'P2002') {
    logger.warn('Prisma unique constraint conflict', { requestId, target: (err as any).meta?.target });
    return res.status(409).json({
      error: {
        code: 'RESOURCE_CONFLICT',
        message: 'A resource with these unique parameters already exists (e.g. appointment slot conflict).'
      }
    });
  }

  // Unexpected internal server error
  logger.error(`Internal unhandled error: ${err.message}`, {
    stack: err.stack,
    requestId,
    path: req.path
  });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again or contact clinic reception.'
    }
  });
}
