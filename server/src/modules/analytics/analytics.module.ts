import type { RequestHandler, Router } from 'express';

import type { IConnectionRepository } from '@modules/connections/domain/ports/connection-repository';
import type { IPublicationRepository } from '@modules/publishing/domain/ports/publication-repository';

import { GetOverview } from './application/get-overview.usecase';
import { GetVideoAnalytics } from './application/get-video-analytics.usecase';
import { SyncUserMetrics } from './application/sync-user-metrics.usecase';
import { ConnectionTokenProviderAdapter } from './infrastructure/connection-token-provider.adapter';
import { MongoVideoMetricRepository } from './infrastructure/mongo-video-metric.repository';
import { PublishedPostsAdapter } from './infrastructure/published-posts.adapter';
import { buildStubMetricsRegistry } from './infrastructure/stub-metrics-provider';
import { AnalyticsController } from './presentation/analytics.controller';
import { createAnalyticsRouter } from './presentation/analytics.routes';

export interface AnalyticsModuleDeps {
  authGuard: RequestHandler;
  /** Cross-module repos injected by the container. */
  publicationRepository: IPublicationRepository;
  connectionRepository: IConnectionRepository;
}

export interface AnalyticsModule {
  router: Router;
}

/** Composition root for the analytics module. */
export function buildAnalyticsModule({
  authGuard,
  publicationRepository,
  connectionRepository,
}: AnalyticsModuleDeps): AnalyticsModule {
  const metrics = new MongoVideoMetricRepository();
  const publishedPosts = new PublishedPostsAdapter(publicationRepository);
  const connectionTokens = new ConnectionTokenProviderAdapter(connectionRepository);
  const providers = buildStubMetricsRegistry();

  const controller = new AnalyticsController({
    sync: new SyncUserMetrics(publishedPosts, connectionTokens, providers, metrics),
    overview: new GetOverview(metrics),
    videoAnalytics: new GetVideoAnalytics(metrics),
  });

  return { router: createAnalyticsRouter(controller, authGuard) };
}
