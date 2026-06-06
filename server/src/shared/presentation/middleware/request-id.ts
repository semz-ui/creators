import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      /** Raw request body bytes, captured by the JSON parser for webhook signature checks. */
      rawBody?: Buffer;
    }
  }
}

/**
 * Assigns a correlation id to each request (honouring an inbound
 * `x-request-id` if present) and echoes it back in the response header so a
 * single request can be traced across logs and clients.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.id = incoming && incoming.trim() !== '' ? incoming : uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
}
