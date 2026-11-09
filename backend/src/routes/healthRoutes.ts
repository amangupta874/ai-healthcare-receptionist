import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const healthRoutes = Router();

healthRoutes.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});
