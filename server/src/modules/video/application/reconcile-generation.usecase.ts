import { logger } from '@shared/infrastructure/logging/logger';

import type { IVideoGenerator } from '../domain/ports/video-generator';
import type { IVideoRepository } from '../domain/ports/video-repository';
import type { ApplyGenerationResult } from './apply-generation-result.usecase';

/**
 * Poll-on-read reconciliation: when one of the owner's videos is still
 * `processing`, ask the generator for its current status and apply a terminal
 * result if the job has finished. Reuses {@link ApplyGenerationResult} so the
 * ready/failed + refund logic stays in one place.
 *
 * Best-effort and side-channel: a provider/network hiccup must not break the
 * read, so any error is logged and swallowed — the next read just tries again.
 * No-op when the video is missing, not the owner's, not processing, or unlinked.
 */
export class ReconcileGeneration {
  constructor(
    private readonly videos: IVideoRepository,
    private readonly generator: IVideoGenerator,
    private readonly applyResult: ApplyGenerationResult,
  ) {}

  async execute(ownerId: string, id: string): Promise<void> {
    try {
      const video = await this.videos.findById(id);
      if (!video || video.ownerId !== ownerId) return;
      if (video.status !== 'processing' || !video.jobRef) return;

      const result = await this.generator.poll(video.jobRef);
      if (result.state === 'processing') return;

      await this.applyResult.execute(
        result.state === 'ready'
          ? { jobRef: video.jobRef, status: 'ready', resultUrl: result.resultUrl }
          : { jobRef: video.jobRef, status: 'failed', error: result.error },
      );
    } catch (err) {
      logger.warn(
        { err, videoId: id },
        'Generation reconciliation failed (will retry on next read)',
      );
    }
  }
}
