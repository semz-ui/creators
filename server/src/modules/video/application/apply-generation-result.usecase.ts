import type { ICreditGuard } from '../domain/ports/credit-guard';
import type { IVideoRepository } from '../domain/ports/video-repository';
import type { GenerationResultInput } from './dto';

/**
 * Applies a generation result delivered by the provider callback.
 *
 * Idempotent and safe against unknown jobs: an unrecognized `jobRef` or a video
 * already in a terminal state is a no-op, so provider retries don't error or
 * corrupt state. On failure the credits are refunded *before* the video is
 * persisted as failed: the refund is idempotent, so if persisting the terminal
 * state fails the next retry refunds again (a no-op) and then persists — the
 * refund can never be silently dropped.
 */
export class ApplyGenerationResult {
  constructor(
    private readonly videos: IVideoRepository,
    private readonly credits: ICreditGuard,
  ) {}

  async execute(input: GenerationResultInput): Promise<void> {
    const video = await this.videos.findByJobRef(input.jobRef);
    if (!video || video.isTerminal()) {
      return;
    }

    if (input.status === 'ready') {
      video.markReady(input.resultUrl ?? '');
      await this.videos.save(video);
      return;
    }

    await this.credits.refundGeneration(video.ownerId, {
      videoId: video.id,
      durationSeconds: video.durationSeconds,
    });
    video.markFailed(input.error ?? 'Generation failed');
    await this.videos.save(video);
  }
}
