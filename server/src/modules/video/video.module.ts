import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';

import { logger } from '@shared/infrastructure/logging/logger';

import type { ICreditGuard } from './domain/ports/credit-guard';
import type { IVideoGenerator } from './domain/ports/video-generator';
import type { IVideoRepository } from './domain/ports/video-repository';
import { ApplyGenerationResult } from './application/apply-generation-result.usecase';
import { CreateVideo } from './application/create-video.usecase';
import { GetVideo } from './application/get-video.usecase';
import { ListVideos } from './application/list-videos.usecase';
import { ReconcileGeneration } from './application/reconcile-generation.usecase';
import { KlingVideoGenerator } from './infrastructure/kling-video-generator';
import { MongoVideoRepository } from './infrastructure/mongo-video.repository';
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
  const generator = buildGenerator();
  const applyResult = new ApplyGenerationResult(videos, creditGuard);

  const controller = new VideoController({
    create: new CreateVideo(videos, generator, creditGuard),
    get: new GetVideo(videos),
    list: new ListVideos(videos),
    applyResult,
    reconcile: new ReconcileGeneration(videos, generator, applyResult),
  });

  const generationGuard = createGenerationGuard(env.GENERATION_CALLBACK_SECRET);

  return {
    router: createVideoRouter(controller, authGuard, generationGuard),
    videoRepository: videos,
  };
}

/**
 * Use the real Kling generator when both API keys are configured; otherwise
 * fall back to the stub (so the app still boots and works for demos/tests).
 */
function buildGenerator(): IVideoGenerator {
  if (env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY) {
    logger.info(`Video generation: Kling AI (${env.KLING_MODEL}, ${env.KLING_MODE})`);
    return new KlingVideoGenerator({
      accessKey: env.KLING_ACCESS_KEY,
      secretKey: env.KLING_SECRET_KEY,
      baseUrl: env.KLING_BASE_URL,
      modelName: env.KLING_MODEL,
      mode: env.KLING_MODE,
      aspectRatio: env.KLING_ASPECT_RATIO,
    });
  }
  logger.info('Video generation: stub (set KLING_ACCESS_KEY + KLING_SECRET_KEY to use Kling AI)');
  return new StubVideoGenerator();
}
