import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';

import type { IVideoRepository } from './domain/ports/video-repository';
import { ApplyGenerationResult } from './application/apply-generation-result.usecase';
import { CreateVideo } from './application/create-video.usecase';
import { GetVideo } from './application/get-video.usecase';
import { ListVideos } from './application/list-videos.usecase';
import { MongoVideoRepository } from './infrastructure/mongo-video.repository';
import { StubVideoGenerator } from './infrastructure/stub-video-generator';
import { VideoController } from './presentation/video.controller';
import { createGenerationGuard } from './presentation/generation.guard';
import { createVideoRouter } from './presentation/video.routes';

export interface VideoModuleDeps {
  /** Shared access guard from the auth module (protects user routes). */
  authGuard: RequestHandler;
}

export interface VideoModule {
  router: Router;
  /** Exposed so other modules (e.g. Publishing) can read videos via an adapter. */
  videoRepository: IVideoRepository;
}

/** Composition root for the video module. */
export function buildVideoModule({ authGuard }: VideoModuleDeps): VideoModule {
  const videos = new MongoVideoRepository();
  const generator = new StubVideoGenerator();

  const controller = new VideoController({
    create: new CreateVideo(videos, generator),
    get: new GetVideo(videos),
    list: new ListVideos(videos),
    applyResult: new ApplyGenerationResult(videos),
  });

  const generationGuard = createGenerationGuard(env.GENERATION_CALLBACK_SECRET);

  return {
    router: createVideoRouter(controller, authGuard, generationGuard),
    videoRepository: videos,
  };
}
