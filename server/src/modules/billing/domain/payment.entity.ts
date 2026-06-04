import { randomUUID } from 'node:crypto';

import { CreditAmount } from './credit-amount';
import { InvalidPaymentStateError } from './billing.errors';

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface PaymentSnapshot {
  id: string;
  userId: string;
  credits: number;
  status: PaymentStatus;
  providerRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A credit top-up purchase, tracked so the provider webhook can credit once. */
export class Payment {
  readonly id: string;
  readonly userId: string;
  readonly credits: number;
  readonly createdAt: Date;

  private _status: PaymentStatus;
  private _providerRef: string | null;
  private _updatedAt: Date;

  private constructor(s: PaymentSnapshot) {
    this.id = s.id;
    this.userId = s.userId;
    this.credits = s.credits;
    this.createdAt = s.createdAt;
    this._status = s.status;
    this._providerRef = s.providerRef;
    this._updatedAt = s.updatedAt;
  }

  static create(params: { userId: string; credits: number }): Payment {
    const now = new Date();
    const credits = CreditAmount.create(params.credits).value;
    return new Payment({
      id: randomUUID(),
      userId: params.userId,
      credits,
      status: 'pending',
      providerRef: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromSnapshot(snapshot: PaymentSnapshot): Payment {
    return new Payment(snapshot);
  }

  get status(): PaymentStatus {
    return this._status;
  }
  get providerRef(): string | null {
    return this._providerRef;
  }

  /** Attach the provider's checkout reference. Set once — rewrites are rejected. */
  attachProviderRef(ref: string): void {
    if (this._providerRef !== null) {
      throw new InvalidPaymentStateError('Provider ref is already set');
    }
    this._providerRef = ref;
    this.touch();
  }

  markCompleted(): void {
    this.assertPending('complete');
    this._status = 'completed';
    this.touch();
  }

  markFailed(): void {
    this.assertPending('fail');
    this._status = 'failed';
    this.touch();
  }

  /** A payment may only move out of `pending`; terminal states are final. */
  private assertPending(action: string): void {
    if (this._status !== 'pending') {
      throw new InvalidPaymentStateError(
        `Cannot ${action} a payment that is already ${this._status}`,
      );
    }
  }

  isCompleted(): boolean {
    return this._status === 'completed';
  }

  toSnapshot(): PaymentSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      credits: this.credits,
      status: this._status,
      providerRef: this._providerRef,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
