import { InvalidAmountError } from './billing.errors';

/** A positive, whole number of credits. */
export class CreditAmount {
  private constructor(public readonly value: number) {}

  static create(raw: number): CreditAmount {
    if (!Number.isInteger(raw) || raw <= 0) {
      throw new InvalidAmountError();
    }
    return new CreditAmount(raw);
  }
}
