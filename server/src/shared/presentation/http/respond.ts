import type { Response } from 'express';

/** Envelope for every successful JSON response (errors use ErrorBody). */
export interface SuccessBody<T> {
  success: true;
  data: T;
}

/**
 * Send a successful JSON response in the API-wide `{ success: true, data }`
 * envelope. Controllers must use this instead of `res.json(dto)` for every
 * success body; 204 no-content responses, redirects, webhook acks, and the
 * /health probes stay outside the envelope.
 */
export function respond<T>(res: Response, status: number, data: T): void {
  res.status(status).json({ success: true, data } satisfies SuccessBody<T>);
}
