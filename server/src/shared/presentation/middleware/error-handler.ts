import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@shared/domain/errors';
import { isProduction } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

/** 404 fallback for unmatched routes. Registered after all routers. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      requestId: String(req.id),
    },
  } satisfies ErrorBody);
}

/**
 * Global error handler. Translates known error types into a consistent JSON
 * envelope and logs unexpected errors. Must be the LAST middleware registered.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = String(req.id);

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        requestId,
        details: err.issues,
      },
    } satisfies ErrorBody);
    return;
  }

  if (err instanceof AppError) {
    const body: ErrorBody = {
      success: false,
      error: { code: err.code, message: err.message, requestId },
    };
    if ('details' in err && err.details !== undefined) {
      body.error.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // Unexpected — log the full error, but never leak internals to the client.
  logger.error({ err, requestId }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Something went wrong' : String(err),
      requestId,
    },
  } satisfies ErrorBody);
}
