import { Router, type RequestHandler } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';
import { validateBody } from '@shared/presentation/middleware/validate';

import type { PublishingController } from './publishing.controller';
import { createPublicationSchema } from './publishing.validators';

/**
 * Builds the `/publications` router. `process-due` is for a scheduler (secret
 * guard); the rest require a user Bearer token.
 */
export function createPublishingRouter(
  controller: PublishingController,
  authGuard: RequestHandler,
  schedulerGuard: RequestHandler,
): Router {
  const router = Router();

  router.post('/process-due', schedulerGuard, asyncHandler(controller.processDue));

  router.use(authGuard);
  router.post('/', validateBody(createPublicationSchema), asyncHandler(controller.create));
  router.get('/', asyncHandler(controller.list));
  router.get('/:id', asyncHandler(controller.get));

  return router;
}
