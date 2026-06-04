import type { IVideoGenerator } from '../domain/ports/video-generator';
import type { IVideoRepository } from '../domain/ports/video-repository';
import { Video } from '../domain/video.entity';
import { Duration } from '../domain/value-objects/duration';
import { Prompt } from '../domain/value-objects/prompt';
import { toPublicVideo, type CreateVideoInput, type PublicVideo } from './dto';

/**
 * Creates a video and submits it for generation. The generator runs
 * asynchronously, so the returned video is `processing`; the result arrives
 * later via {@link ApplyGenerationResult}. If submission fails the video is not
 * persisted (no orphan) and the error propagates.
 *
 * Credit checks will attach here (via a port) once the Billing module exists.
 */
export class CreateVideo {
  constructor(
    private readonly videos: IVideoRepository,
    private readonly generator: IVideoGenerator,
  ) {}

  async execute(ownerId: string, input: CreateVideoInput): Promise<PublicVideo> {
    const prompt = Prompt.create(input.prompt);
    const duration = Duration.create(input.durationSeconds);

    const video = Video.create({ ownerId, prompt, duration });

    const { jobRef } = await this.generator.submit({
      videoId: video.id,
      prompt: prompt.value,
      durationSeconds: duration.seconds,
    });
    video.markProcessing(jobRef);

    await this.videos.save(video);
    return toPublicVideo(video);
  }
}
