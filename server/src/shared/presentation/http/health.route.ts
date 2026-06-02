import { Router } from 'express';

import { isMongoHealthy } from '@shared/infrastructure/database/mongo';
import { isRedisHealthy } from '@shared/infrastructure/cache/redis';

import { asyncHandler } from './async-handler';

export const healthRouter = Router();

/** Liveness — the process is up and serving. */
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/** Readiness — dependencies (Mongo + Redis) are reachable. */
healthRouter.get(
  '/health/ready',
  asyncHandler(async (_req, res) => {
    const [mongo, redisOk] = await Promise.all([
      Promise.resolve(isMongoHealthy()),
      isRedisHealthy(),
    ]);

    const ready = mongo && redisOk;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'degraded',
      dependencies: {
        mongo: mongo ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      },
    });
  }),
);
