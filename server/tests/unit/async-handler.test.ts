import type { NextFunction, Request, Response } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';

const flushMicrotasks = () => new Promise<void>((resolve) => process.nextTick(resolve));

describe('asyncHandler', () => {
  const req = {} as Request;
  const res = {} as Response;

  it('forwards a rejected promise to next()', async () => {
    const next = jest.fn() as unknown as NextFunction;
    const error = new Error('boom');

    asyncHandler(async () => {
      throw error;
    })(req, res, next);
    await flushMicrotasks();

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next() when the handler resolves', async () => {
    const next = jest.fn() as unknown as NextFunction;

    asyncHandler(async () => 'ok')(req, res, next);
    await flushMicrotasks();

    expect(next).not.toHaveBeenCalled();
  });
});
