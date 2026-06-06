import type { ICreditGuard } from '../domain/ports/credit-guard';
import type { IVideoRepository } from '../domain/ports/video-repository';
import type { GenerationResultInput } from './dto';

/**
 * Applies a generation result delivered by the provider callback or poll-on-read.
 *
 * The terminal transition is claimed atomically (`claimTerminal` only flips a
 * still-`processing` job), so this is idempotent and concurrency-safe: an
 * unknown `jobRef`, an already-terminal video, or a lost race all return a null
 * claim and become a no-op. Crucially, only the caller that *wins* the claim
 * refunds, so two concurrent failure applies (parallel poll-on-read or duplicate
 * callbacks) can't double-credit — even on a standalone Mongo where the credit
 * movement isn't wrapped in a transaction.
 *
 * The claim (persist terminal) happens before the refund. If the refund call
 * then throws it's logged by the caller; the video stays `failed` and won't be
 * re-claimed, so a refund could be missed only if that single call fails — a far
 * narrower window than the previous double-credit risk, and a non-issue once
 * Mongo runs as a replica set (the credit movement is then transactional).
 */
export class ApplyGenerationResult {
  constructor(
    private readonly videos: IVideoRepository,
    private readonly credits: ICreditGuard,
  ) {}

  async execute(input: GenerationResultInput): Promise<void> {
    if (input.status === 'ready') {
      await this.videos.claimTerminal(input.jobRef, {
        status: 'ready',
        resultUrl: input.resultUrl ?? '',
      });
      return;
    }

    const claimed = await this.videos.claimTerminal(input.jobRef, {
      status: 'failed',
      error: input.error ?? 'Generation failed',
    });
    // Null = unknown job, already terminal, or a concurrent caller won the
    // claim — in every case the refund is (or will be) handled exactly once.
    if (!claimed) return;

    await this.credits.refundGeneration(claimed.ownerId, {
      videoId: claimed.id,
      durationSeconds: claimed.durationSeconds,
    });
  }
}
