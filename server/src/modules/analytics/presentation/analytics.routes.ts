import { Router, type RequestHandler } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';

import type { AnalyticsController } from './analytics.controller';

/** Builds the `/analytics` router. All routes require a user Bearer token. */
export function createAnalyticsRouter(
  controller: AnalyticsController,
  authGuard: RequestHandler,
): Router {
  const router = Router();

  router.use(authGuard);
  router.post('/refresh', asyncHandler(controller.refresh));
  router.get('/overview', asyncHandler(controller.overview));
  router.get('/videos/:videoId', asyncHandler(controller.videoAnalytics));

  return router;
}
