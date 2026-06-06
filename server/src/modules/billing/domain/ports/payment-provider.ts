export interface CheckoutSession {
  checkoutUrl: string;
  /** Provider-side reference echoed back on the webhook. */
  providerRef: string;
}

/** A verified webhook mapped to the action the billing module should take. */
export interface PaymentConfirmation {
  providerRef: string;
  status: 'completed' | 'failed';
}

/** External payment provider (e.g. Stripe Checkout). */
export interface IPaymentProvider {
  createCheckout(params: {
    paymentId: string;
    userId: string;
    credits: number;
  }): Promise<CheckoutSession>;

  /** Name of the request header carrying the webhook signature/secret. */
  readonly signatureHeader: string;

  /**
   * Verify and interpret an incoming webhook. Throws {@link UnauthorizedError}
   * when the signature/secret is invalid; returns `null` for a valid but
   * irrelevant event (just acknowledge it); otherwise returns the confirmation
   * to apply. Verifying against the raw bytes is why the JSON parser stashes
   * `req.rawBody`.
   */
  parseWebhook(rawBody: Buffer, signature: string): PaymentConfirmation | null;
}
