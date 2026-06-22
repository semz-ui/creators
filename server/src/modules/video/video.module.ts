import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';

import { logger } from '@shared/infrastructure/logging/logger';

import type { ICreditGuard } from './domain/ports/credit-guard';
import type { IAudioCompositor } from './domain/ports/audio-compositor';
import type { IVideoGenerator } from './domain/ports/video-generator';
import type { IVideoRepository } from './domain/ports/video-repository';
import type { IVideoStorage } from './domain/ports/video-storage';
import { ApplyGenerationResult } from './application/apply-generation-result.usecase';
import { CreateVideo } from './application/create-video.usecase';
import { GetVideo } from './application/get-video.usecase';
import { ListVideos } from './application/list-videos.usecase';
import { ReconcileGeneration } from './application/reconcile-generation.usecase';
import { UploadVideo } from './application/upload-video.usecase';
import { CloudinaryAudioCompositor } from './infrastructure/cloudinary-audio-compositor';
import { CloudinaryVideoStorage } from './infrastructure/cloudinary-video-storage';
import { KlingVideoGenerator } from './infrastructure/kling-video-generator';
import { MongoVideoRepository } from './infrastructure/mongo-video.repository';
import { OpenAiSpeechSynthesizer } from './infrastructure/openai-speech-synthesizer';
import { SoraVideoGenerator } from './infrastructure/sora-video-generator';
import { StubVideoGenerator } from './infrastructure/stub-video-generator';
import { VideoController } from './presentation/video.controller';
import { createGenerationGuard } from './presentation/generation.guard';
import { createVideoRouter } from './presentation/video.routes';

export interface VideoModuleDeps {
  /** Shared access guard from the auth module (protects user routes). */
  authGuard: RequestHandler;
  /** Charges/refunds generation credits (Billing module via the container). */
  creditGuard: ICreditGuard;
}

export interface VideoModule {
  router: Router;
  /** Exposed so other modules (e.g. Publishing) can read videos via an adapter. */
  videoRepository: IVideoRepository;
}

/** Composition root for the video module. */
export function buildVideoModule({ authGuard, creditGuard }: VideoModuleDeps): VideoModule {
  const videos = new MongoVideoRepository();
  const { generator, compositor, storage } = buildGeneration();
  const applyResult = new ApplyGenerationResult(videos, creditGuard);

  const upload = storage ? new UploadVideo(videos, storage) : undefined;

  const controller = new VideoController({
    create: new CreateVideo(videos, generator, creditGuard),
    upload,
    get: new GetVideo(videos),
    list: new ListVideos(videos),
    applyResult,
    reconcile: new ReconcileGeneration(videos, generator, applyResult, compositor),
  });

  const generationGuard = createGenerationGuard(env.GENERATION_CALLBACK_SECRET);

  return {
    router: createVideoRouter(controller, authGuard, generationGuard),
    videoRepository: videos,
  };
}

/**
 * Select the video generator and (for Sora) the audio compositor. An explicit
 * VIDEO_PROVIDER wins; otherwise it's auto-detected from configured credentials
 * (Sora → Kling → stub), so the app always boots and works for demos/tests.
 * Only Sora produces Cloudinary-hosted videos, so only it gets a compositor.
 * Storage is returned whenever Cloudinary is configured (needed for uploads).
 */
function buildGeneration(): {
  generator: IVideoGenerator;
  compositor?: IAudioCompositor | undefined;
  storage?: IVideoStorage | undefined;
} {
  const provider =
    env.VIDEO_PROVIDER ??
    (env.OPENAI_API_KEY && env.CLOUDINARY_URL
      ? 'sora'
      : env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY
        ? 'kling'
        : 'stub');

  if (provider === 'sora') {
    logger.info(`Video generation: Sora (${env.SORA_MODEL}, ${env.SORA_SIZE}) + audio`);
    // One storage instance configures the global Cloudinary SDK; the compositor
    // reuses that config to build delivery URLs and upload narration audio.
    const storage = new CloudinaryVideoStorage(env.CLOUDINARY_URL as string);
    const generator = new SoraVideoGenerator(
      {
        apiKey: env.OPENAI_API_KEY as string,
        model: env.SORA_MODEL,
        size: env.SORA_SIZE,
        baseUrl: env.SORA_BASE_URL,
      },
      storage,
    );
    const speech = new OpenAiSpeechSynthesizer({
      apiKey: env.OPENAI_API_KEY as string,
      model: env.TTS_MODEL,
      baseUrl: env.SORA_BASE_URL,
    });
    return { generator, storage, compositor: new CloudinaryAudioCompositor(speech, storage) };
  }

  // Cloudinary storage for uploads is available independently of the generator.
  const storage = env.CLOUDINARY_URL ? new CloudinaryVideoStorage(env.CLOUDINARY_URL) : undefined;

  if (provider === 'kling') {
    logger.info(`Video generation: Kling AI (${env.KLING_MODEL}, ${env.KLING_MODE})`);
    return {
      generator: new KlingVideoGenerator({
        accessKey: env.KLING_ACCESS_KEY as string,
        secretKey: env.KLING_SECRET_KEY as string,
        baseUrl: env.KLING_BASE_URL,
        modelName: env.KLING_MODEL,
        mode: env.KLING_MODE,
        aspectRatio: env.KLING_ASPECT_RATIO,
      }),
      storage,
    };
  }

  logger.info('Video generation: stub (set OPENAI_API_KEY + CLOUDINARY_URL to use Sora)');
  return { generator: new StubVideoGenerator(), storage };
}
