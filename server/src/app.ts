import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { buildContainer, type Container } from '@container/index';
import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';
import { errorHandler, notFoundHandler } from '@shared/presentation/middleware/error-handler';
import { requestId } from '@shared/presentation/middleware/request-id';
import { healthRouter } from '@shared/presentation/http/health.route';

/**
 * Assembles the Express application: global middleware, feature routers, and
 * the error pipeline. Kept free of side effects (no DB/Redis connect, no
 * listen) so it can be imported directly by integration tests. Accepts a
 * pre-built container so tests can inject fakes (e.g. an in-memory Redis).
 */
export function createApp(container: Container = buildContainer()): Express {
  const app = express();

  // Security & parsing
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Observability — request id first so it is available to the logger.
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // Routes
  app.use(healthRouter);
  // Global per-IP rate limit across the API surface (health stays exempt).
  app.use('/api/v1', container.globalRateLimit);
  app.use('/api/v1/auth', container.authRouter);

  // Error pipeline — must come last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
