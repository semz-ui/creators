import { Router, type RequestHandler } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';
import { validateBody } from '@shared/presentation/middleware/validate';

import type { AgentController } from './agent.controller';
import { resolveActionSchema, sendMessageSchema } from './agent.validators';

/**
 * Builds the `/agent` router. Everything requires an authenticated user; the
 * routes that run a turn also sit behind a stricter rate limiter, since each
 * one can fan out into model calls, a paid generation, and a publish.
 */
export function createAgentRouter(
  controller: AgentController,
  authGuard: RequestHandler,
  agentRateLimit: RequestHandler,
): Router {
  const router = Router();

  router.use(authGuard);

  router.post(
    '/conversations',
    agentRateLimit,
    validateBody(sendMessageSchema),
    asyncHandler(controller.start),
  );
  router.post(
    '/conversations/:id/messages',
    agentRateLimit,
    validateBody(sendMessageSchema),
    asyncHandler(controller.send),
  );
  router.post(
    '/conversations/:id/actions/:toolUseId',
    agentRateLimit,
    validateBody(resolveActionSchema),
    asyncHandler(controller.resolve),
  );

  router.get('/conversations', asyncHandler(controller.list));
  router.get('/conversations/:id', asyncHandler(controller.get));
  // Not on the stricter tier: a delete is a single guarded write, not a turn.
  router.delete('/conversations/:id', asyncHandler(controller.remove));

  return router;
}
