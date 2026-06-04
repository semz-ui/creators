import type { Platform } from '@modules/connections/domain/platform';

import type { MetricsValues } from '../domain/metrics';

export interface PlatformBreakdown {
  platform: Platform;
  metrics: MetricsValues;
}

export interface OverviewResult {
  totals: MetricsValues;
  byPlatform: PlatformBreakdown[];
  videoCount: number;
}

export interface VideoPlatformMetrics {
  platform: Platform;
  externalPostId: string;
  metrics: MetricsValues;
  syncedAt: Date;
}

export interface VideoAnalyticsResult {
  videoId: string;
  totals: MetricsValues;
  byPlatform: VideoPlatformMetrics[];
}
