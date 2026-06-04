import { AppError, ConflictError, NotFoundError, ValidationError } from '@shared/domain/errors';

/** Raised when an account lacks the credits for an operation (HTTP 402). */
export class InsufficientCreditsError extends AppError {
  readonly statusCode = 402;
  readonly code = 'INSUFFICIENT_CREDITS';

  constructor() {
    super('Insufficient credits');
  }
}

/** Raised when a referenced payment doesn't exist. */
export class PaymentNotFoundError extends NotFoundError {
  constructor() {
    super('Payment not found');
  }
}

/** Raised for a non-positive or non-integer credit amount. */
export class InvalidAmountError extends ValidationError {
  constructor() {
    super('Amount must be a positive whole number of credits');
  }
}

/** Raised on an illegal payment state transition (e.g. re-completing, ref rewrite). */
export class InvalidPaymentStateError extends ConflictError {
  constructor(message = 'Invalid payment state transition') {
    super(message);
  }
}
