import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';

import type { IConnectionRepository } from '@modules/connections/domain/ports/connection-repository';
import type { IPublicationRepository } from '@modules/publishing/domain/ports/publication-repository';

import type { IMetricsProviderRegistry } from './domain/ports/metrics-provider';
import { GetOverview } from './application/get-overview.usecase';
import { GetVideoAnalytics } from './application/get-video-analytics.usecase';
import { SyncUserMetrics } from './application/sync-user-metrics.usecase';
import { ConnectionTokenProviderAdapter } from './infrastructure/connection-token-provider.adapter';
import {
  buildMetricsRegistry,
  type MetricsRegistryConfig,
} from './infrastructure/metrics-provider-registry';
import { MongoVideoMetricRepository } from './infrastructure/mongo-video-metric.repository';
import { PublishedPostsAdapter } from './infrastructure/published-posts.adapter';
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
  const providers = buildMetricsProviders();

  const controller = new AnalyticsController({
    sync: new SyncUserMetrics(publishedPosts, connectionTokens, providers, metrics),
    overview: new GetOverview(metrics),
    videoAnalytics: new GetVideoAnalytics(metrics),
  });

  return { router: createAnalyticsRouter(controller, authGuard) };
}

/**
 * Real metrics providers for every platform whose OAuth credentials are
 * configured, stubs elsewhere. Mirrors the publishing module's registry: the
 * providers read with the connection's access token, so the same credentials
 * that make a connection real make its metrics real.
 */
function buildMetricsProviders(): IMetricsProviderRegistry {
  const config: MetricsRegistryConfig = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    config.youtube = true;
  }
  if (env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET) {
    config.instagram = true;
  }
  if (env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET) {
    config.tiktok = true;
  }

  const real = [
    ...(config.youtube ? ['youtube'] : []),
    ...(config.instagram ? ['instagram'] : []),
    ...(config.tiktok ? ['tiktok'] : []),
  ];
  if (real.length > 0) {
    logger.info(`Analytics: real metrics for ${real.join(', ')} (other platforms stubbed)`);
  } else {
    logger.info(
      'Analytics: stub metrics (set GOOGLE_CLIENT_ID/SECRET for YouTube, INSTAGRAM_APP_ID/SECRET for Instagram, TIKTOK_CLIENT_KEY/SECRET for TikTok)',
    );
  }
  return buildMetricsRegistry(config);
}
