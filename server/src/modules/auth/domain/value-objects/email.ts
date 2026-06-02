import { InvalidEmailError } from '../auth.errors';

// Pragmatic email check — not RFC-exhaustive, but rejects obvious garbage.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email value object. Normalizes (trim + lowercase) and validates on creation,
 * so a constructed Email is always well-formed and comparison-safe.
 */
export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new InvalidEmailError();
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
