import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';
import type { ConnectionAccessService } from '@modules/connections/application/connection-access.service';
import type { IVideoRepository } from '@modules/video/domain/ports/video-repository';

import type { IPublicationRepository } from './domain/ports/publication-repository';
import type { ISocialPublisherRegistry } from './domain/ports/social-publisher';

import { CreatePublication } from './application/create-publication.usecase';
import { DistributionService } from './application/distribution.service';
import { GetPublication } from './application/get-publication.usecase';
import { ListPublications } from './application/list-publications.usecase';
import { RunDuePublications } from './application/run-due-publications.usecase';
import { ConnectionTokenProviderAdapter } from './infrastructure/connection-token-provider.adapter';
import { MongoPublicationRepository } from './infrastructure/mongo-publication.repository';
import { ReadyVideoLookupAdapter } from './infrastructure/ready-video-lookup.adapter';
import { buildPublisherRegistry } from './infrastructure/social-publisher-registry';
import { PublishingController } from './presentation/publishing.controller';
import { createPublishingRouter } from './presentation/publishing.routes';
import { createSchedulerGuard } from './presentation/scheduler.guard';

export interface PublishingModuleDeps {
  authGuard: RequestHandler;
  /** Cross-module dependencies, injected by the container. */
  videoRepository: IVideoRepository;
  connectionAccess: ConnectionAccessService;
}

export interface PublishingModule {
  router: Router;
  /** Exposed so other modules (e.g. Analytics) can read publications via an adapter. */
  publicationRepository: IPublicationRepository;
}

/** Composition root for the publishing module. */
export function buildPublishingModule({
  authGuard,
  videoRepository,
  connectionAccess,
}: PublishingModuleDeps): PublishingModule {
  const publications = new MongoPublicationRepository();
  const videoLookup = new ReadyVideoLookupAdapter(videoRepository);
  const connectionTokens = new ConnectionTokenProviderAdapter(connectionAccess);
  const publishers = buildPublishers();

  const distribution = new DistributionService(videoLookup, connectionTokens, publishers);

  const controller = new PublishingController({
    create: new CreatePublication(publications, videoLookup, connectionTokens, distribution),
    get: new GetPublication(publications),
    list: new ListPublications(publications),
    runDue: new RunDuePublications(publications, distribution),
  });

  const schedulerGuard = createSchedulerGuard(env.PUBLISH_SCHEDULER_SECRET);

  return {
    router: createPublishingRouter(controller, authGuard, schedulerGuard),
    publicationRepository: publications,
  };
}

/**
 * Real YouTube publisher when Google OAuth is configured (same flag as the
 * connections module, so real tokens and real uploads switch on together);
 * every other platform — and YouTube without credentials — uses the stub.
 */
function buildPublishers(): ISocialPublisherRegistry {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    logger.info('Publishing: real YouTube uploads (other platforms stubbed)');
    return buildPublisherRegistry({ youtube: { privacyStatus: env.YOUTUBE_PRIVACY_STATUS } });
  }
  logger.info(
    'Publishing: stub publishers (set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET for YouTube)',
  );
  return buildPublisherRegistry();
}
