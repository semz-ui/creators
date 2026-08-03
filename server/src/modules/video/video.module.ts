import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';

import { logger } from '@shared/infrastructure/logging/logger';

import type { ICreditGuard } from './domain/ports/credit-guard';
import type { IAudioCompositor } from './domain/ports/audio-compositor';
import type { IVideoGenerator, IVideoGeneratorRegistry } from './domain/ports/video-generator';
import type { IVideoRepository } from './domain/ports/video-repository';
import type { IVideoStorage } from './domain/ports/video-storage';
import { SELECTABLE_PROVIDERS, type VideoProvider } from './domain/provider';
import { ApplyGenerationResult } from './application/apply-generation-result.usecase';
import { CreateVideo } from './application/create-video.usecase';
import { GetVideo } from './application/get-video.usecase';
import { ListVideoProviders } from './application/list-video-providers.usecase';
import { ListVideos } from './application/list-videos.usecase';
import { ReconcileGeneration } from './application/reconcile-generation.usecase';
import { UploadVideo } from './application/upload-video.usecase';
import { CloudinaryAudioCompositor } from './infrastructure/cloudinary-audio-compositor';
import { CloudinaryVideoStorage } from './infrastructure/cloudinary-video-storage';
import { KlingVideoGenerator } from './infrastructure/kling-video-generator';
import { MongoVideoRepository } from './infrastructure/mongo-video.repository';
import { OpenAiSpeechSynthesizer } from './infrastructure/openai-speech-synthesizer';
import { PikaVideoGenerator } from './infrastructure/pika-video-generator';
import { SoraVideoGenerator } from './infrastructure/sora-video-generator';
import { StubVideoGenerator } from './infrastructure/stub-video-generator';
import { buildGeneratorRegistry } from './infrastructure/video-generator-registry';
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
  const { registry, compositor, storage } = buildGenerators();
  const applyResult = new ApplyGenerationResult(videos, creditGuard);

  const upload = storage ? new UploadVideo(videos, storage) : undefined;

  const controller = new VideoController({
    create: new CreateVideo(videos, registry, creditGuard),
    upload,
    get: new GetVideo(videos),
    list: new ListVideos(videos),
    applyResult,
    reconcile: new ReconcileGeneration(videos, registry, applyResult, compositor),
    providers: new ListVideoProviders(registry),
  });

  const generationGuard = createGenerationGuard(env.GENERATION_CALLBACK_SECRET);

  return {
    router: createVideoRouter(controller, authGuard, generationGuard),
    videoRepository: videos,
  };
}

/**
 * Build every generator whose credentials are configured, and pick the default.
 *
 * Users choose a provider per video, so this registers all of them rather than
 * selecting one: a provider absent from the map is what the API reports as
 * unavailable. VIDEO_PROVIDER now names the *default* (used when a request
 * doesn't specify one) — with one exception, `VIDEO_PROVIDER=stub`, which stays
 * a hard kill switch that registers nothing else, so a developer or the test
 * suite can guarantee no real API is ever called.
 *
 * Only Sora lands its output in our storage, so only it gets a compositor.
 * Storage is returned whenever Cloudinary is configured (needed for uploads).
 */
function buildGenerators(): {
  registry: IVideoGeneratorRegistry;
  compositor?: IAudioCompositor | undefined;
  storage?: IVideoStorage | undefined;
} {
  // Cloudinary storage for uploads is available independently of the generator.
  const storage = env.CLOUDINARY_URL ? new CloudinaryVideoStorage(env.CLOUDINARY_URL) : undefined;

  const generators = new Map<VideoProvider, IVideoGenerator>([['stub', new StubVideoGenerator()]]);

  if (env.VIDEO_PROVIDER === 'stub') {
    logger.info('Video generation: stub only (VIDEO_PROVIDER=stub pins it; no real API is called)');
    return {
      registry: buildGeneratorRegistry({ generators, defaultProvider: 'stub' }),
      storage,
    };
  }

  let compositor: IAudioCompositor | undefined;
  if (env.OPENAI_API_KEY && storage) {
    generators.set(
      'sora',
      new SoraVideoGenerator(
        {
          apiKey: env.OPENAI_API_KEY,
          model: env.SORA_MODEL,
          size: env.SORA_SIZE,
          baseUrl: env.SORA_BASE_URL,
        },
        storage,
      ),
    );
    // The compositor reuses the storage's Cloudinary config to build delivery
    // URLs and upload narration audio.
    const speech = new OpenAiSpeechSynthesizer({
      apiKey: env.OPENAI_API_KEY,
      model: env.TTS_MODEL,
      baseUrl: env.SORA_BASE_URL,
    });
    compositor = new CloudinaryAudioCompositor(speech, storage);
  }

  if (env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY) {
    generators.set(
      'kling',
      new KlingVideoGenerator({
        accessKey: env.KLING_ACCESS_KEY,
        secretKey: env.KLING_SECRET_KEY,
        baseUrl: env.KLING_BASE_URL,
        modelName: env.KLING_MODEL,
        mode: env.KLING_MODE,
        aspectRatio: env.KLING_ASPECT_RATIO,
      }),
    );
  }

  if (env.FAL_KEY) {
    generators.set(
      'pika',
      new PikaVideoGenerator({
        apiKey: env.FAL_KEY,
        model: env.PIKA_MODEL,
        aspectRatio: env.PIKA_ASPECT_RATIO,
        resolution: env.PIKA_RESOLUTION,
      }),
    );
  }

  const defaultProvider = resolveDefaultProvider(generators);
  const real = SELECTABLE_PROVIDERS.filter((provider) => generators.has(provider));
  if (real.length > 0) {
    logger.info(`Video generation: ${real.join(', ')} available (default: ${defaultProvider})`);
  } else {
    logger.info(
      'Video generation: stub (set OPENAI_API_KEY + CLOUDINARY_URL for Sora, KLING_ACCESS_KEY/SECRET for Kling, FAL_KEY for Pika)',
    );
  }

  return { registry: buildGeneratorRegistry({ generators, defaultProvider }), compositor, storage };
}

/**
 * An explicit VIDEO_PROVIDER wins when that provider is actually configured;
 * otherwise fall back through sora → kling → pika → stub. Pika is appended last
 * so adding FAL_KEY to an existing deployment never changes its default.
 */
function resolveDefaultProvider(generators: Map<VideoProvider, IVideoGenerator>): VideoProvider {
  const explicit = env.VIDEO_PROVIDER;
  if (explicit) {
    if (generators.has(explicit)) {
      return explicit;
    }
    logger.warn(
      `VIDEO_PROVIDER is "${explicit}" but its credentials are not configured — falling back`,
    );
  }
  return SELECTABLE_PROVIDERS.find((provider) => generators.has(provider)) ?? 'stub';
}
