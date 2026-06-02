import { Redis } from 'ioredis';

import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';

/**
 * Shared Redis connection (ioredis). Used for caching, refresh-token sessions,
 * and the rate limiter. `lazyConnect` defers the socket until connectRedis()
 * so connection failures surface during boot rather than on first command.
 */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('close', () => logger.warn('Redis connection closed'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis connection closed');
}

/** PING round-trip for the health check. */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    return (await redis.ping()) === 'PONG';
  } catch {
    return false;
  }
}
