import { randomBytes } from 'node:crypto';

import { logger } from '@shared/infrastructure/logging/logger';

import type { IEmailSender } from '../domain/ports/email-sender';
import type { IPasswordResetTokenStore } from '../domain/ports/password-reset-token-store';
import type { IUserRepository } from '../domain/ports/user-repository';
import { Email } from '../domain/value-objects/email';
import type { RequestPasswordResetInput } from './dto';

export interface PasswordResetConfig {
  /** How long an issued reset token stays valid, in seconds. */
  ttlSeconds: number;
  /** Frontend reset page the emailed link points at (token appended as ?token=). */
  resetBaseUrl: string;
}

/**
 * Issues a one-time reset token and emails the reset link. Deliberately
 * indistinguishable from the outside whether the email exists or the send
 * failed — the controller always answers with the same generic 202.
 */
export class RequestPasswordReset {
  constructor(
    private readonly users: IUserRepository,
    private readonly resetTokens: IPasswordResetTokenStore,
    private readonly emailSender: IEmailSender,
    private readonly config: PasswordResetConfig,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const email = Email.create(input.email);
    const user = await this.users.findByEmail(email);
    if (user === null) {
      return; // Silent: revealing absence would enable account enumeration.
    }

    const token = randomBytes(32).toString('base64url');
    await this.resetTokens.issue(token, user.id, this.config.ttlSeconds);

    const resetUrl = `${this.config.resetBaseUrl}?token=${token}`;
    try {
      await this.emailSender.sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (err) {
      // Swallow so a provider outage doesn't 500 only for existing accounts
      // (which would itself be an enumeration oracle).
      logger.error({ err, userId: user.id }, 'Failed to send password reset email');
    }
  }
}
