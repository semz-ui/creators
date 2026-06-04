import type { IVideoRepository } from '../domain/ports/video-repository';
import type { GenerationResultInput } from './dto';

/**
 * Applies a generation result delivered by the provider callback.
 *
 * Idempotent and safe against unknown jobs: an unrecognized `jobRef` or a video
 * already in a terminal state is a no-op, so provider retries don't error or
 * corrupt state.
 */
export class ApplyGenerationResult {
  constructor(private readonly videos: IVideoRepository) {}

  async execute(input: GenerationResultInput): Promise<void> {
    const video = await this.videos.findByJobRef(input.jobRef);
    if (!video || video.isTerminal()) {
      return;
    }

    if (input.status === 'ready') {
      video.markReady(input.resultUrl ?? '');
    } else {
      video.markFailed(input.error ?? 'Generation failed');
    }

    await this.videos.save(video);
  }
}
