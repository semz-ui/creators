import type { NextFunction, Request, Response } from 'express';

import { TooManyRequestsError } from '@shared/domain/errors';
import type { IRateLimiter } from '@shared/infrastructure/rate-limit/rate-limiter';
import { createRateLimit } from '@shared/presentation/middleware/rate-limit';

const flush = () => new Promise<void>((resolve) => process.nextTick(resolve));

function makeCtx() {
  const req = { ip: '1.2.3.4' } as Request;
  const res = { setHeader: jest.fn() } as unknown as Response;
  const next = jest.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe('createRateLimit middleware', () => {
  it('sets rate headers and calls next when allowed', async () => {
    const limiter: IRateLimiter = {
      consume: jest
        .fn()
        .mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetSeconds: 60 }),
    };
    const { req, res, next } = makeCtx();

    createRateLimit(limiter, { name: 'global' })(req, res, next);
    await flush();

    expect(limiter.consume).toHaveBeenCalledWith('global:1.2.3.4');
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '5');
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '4');
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Reset', '60');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('sets Retry-After and forwards a 429 error when blocked', async () => {
    const limiter: IRateLimiter = {
      consume: jest
        .fn()
        .mockResolvedValue({ allowed: false, limit: 5, remaining: 0, resetSeconds: 30 }),
    };
    const { req, res, next } = makeCtx();

    createRateLimit(limiter, { name: 'auth' })(req, res, next);
    await flush();

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '30');
    expect(next).toHaveBeenCalledWith(expect.any(TooManyRequestsError));
  });

  it('uses a custom key generator when provided', async () => {
    const limiter: IRateLimiter = {
      consume: jest
        .fn()
        .mockResolvedValue({ allowed: true, limit: 1, remaining: 0, resetSeconds: 1 }),
    };
    const { req, res, next } = makeCtx();

    createRateLimit(limiter, { name: 'auth', keyGenerator: () => 'user-9' })(req, res, next);
    await flush();

    expect(limiter.consume).toHaveBeenCalledWith('auth:user-9');
  });
});
