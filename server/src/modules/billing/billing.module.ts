import Stripe from 'stripe';
import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';
import { MongoUnitOfWork } from '@shared/infrastructure/database/mongo-unit-of-work';
import { logger } from '@shared/infrastructure/logging/logger';
import type { ICreditGuard } from '@modules/video/domain/ports/credit-guard';

import { ConfirmPayment } from './application/confirm-payment.usecase';
import { CreditService } from './application/credit.service';
import { GetBalance } from './application/get-balance.usecase';
import { ListLedger } from './application/list-ledger.usecase';
import { StartTopUp } from './application/start-topup.usecase';
import type { IPaymentProvider } from './domain/ports/payment-provider';
import { CreditGuardAdapter } from './infrastructure/credit-guard.adapter';
import { MongoCreditAccountStore } from './infrastructure/mongo-credit-account.store';
import { MongoLedgerRepository } from './infrastructure/mongo-ledger.repository';
import { MongoPaymentRepository } from './infrastructure/mongo-payment.repository';
import { StripePaymentProvider } from './infrastructure/stripe-payment-provider';
import { StubPaymentProvider } from './infrastructure/stub-payment-provider';
import { BillingController } from './presentation/billing.controller';
import { createBillingRouter } from './presentation/billing.routes';

export interface BillingModuleDeps {
  authGuard: RequestHandler;
}

export interface BillingModule {
  router: Router;
  /** Implements the Video module's credit gate (injected into buildVideoModule). */
  creditGuard: ICreditGuard;
}

/** Composition root for the billing module. */
export function buildBillingModule({ authGuard }: BillingModuleDeps): BillingModule {
  const accounts = new MongoCreditAccountStore(env.INITIAL_FREE_CREDITS);
  const ledger = new MongoLedgerRepository();
  const payments = new MongoPaymentRepository();
  const provider = buildPaymentProvider();
  const uow = new MongoUnitOfWork();

  const creditService = new CreditService(accounts, ledger, uow);

  const controller = new BillingController({
    getBalance: new GetBalance(creditService),
    listLedger: new ListLedger(ledger),
    startTopUp: new StartTopUp(payments, provider),
    confirmPayment: new ConfirmPayment(payments, creditService, uow),
    provider,
  });

  const creditGuard = new CreditGuardAdapter(creditService, env.VIDEO_CREDIT_COST);

  return {
    router: createBillingRouter(controller, authGuard),
    creditGuard,
  };
}

/**
 * Use Stripe when its secret key is configured (the schema guarantees the
 * webhook secret is set too); otherwise fall back to the stub so the app still
 * boots and works for local dev / tests.
 */
function buildPaymentProvider(): IPaymentProvider {
  if (env.STRIPE_SECRET_KEY) {
    logger.info('Payments: Stripe Checkout');
    return new StripePaymentProvider(new Stripe(env.STRIPE_SECRET_KEY), {
      successUrl: env.STRIPE_SUCCESS_URL,
      cancelUrl: env.STRIPE_CANCEL_URL,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET as string,
    });
  }
  logger.info('Payments: stub (set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET to use Stripe)');
  return new StubPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
}
