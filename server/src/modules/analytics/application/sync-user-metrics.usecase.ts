import type { IConnectionTokenProvider } from '../domain/ports/connection-token-provider';
import type { IMetricsProviderRegistry } from '../domain/ports/metrics-provider';
import type { IPublishedPostsProvider } from '../domain/ports/published-posts-provider';
import type { IVideoMetricRepository } from '../domain/ports/video-metric-repository';
import { VideoMetric } from '../domain/video-metric.entity';

/**
 * Refreshes the user's stored metrics: for each published post, fetch current
 * metrics from the platform and upsert. Posts without an active connection are
 * skipped (can't query without a token). Reads aggregate the stored rows, so
 * this is the only place that touches the (slow) metrics providers.
 */
export class SyncUserMetrics {
  constructor(
    private readonly publishedPosts: IPublishedPostsProvider,
    private readonly connections: IConnectionTokenProvider,
    private readonly providers: IMetricsProviderRegistry,
    private readonly metrics: IVideoMetricRepository,
  ) {}

  async execute(userId: string): Promise<{ synced: number }> {
    const posts = await this.publishedPosts.getPublishedPosts(userId);

    let synced = 0;
    for (const post of posts) {
      const connection = await this.connections.getActiveConnection(userId, post.platform);
      if (!connection) {
        continue;
      }

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
    }

    return { synced };
  }
}
