import { logger } from '@shared/infrastructure/logging/logger';

import type { IEmailSender, PasswordResetEmail } from '../domain/ports/email-sender';

/**
 * No-credentials email sender: logs the reset link instead of emailing it, so
 * the full forgot-password flow works locally (copy the link from the log).
 */
export class StubEmailSender implements IEmailSender {
  async sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmail): Promise<void> {
    logger.info({ to, resetUrl }, 'Stub email sender: password reset link');
  }
}
