import type { ICreditGuard } from '../domain/ports/credit-guard';
import type { IVideoGeneratorRegistry } from '../domain/ports/video-generator';
import type { IVideoRepository } from '../domain/ports/video-repository';
import { parseVideoProvider } from '../domain/provider';
import { ProviderUnavailableError } from '../domain/video.errors';
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
 *
 * The chosen provider is validated *before* any credits are authorized, so
 * naming an unknown or unconfigured generator is a plain 422 that never costs
 * the user anything and leaves no refund to reconcile.
 */
export class CreateVideo {
  constructor(
    private readonly videos: IVideoRepository,
    private readonly generators: IVideoGeneratorRegistry,
    private readonly credits: ICreditGuard,
  ) {}

  async execute(ownerId: string, input: CreateVideoInput): Promise<PublicVideo> {
    const prompt = Prompt.create(input.prompt);
    const duration = Duration.create(input.durationSeconds);

    const provider = input.provider
      ? parseVideoProvider(input.provider)
      : this.generators.defaultProvider();
    if (!this.generators.isAvailable(provider)) {
      throw new ProviderUnavailableError(provider);
    }

    const video = Video.create({
      ownerId,
      prompt,
      duration,
      provider,
      musicTrackId: input.musicTrackId ?? null,
      narrationText: input.narrationText ?? null,
      narrationVoice: input.narrationVoice ?? null,
    });
    const creditContext = { videoId: video.id, durationSeconds: duration.seconds };

    // Charge first; throws a 402 if the balance is insufficient.
    await this.credits.authorizeGeneration(ownerId, creditContext);

    let jobRef: string;
    try {
      ({ jobRef } = await this.generators.get(provider).submit({
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
