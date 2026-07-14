import type { MetricsValues } from '../domain/metrics';

import type { OverviewResult, VideoAnalyticsResult } from '../application/dto';

import type {
  MetricsResponse,
  OverviewResponse,
  SyncResponse,
  VideoAnalyticsResponse,
} from './analytics.dto';

/**
 * Maps the analytics application DTOs to the presentation DTOs sent on the
 * wire. Every field is enumerated here, so the presentation layer owns its
 * contract.
 */

export function presentMetrics(metrics: MetricsValues): MetricsResponse {
  return {
    views: metrics.views,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
  };
}

export function presentOverview(result: OverviewResult): OverviewResponse {
  return {
    totals: presentMetrics(result.totals),
    byPlatform: result.byPlatform.map((entry) => ({
      platform: entry.platform,
      metrics: presentMetrics(entry.metrics),
    })),
    videoCount: result.videoCount,
  };
}

export function presentVideoAnalytics(result: VideoAnalyticsResult): VideoAnalyticsResponse {
  return {
    videoId: result.videoId,
    totals: presentMetrics(result.totals),
    byPlatform: result.byPlatform.map((entry) => ({
      platform: entry.platform,
      externalPostId: entry.externalPostId,
      metrics: presentMetrics(entry.metrics),
      syncedAt: entry.syncedAt,
    })),
  };
}

export function presentSync(result: { synced: number }): SyncResponse {
  return {
    synced: result.synced,
  };
}
