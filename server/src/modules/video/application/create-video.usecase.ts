import type { ICreditGuard } from '../domain/ports/credit-guard';
import type { IVideoGenerator } from '../domain/ports/video-generator';
import type { IVideoRepository } from '../domain/ports/video-repository';
import { Video } from '../domain/video.entity';
import { Duration } from '../domain/value-objects/duration';
import { Prompt } from '../domain/value-objects/prompt';
import { toPublicVideo, type CreateVideoInput, type PublicVideo } from './dto';

/**
 * Creates a video and submits it for generation. Credits are charged up front
 * (402 if the user can't afford it); if the generator submission then fails, the
 * charge is refunded and the video is not persisted (no orphan). The generator
 * runs asynchronously, so the returned video is `processing`; the result arrives
 * later via {@link ApplyGenerationResult}.
 */
export class CreateVideo {
  constructor(
    private readonly videos: IVideoRepository,
    private readonly generator: IVideoGenerator,
    private readonly credits: ICreditGuard,
  ) {}

  async execute(ownerId: string, input: CreateVideoInput): Promise<PublicVideo> {
    const prompt = Prompt.create(input.prompt);
    const duration = Duration.create(input.durationSeconds);

    const video = Video.create({
      ownerId,
      prompt,
      duration,
      musicTrackId: input.musicTrackId ?? null,
      narrationText: input.narrationText ?? null,
      narrationVoice: input.narrationVoice ?? null,
    });
    const creditContext = { videoId: video.id, durationSeconds: duration.seconds };

    // Charge first; throws a 402 if the balance is insufficient.
    await this.credits.authorizeGeneration(ownerId, creditContext);

    let jobRef: string;
    try {
      ({ jobRef } = await this.generator.submit({
        videoId: video.id,
        prompt: prompt.value,
        durationSeconds: duration.seconds,
      }));
    } catch (err) {
      // Generator never accepted the job — give the credits back.
      await this.credits.refundGeneration(ownerId, creditContext);
      throw err;
    }
    video.markProcessing(jobRef);

    await this.videos.save(video);
    return toPublicVideo(video);
  }
}
