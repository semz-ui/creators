import { Router, type RequestHandler } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';

import type { ConnectionsController } from './connections.controller';

/**
 * Builds the `/connections` router. The OAuth callback is public (trusted via
 * the state token); everything else requires a user Bearer token.
 */
export function createConnectionsRouter(
  controller: ConnectionsController,
  authGuard: RequestHandler,
): Router {
  const router = Router();

  router.get('/callback', asyncHandler(controller.callback));

  router.use(authGuard);
  router.post('/:platform/start', asyncHandler(controller.start));
  router.get('/', asyncHandler(controller.list));
  router.delete('/:id', asyncHandler(controller.disconnect));

  return router;
}
