export interface GenerationCreditContext {
  videoId: string;
  durationSeconds: number;
}

/**
 * Gate for charging credits for video generation. Implemented by the Billing
 * module and injected via the container, so Video depends only on this contract.
 * `authorizeGeneration` debits up front (throwing a 402 if the user can't
 * afford it); `refundGeneration` returns the credits if generation fails.
 */
export interface ICreditGuard {
  authorizeGeneration(userId: string, context: GenerationCreditContext): Promise<void>;
  refundGeneration(userId: string, context: GenerationCreditContext): Promise<void>;
}
