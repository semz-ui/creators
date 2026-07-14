import type { MetricsValues } from '../domain/metrics';

import type { OverviewResult, VideoAnalyticsResult } from '../application/dto';

/**
 * Wire shapes for the analytics module: every field this API returns is
 * enumerated here, so the presentation layer — not the use-case DTO — owns
 * the contract.
 */

export function presentMetrics(metrics: MetricsValues) {
  return {
    views: metrics.views,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
  };
}

export function presentOverview(result: OverviewResult) {
  return {
    totals: presentMetrics(result.totals),
    byPlatform: result.byPlatform.map((entry) => ({
      platform: entry.platform,
      metrics: presentMetrics(entry.metrics),
    })),
    videoCount: result.videoCount,
  };
}

export function presentVideoAnalytics(result: VideoAnalyticsResult) {
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

export function presentSync(result: { synced: number }) {
  return {
    synced: result.synced,
  };
}
