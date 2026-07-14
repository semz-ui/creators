import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';
import { respond } from '@shared/presentation/http/respond';

import type { ConfirmPayment } from '../application/confirm-payment.usecase';
import type { GetBalance } from '../application/get-balance.usecase';
import type { ListLedger } from '../application/list-ledger.usecase';
import type { StartTopUp } from '../application/start-topup.usecase';
import type { IPaymentProvider } from '../domain/ports/payment-provider';
import { ledgerQuerySchema } from './billing.validators';

export interface BillingUseCases {
  getBalance: GetBalance;
  listLedger: ListLedger;
  startTopUp: StartTopUp;
  confirmPayment: ConfirmPayment;
  /** Verifies + interprets incoming payment webhooks (provider-specific). */
  provider: IPaymentProvider;
}

/** HTTP adapter for the billing module. */
export class BillingController {
  constructor(private readonly useCases: BillingUseCases) {}

  balance = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.getBalance.execute(this.requireUserId(req));
    respond(res, 200, result);
  };

  ledger = async (req: Request, res: Response): Promise<void> => {
    const query = ledgerQuerySchema.parse(req.query);
    const page = await this.useCases.listLedger.execute(this.requireUserId(req), query);
    respond(res, 200, page);
  };

  topUp = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.startTopUp.execute(
      this.requireUserId(req),
      req.body.credits,
    );
    respond(res, 201, result);
  };

  paymentWebhook = async (req: Request, res: Response): Promise<void> => {
    const { provider, confirmPayment } = this.useCases;
    const signature = req.header(provider.signatureHeader) ?? '';
    const confirmation = provider.parseWebhook(req.rawBody ?? Buffer.alloc(0), signature);
    // A valid but irrelevant event is acknowledged so the provider stops retrying.
    if (!confirmation) {
      res.status(200).end();
      return;
    }
    await confirmPayment.execute(confirmation);
    res.status(204).send();
  };

  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
