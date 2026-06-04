import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';
import type { ICreditGuard } from '@modules/video/domain/ports/credit-guard';

import { ConfirmPayment } from './application/confirm-payment.usecase';
import { CreditService } from './application/credit.service';
import { GetBalance } from './application/get-balance.usecase';
import { ListLedger } from './application/list-ledger.usecase';
import { StartTopUp } from './application/start-topup.usecase';
import { CreditGuardAdapter } from './infrastructure/credit-guard.adapter';
import { MongoCreditAccountStore } from './infrastructure/mongo-credit-account.store';
import { MongoLedgerRepository } from './infrastructure/mongo-ledger.repository';
import { MongoPaymentRepository } from './infrastructure/mongo-payment.repository';
import { StubPaymentProvider } from './infrastructure/stub-payment-provider';
import { BillingController } from './presentation/billing.controller';
import { createBillingRouter } from './presentation/billing.routes';
import { createPaymentWebhookGuard } from './presentation/payment-webhook.guard';

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
  const provider = new StubPaymentProvider();

  const creditService = new CreditService(accounts, ledger);

  const controller = new BillingController({
    getBalance: new GetBalance(creditService),
    listLedger: new ListLedger(ledger),
    startTopUp: new StartTopUp(payments, provider),
    confirmPayment: new ConfirmPayment(payments, creditService),
  });

  const paymentWebhookGuard = createPaymentWebhookGuard(env.PAYMENT_WEBHOOK_SECRET);
  const creditGuard = new CreditGuardAdapter(creditService, env.VIDEO_CREDIT_COST);

  return {
    router: createBillingRouter(controller, authGuard, paymentWebhookGuard),
    creditGuard,
  };
}
