import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { healthRoutes } from './routes/healthRoutes';
import { identityRoutes } from './routes/identityRoutes';
import { clinicRoutes } from './routes/clinicRoutes';
import { doctorRoutes } from './routes/doctorRoutes';
import { appointmentRoutes } from './routes/appointmentRoutes';
import { draftRoutes } from './routes/draftRoutes';
import { escalationRoutes } from './routes/escalationRoutes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './lib/errors';

export const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Request ID tracking
app.use((req, res, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// Rate limiting (bypass in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down.'
        }
      }
    })
  );
}

// Routes
app.use(healthRoutes);
app.use(identityRoutes);
app.use(clinicRoutes);
app.use(doctorRoutes);
app.use(appointmentRoutes);
app.use(draftRoutes);
app.use(escalationRoutes);

// 404 Fallback
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
});

// Central Error Handler
app.use(errorHandler);
