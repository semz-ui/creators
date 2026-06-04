import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

const HEADER = 'x-generation-secret';

/**
 * Guards the generation callback: the AI provider must present the shared
 * secret in the `x-generation-secret` header. This is machine-to-machine auth,
 * separate from user (Bearer) auth.
 */
export function createGenerationGuard(secret: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.header(HEADER) !== secret) {
      throw new UnauthorizedError('Invalid generation callback secret');
    }
    next();
  };
}
