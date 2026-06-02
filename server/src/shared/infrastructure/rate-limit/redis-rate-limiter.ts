import type { Redis } from 'ioredis';

import type { IRateLimiter, RateLimitResult } from './rate-limiter';

/**
 * Fixed-window rate limiter backed by Redis, so limits hold across instances.
 *
 * Each key maps to a counter that is `INCR`ed per request; the first hit in a
 * window sets the expiry, and the window resets when the key expires. Uses only
 * INCR / PEXPIRE / PTTL — no Lua — so it is portable and easy to fake in tests.
 */
export class RedisRateLimiter implements IRateLimiter {
  private readonly durationMs: number;

  constructor(
    private readonly client: Redis,
    private readonly points: number,
    durationSeconds: number,
  ) {
    this.durationMs = durationSeconds * 1000;
  }

  async consume(key: string): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;

    const count = await this.client.incr(redisKey);
    if (count === 1) {
      await this.client.pexpire(redisKey, this.durationMs);
    }

    let ttlMs = await this.client.pttl(redisKey);
    if (ttlMs < 0) {
      // Key exists without an expiry (e.g. a crash between INCR and PEXPIRE).
      await this.client.pexpire(redisKey, this.durationMs);
      ttlMs = this.durationMs;
    }

    return {
      allowed: count <= this.points,
      limit: this.points,
      remaining: Math.max(0, this.points - count),
      resetSeconds: Math.ceil(ttlMs / 1000),
    };
  }
}
