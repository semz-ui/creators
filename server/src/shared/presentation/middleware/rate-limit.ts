import type { Request, RequestHandler } from 'express';

import { TooManyRequestsError } from '@shared/domain/errors';
import type { IRateLimiter } from '@shared/infrastructure/rate-limit/rate-limiter';
import { asyncHandler } from '@shared/presentation/http/async-handler';

export interface RateLimitOptions {
  /** Bucket name, namespacing this limiter's keys (e.g. 'global', 'auth'). */
  name: string;
  /** Derives the client identifier; defaults to the request IP. */
  keyGenerator?: (req: Request) => string;
}

/**
 * Express middleware enforcing `limiter` per client. Emits `RateLimit-*`
 * headers and, when exceeded, sets `Retry-After` and throws a
 * {@link TooManyRequestsError} (→ 429) through the global error handler.
 */
export function createRateLimit(limiter: IRateLimiter, options: RateLimitOptions): RequestHandler {
  const keyOf = options.keyGenerator ?? ((req: Request): string => req.ip ?? 'unknown');

  return asyncHandler(async (req, res, next) => {
    const result = await limiter.consume(`${options.name}:${keyOf(req)}`);

    res.setHeader('RateLimit-Limit', String(result.limit));
    res.setHeader('RateLimit-Remaining', String(result.remaining));
    res.setHeader('RateLimit-Reset', String(result.resetSeconds));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.resetSeconds));
      throw new TooManyRequestsError('Rate limit exceeded. Please try again later.');
    }

    next();
  });
}
