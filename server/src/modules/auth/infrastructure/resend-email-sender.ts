import type { IEmailSender, PasswordResetEmail } from '../domain/ports/email-sender';

export interface ResendConfig {
  apiKey: string;
  /** Sender, e.g. `Reelo <no-reply@reelo.app>`; must be a verified domain in Resend. */
  from: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.resend.com';

/** Sends transactional email through the Resend HTTP API. */
export class ResendEmailSender implements IEmailSender {
  constructor(private readonly config: ResendConfig) {}

  async sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmail): Promise<void> {
    const res = await fetch(`${this.config.baseUrl ?? DEFAULT_BASE_URL}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [to],
        subject: 'Reset your Reelo password',
        html: [
          '<p>We received a request to reset your Reelo password.</p>',
          `<p><a href="${resetUrl}">Reset your password</a></p>`,
          '<p>The link expires shortly and can be used once. ',
          'If you did not request this, you can safely ignore this email.</p>',
        ].join(''),
        text:
          `We received a request to reset your Reelo password.\n\n${resetUrl}\n\n` +
          'The link expires shortly and can be used once. ' +
          'If you did not request this, you can safely ignore this email.',
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`Resend API error (HTTP ${res.status}): ${detail}`);
    }
  }
}
