import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

const HEADER = 'x-scheduler-secret';

/**
 * Guards the "run due publications" endpoint: a scheduler/cron must present the
 * shared secret. Machine-to-machine auth, separate from user (Bearer) auth.
 */
export function createSchedulerGuard(secret: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.header(HEADER) !== secret) {
      throw new UnauthorizedError('Invalid scheduler secret');
    }
    next();
  };
}
