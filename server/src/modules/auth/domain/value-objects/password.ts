import { WeakPasswordError } from '../auth.errors';

const MIN_LENGTH = 8;
// bcrypt only considers the first 72 bytes; reject longer to avoid silent truncation.
const MAX_LENGTH = 72;

/**
 * Raw (plaintext) password value object. Enforces the password policy at the
 * domain boundary before the value is handed to a hasher. Never persisted.
 */
export class Password {
  private constructor(public readonly value: string) {}

  static create(raw: string): Password {
    if (raw.length < MIN_LENGTH) {
      throw new WeakPasswordError(`at least ${MIN_LENGTH} characters`);
    }
    if (raw.length > MAX_LENGTH) {
      throw new WeakPasswordError(`at most ${MAX_LENGTH} characters`);
    }
    return new Password(raw);
  }
}
