/** Everything needed to compose a password-reset email. */
export interface PasswordResetEmail {
  to: string;
  resetUrl: string;
}

/**
 * Port for sending auth-related emails. Intentionally intention-revealing
 * (per-message methods, not a generic `send`) so subject/body composition
 * stays in the infrastructure adapters.
 */
export interface IEmailSender {
  sendPasswordResetEmail(email: PasswordResetEmail): Promise<void>;
}
