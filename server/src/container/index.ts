import type { Router } from 'express';
import type { Redis } from 'ioredis';

import { redis } from '@shared/infrastructure/cache/redis';
import { buildAuthModule } from '@modules/auth/auth.module';

export interface ContainerDeps {
  /** Override the Redis client (e.g. an in-memory mock in tests). */
  redisClient?: Redis;
}

export interface Container {
  authRouter: Router;
}

/**
 * Application composition root. Builds every feature module and exposes their
 * HTTP routers for `createApp` to mount. Dependencies default to the shared
 * production singletons but can be overridden for tests.
 */
export function buildContainer(deps: ContainerDeps = {}): Container {
  const redisClient = deps.redisClient ?? redis;

  const auth = buildAuthModule({ redisClient });

  return { authRouter: auth.router };
}
