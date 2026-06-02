import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { InvalidTokenError } from '../domain/auth.errors';
import type { ITokenService } from '../domain/ports/token-service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the auth guard once a valid access token is verified. */
      userId?: string;
    }
  }
}

/**
 * Builds an Express guard that requires a valid `Authorization: Bearer <token>`
 * access token and attaches `req.userId`. Verification failures throw an
 * {@link InvalidTokenError} (→ 401) via the global error handler.
 */
export function createAuthGuard(tokens: ITokenService): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new InvalidTokenError('Missing bearer token');
    }

    const { userId } = tokens.verifyAccessToken(header.slice('Bearer '.length));
    req.userId = userId;
    next();
  };
}
