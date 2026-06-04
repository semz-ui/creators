export interface CheckoutSession {
  checkoutUrl: string;
  /** Provider-side reference echoed back on the webhook. */
  providerRef: string;
}

/** External payment provider (Stripe-like). Stubbed for now. */
export interface IPaymentProvider {
  createCheckout(params: {
    paymentId: string;
    userId: string;
    credits: number;
  }): Promise<CheckoutSession>;
}
