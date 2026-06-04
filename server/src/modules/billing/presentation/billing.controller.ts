import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

import type { ConfirmPayment } from '../application/confirm-payment.usecase';
import type { GetBalance } from '../application/get-balance.usecase';
import type { ListLedger } from '../application/list-ledger.usecase';
import type { StartTopUp } from '../application/start-topup.usecase';
import { ledgerQuerySchema } from './billing.validators';

export interface BillingUseCases {
  getBalance: GetBalance;
  listLedger: ListLedger;
  startTopUp: StartTopUp;
  confirmPayment: ConfirmPayment;
}

/** HTTP adapter for the billing module. */
export class BillingController {
  constructor(private readonly useCases: BillingUseCases) {}

  balance = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.getBalance.execute(this.requireUserId(req));
    res.status(200).json(result);
  };

  ledger = async (req: Request, res: Response): Promise<void> => {
    const query = ledgerQuerySchema.parse(req.query);
    const page = await this.useCases.listLedger.execute(this.requireUserId(req), query);
    res.status(200).json(page);
  };

  topUp = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.startTopUp.execute(
      this.requireUserId(req),
      req.body.credits,
    );
    res.status(201).json(result);
  };

  paymentWebhook = async (req: Request, res: Response): Promise<void> => {
    await this.useCases.confirmPayment.execute(req.body);
    res.status(204).send();
  };

  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
