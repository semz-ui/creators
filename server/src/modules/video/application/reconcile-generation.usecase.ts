import { logger } from '@shared/infrastructure/logging/logger';

import { DEFAULT_VOICE } from '../domain/audio';
import type { IAudioCompositor } from '../domain/ports/audio-compositor';
import type { IVideoGeneratorRegistry } from '../domain/ports/video-generator';
import type { IVideoRepository } from '../domain/ports/video-repository';
import type { ApplyGenerationResult } from './apply-generation-result.usecase';

/**
 * Poll-on-read reconciliation: when one of the owner's videos is still
 * `processing`, ask the generator for its current status and apply a terminal
 * result if the job has finished. Reuses {@link ApplyGenerationResult} so the
 * ready/failed + refund logic stays in one place.
 *
 * When the finished video has audio settings and lives in our storage (the
 * generator returns an `assetId`), the optional {@link IAudioCompositor} mixes
 * the chosen music + narration in before the video is marked ready.
 *
 * The job is polled with the generator that accepted it — the video's own
 * `provider` — never the current default, which may since have changed. Rows
 * written before providers were selectable have no provider and fall back to
 * the default, which is what the single generator used to be.
 *
 * Best-effort and side-channel: a provider/network hiccup must not break the
 * read, so any error is logged and swallowed — the next read just tries again.
 * That also covers a provider whose credentials were removed after the job
 * started: it stays `processing` instead of breaking the read.
 * No-op when the video is missing, not the owner's, not processing, or unlinked.
 */
export class ReconcileGeneration {
  constructor(
    private readonly videos: IVideoRepository,
    private readonly generators: IVideoGeneratorRegistry,
    private readonly applyResult: ApplyGenerationResult,
    private readonly compositor?: IAudioCompositor,
  ) {}

  async execute(ownerId: string, id: string): Promise<void> {
    try {
      const video = await this.videos.findById(id);
      if (!video || video.ownerId !== ownerId) return;
      if (video.status !== 'processing' || !video.jobRef) return;

      const provider = video.provider ?? this.generators.defaultProvider();
      const result = await this.generators.get(provider).poll(video.jobRef);
      if (result.state === 'processing') return;

      if (result.state === 'failed') {
        await this.applyResult.execute({
          jobRef: video.jobRef,
          status: 'failed',
          error: result.error,
        });
        return;
      }

      let resultUrl = result.resultUrl;
      const wantsAudio = Boolean(video.musicTrackId || video.narrationText);
      if (this.compositor && result.assetId && wantsAudio) {
        resultUrl = await this.compositor.compose({
          baseAssetId: result.assetId,
          musicTrackId: video.musicTrackId,
          narration: video.narrationText
            ? { text: video.narrationText, voice: video.narrationVoice ?? DEFAULT_VOICE }
            : null,
        });
      }

      await this.applyResult.execute({ jobRef: video.jobRef, status: 'ready', resultUrl });
    } catch (err) {
      logger.warn(
        { err, videoId: id },
        'Generation reconciliation failed (will retry on next read)',
      );
    }
  }
}
