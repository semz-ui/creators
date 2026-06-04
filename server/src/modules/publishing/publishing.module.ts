import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';
import type { IConnectionRepository } from '@modules/connections/domain/ports/connection-repository';
import type { IVideoRepository } from '@modules/video/domain/ports/video-repository';

import { CreatePublication } from './application/create-publication.usecase';
import { DistributionService } from './application/distribution.service';
import { GetPublication } from './application/get-publication.usecase';
import { ListPublications } from './application/list-publications.usecase';
import { RunDuePublications } from './application/run-due-publications.usecase';
import { ConnectionTokenProviderAdapter } from './infrastructure/connection-token-provider.adapter';
import { MongoPublicationRepository } from './infrastructure/mongo-publication.repository';
import { ReadyVideoLookupAdapter } from './infrastructure/ready-video-lookup.adapter';
import { buildStubPublisherRegistry } from './infrastructure/stub-social-publisher';
import { PublishingController } from './presentation/publishing.controller';
import { createPublishingRouter } from './presentation/publishing.routes';
import { createSchedulerGuard } from './presentation/scheduler.guard';

export interface PublishingModuleDeps {
  authGuard: RequestHandler;
  /** Cross-module repos, injected by the container. */
  videoRepository: IVideoRepository;
  connectionRepository: IConnectionRepository;
}

export interface PublishingModule {
  router: Router;
}

/** Composition root for the publishing module. */
export function buildPublishingModule({
  authGuard,
  videoRepository,
  connectionRepository,
}: PublishingModuleDeps): PublishingModule {
  const publications = new MongoPublicationRepository();
  const videoLookup = new ReadyVideoLookupAdapter(videoRepository);
  const connectionTokens = new ConnectionTokenProviderAdapter(connectionRepository);
  const publishers = buildStubPublisherRegistry();

  const distribution = new DistributionService(videoLookup, connectionTokens, publishers);

  const controller = new PublishingController({
    create: new CreatePublication(publications, videoLookup, connectionTokens, distribution),
    get: new GetPublication(publications),
    list: new ListPublications(publications),
    runDue: new RunDuePublications(publications, distribution),
  });

  const schedulerGuard = createSchedulerGuard(env.PUBLISH_SCHEDULER_SECRET);

  return { router: createPublishingRouter(controller, authGuard, schedulerGuard) };
}
