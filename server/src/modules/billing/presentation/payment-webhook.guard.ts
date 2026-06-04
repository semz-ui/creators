import { timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

const HEADER = 'x-payment-secret';

/**
 * Guards the payment webhook: the provider must present the shared secret.
 * Machine-to-machine auth, separate from user (Bearer) auth. The comparison is
 * constant-time so the secret can't be recovered by timing the response.
 */
export function createPaymentWebhookGuard(secret: string): RequestHandler {
  const expected = Buffer.from(secret, 'utf8');
  return (req: Request, _res: Response, next: NextFunction): void => {
    const provided = Buffer.from(req.header(HEADER) ?? '', 'utf8');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedError('Invalid payment webhook secret');
    }
    next();
  };
}
