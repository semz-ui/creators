import type {
  GenerationCreditContext,
  ICreditGuard,
} from '@modules/video/domain/ports/credit-guard';

import type { CreditService } from '../application/credit.service';

/**
 * Implements the Video module's {@link ICreditGuard} using billing's
 * {@link CreditService}. Charges a flat cost per generation (refunding the same
 * amount on failure). Cost could later vary with `durationSeconds`.
 */
export class CreditGuardAdapter implements ICreditGuard {
  constructor(
    private readonly credits: CreditService,
    private readonly costPerGeneration: number,
  ) {}

  async authorizeGeneration(userId: string, context: GenerationCreditContext): Promise<void> {
    await this.credits.debit(userId, this.costPerGeneration, 'generation', context.videoId);
  }

  async refundGeneration(userId: string, context: GenerationCreditContext): Promise<void> {
    await this.credits.credit(userId, this.costPerGeneration, 'refund', context.videoId);
  }
}
