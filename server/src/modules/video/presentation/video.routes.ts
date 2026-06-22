import { Router, type RequestHandler } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';
import { validateBody } from '@shared/presentation/middleware/validate';

import type { VideoController } from './video.controller';
import { uploadMiddleware } from './upload.middleware';
import { createVideoSchema, generationCallbackSchema } from './video.validators';

/**
 * Builds the `/videos` router. The provider callback is mounted first, behind
 * the generation-secret guard (machine-to-machine); everything after `authGuard`
 * requires a user Bearer token.
 */
export function createVideoRouter(
  controller: VideoController,
  authGuard: RequestHandler,
  generationGuard: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/callbacks/generation',
    generationGuard,
    validateBody(generationCallbackSchema),
    asyncHandler(controller.generationCallback),
  );

  // Everything below requires an authenticated user.
  router.use(authGuard);
  router.post('/', validateBody(createVideoSchema), asyncHandler(controller.create));
  router.post('/upload', uploadMiddleware, asyncHandler(controller.upload));
  router.get('/', asyncHandler(controller.list));
  router.get('/:id', asyncHandler(controller.get));

  return router;
}
