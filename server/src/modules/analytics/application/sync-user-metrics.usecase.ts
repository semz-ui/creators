import { logger } from '@shared/infrastructure/logging/logger';

import type { IConnectionTokenProvider } from '../domain/ports/connection-token-provider';
import type { IMetricsProviderRegistry } from '../domain/ports/metrics-provider';
import type { IPublishedPostsProvider } from '../domain/ports/published-posts-provider';
import type { IVideoMetricRepository } from '../domain/ports/video-metric-repository';
import { VideoMetric } from '../domain/video-metric.entity';

export interface SyncResult {
  synced: number;
  /** Posts whose platform lookup failed; their stored metrics are left as-is. */
  failed: number;
}

/**
 * Refreshes the user's stored metrics: for each published post, fetch current
 * metrics from the platform and upsert. Posts without an active connection are
 * skipped (can't query without a token). Reads aggregate the stored rows, so
 * this is the only place that touches the (slow) metrics providers.
 *
 * Each post is isolated: a revoked token, a deleted post, a platform 429, or an
 * id the platform no longer accepts fails that post alone and the sweep
 * continues. Without this a single bad post would abort the refresh partway and
 * surface as a 500, leaving the user no way to sync the rest.
 */
export class SyncUserMetrics {
  constructor(
    private readonly publishedPosts: IPublishedPostsProvider,
    private readonly connections: IConnectionTokenProvider,
    private readonly providers: IMetricsProviderRegistry,
    private readonly metrics: IVideoMetricRepository,
  ) {}

  async execute(userId: string): Promise<SyncResult> {
    const posts = await this.publishedPosts.getPublishedPosts(userId);

    let synced = 0;
    let failed = 0;
    for (const post of posts) {
      const connection = await this.connections.getActiveConnection(userId, post.platform);
      if (!connection) {
        continue;
      }

      try {
        const metrics = await this.providers.get(post.platform).fetch({
          platform: post.platform,
          accessToken: connection.accessToken,
          externalPostId: post.externalPostId,
        });

        await this.metrics.upsert(
          VideoMetric.create({
            userId,
            videoId: post.videoId,
            platform: post.platform,
            externalPostId: post.externalPostId,
            metrics,
          }),
        );
        synced += 1;
      } catch (err) {
        failed += 1;
        // Platform errors can carry tokens in their message — log the identity
        // of the post and the reason, not the raw upstream payload.
        logger.warn(
          {
            userId,
            videoId: post.videoId,
            platform: post.platform,
            err: err instanceof Error ? err.message : 'unknown error',
          },
          'Metrics sync failed for post',
        );
      }
    }

    return { synced, failed };
  }
}
