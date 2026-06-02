import { Router, type RequestHandler } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';
import { validateBody } from '@shared/presentation/middleware/validate';

import type { AuthController } from './auth.controller';
import { loginSchema, refreshSchema, registerSchema } from './auth.validators';

/** Builds the `/auth` router. `authGuard` protects session-scoped routes. */
export function createAuthRouter(controller: AuthController, authGuard: RequestHandler): Router {
  const router = Router();

  router.post('/register', validateBody(registerSchema), asyncHandler(controller.register));
  router.post('/login', validateBody(loginSchema), asyncHandler(controller.login));
  router.post('/refresh', validateBody(refreshSchema), asyncHandler(controller.refresh));
  router.post('/logout', validateBody(refreshSchema), asyncHandler(controller.logout));

  router.post('/logout-all', authGuard, asyncHandler(controller.logoutAll));
  router.get('/me', authGuard, asyncHandler(controller.me));

  return router;
}
