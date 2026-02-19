/**
 * Express app configuration
 */

import express, { Express } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import { env } from '../config/env-validator';
import { logger } from '../config/logger';

// Routes
import agentsRouter from './routes/agents';
import costsRouter from './routes/costs';
import healthRouter from './routes/health';
import alertsRouter from './routes/alerts';
import requestsRouter from './routes/requests';

/**
 * Create and configure Express app
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      maxAge: 86400,
    })
  );

  // Rate limiting
  app.use(rateLimit);

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug('HTTP request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
      });
    });

    next();
  });

  // API routes
  app.use('/api/agents', agentsRouter);
  app.use('/api/costs', costsRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/requests', requestsRouter);

  // Health check (unauthenticated)
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: _req.path,
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  logger.info('Express app configured', { port: env.PORT, nodeEnv: env.NODE_ENV });

  return app;
}
