import { Router, type RequestHandler } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';
import { validateBody } from '@shared/presentation/middleware/validate';

import type { BillingController } from './billing.controller';
import { paymentWebhookSchema, topUpSchema } from './billing.validators';

/**
 * Builds the `/billing` router. The payment webhook is for the provider (secret
 * guard); the rest require a user Bearer token.
 */
export function createBillingRouter(
  controller: BillingController,
  authGuard: RequestHandler,
  paymentWebhookGuard: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/webhooks/payment',
    paymentWebhookGuard,
    validateBody(paymentWebhookSchema),
    asyncHandler(controller.paymentWebhook),
  );

  router.use(authGuard);
  router.get('/balance', asyncHandler(controller.balance));
  router.get('/ledger', asyncHandler(controller.ledger));
  router.post('/topup', validateBody(topUpSchema), asyncHandler(controller.topUp));

  return router;
}
