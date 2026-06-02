import { ConflictError, UnauthorizedError, ValidationError } from '@shared/domain/errors';

/** Raised when registering with an email that already exists. */
export class EmailAlreadyInUseError extends ConflictError {
  constructor() {
    super('An account with this email already exists');
  }
}

/** Raised on bad email/password at login. Deliberately vague to avoid enumeration. */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid email or password');
  }
}

/** Raised when a refresh/access token is missing, malformed, expired, or revoked. */
export class InvalidTokenError extends UnauthorizedError {
  constructor(message = 'Invalid or expired token') {
    super(message);
  }
}

/** Raised by the Email value object on a malformed address. */
export class InvalidEmailError extends ValidationError {
  constructor() {
    super('A valid email address is required');
  }
}

/** Raised by the Password value object when the policy is not met. */
export class WeakPasswordError extends ValidationError {
  constructor(reason: string) {
    super(`Password must be ${reason}`);
  }
}
