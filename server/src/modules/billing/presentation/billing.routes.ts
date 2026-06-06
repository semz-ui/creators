import { Router, type RequestHandler } from 'express';

import { asyncHandler } from '@shared/presentation/http/async-handler';
import { validateBody } from '@shared/presentation/middleware/validate';

import type { BillingController } from './billing.controller';
import { topUpSchema } from './billing.validators';

/**
 * Builds the `/billing` router. The payment webhook is verified by the payment
 * provider (signature/secret over the raw body) inside the controller; the rest
 * require a user Bearer token.
 */
export function createBillingRouter(
  controller: BillingController,
  authGuard: RequestHandler,
): Router {
  const router = Router();

  router.post('/webhooks/payment', asyncHandler(controller.paymentWebhook));

  router.use(authGuard);
  router.get('/balance', asyncHandler(controller.balance));
  router.get('/ledger', asyncHandler(controller.ledger));
  router.post('/topup', validateBody(topUpSchema), asyncHandler(controller.topUp));

  return router;
}
