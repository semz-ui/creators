import { randomUUID } from 'node:crypto';

export type LedgerType = 'credit' | 'debit';
export type LedgerReason = 'topup' | 'generation' | 'refund';

export interface LedgerEntrySnapshot {
  id: string;
  userId: string;
  type: LedgerType;
  amount: number;
  reason: LedgerReason;
  referenceId: string | null;
  balanceAfter: number;
  createdAt: Date;
}

/** Immutable record of a single balance change. The audit trail of an account. */
export class LedgerEntry {
  private constructor(private readonly props: LedgerEntrySnapshot) {}

  static record(params: {
    userId: string;
    type: LedgerType;
    amount: number;
    reason: LedgerReason;
    referenceId: string | null;
    balanceAfter: number;
  }): LedgerEntry {
    return new LedgerEntry({ id: randomUUID(), createdAt: new Date(), ...params });
  }

  static fromSnapshot(snapshot: LedgerEntrySnapshot): LedgerEntry {
    return new LedgerEntry(snapshot);
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }

  toSnapshot(): LedgerEntrySnapshot {
    return { ...this.props };
  }

  toPublic(): Omit<LedgerEntrySnapshot, 'userId'> {
    const { userId: _userId, ...rest } = this.props;
    return { ...rest };
  }
}
