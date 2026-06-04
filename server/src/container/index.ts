import type { RequestHandler, Router } from 'express';
import type { Redis } from 'ioredis';

import { redis } from '@shared/infrastructure/cache/redis';
import { env } from '@shared/infrastructure/config/env';
import { RedisRateLimiter } from '@shared/infrastructure/rate-limit/redis-rate-limiter';
import { createRateLimit } from '@shared/presentation/middleware/rate-limit';
import { buildAuthModule } from '@modules/auth/auth.module';
import { buildConnectionsModule } from '@modules/connections/connections.module';
import { buildVideoModule } from '@modules/video/video.module';

export interface ContainerDeps {
  /** Override the Redis client (e.g. an in-memory mock in tests). */
  redisClient?: Redis;
}

export interface Container {
  authRouter: Router;
  videoRouter: Router;
  connectionsRouter: Router;
  /** Global per-IP rate limiter, mounted across the API surface. */
  globalRateLimit: RequestHandler;
}

/**
 * Application composition root. Builds every feature module and exposes their
 * HTTP routers for `createApp` to mount. Dependencies default to the shared
 * production singletons but can be overridden for tests.
 */
export function buildContainer(deps: ContainerDeps = {}): Container {
  const redisClient = deps.redisClient ?? redis;

  const globalRateLimit = createRateLimit(
    new RedisRateLimiter(redisClient, env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW),
    { name: 'global' },
  );
  const authRateLimit = createRateLimit(
    new RedisRateLimiter(redisClient, env.RATE_LIMIT_AUTH_MAX, env.RATE_LIMIT_AUTH_WINDOW),
    { name: 'auth' },
  );

  const auth = buildAuthModule({ redisClient, authRateLimit });
  // Reuse the auth access guard to protect other modules' routes.
  const video = buildVideoModule({ authGuard: auth.authGuard });
  const connections = buildConnectionsModule({ authGuard: auth.authGuard, redisClient });

  return {
    authRouter: auth.router,
    videoRouter: video.router,
    connectionsRouter: connections.router,
    globalRateLimit,
  };
}
