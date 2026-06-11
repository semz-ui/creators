import type { Platform } from '@/modules/connections/data/connections.types';

export interface Metrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface PlatformBreakdown {
  platform: Platform;
  metrics: Metrics;
}

export interface Overview {
  totals: Metrics;
  byPlatform: PlatformBreakdown[];
  videoCount: number;
}

export interface VideoPlatformMetrics {
  platform: Platform;
  externalPostId: string;
  metrics: Metrics;
  syncedAt: string;
}

export interface VideoAnalytics {
  videoId: string;
  totals: Metrics;
  byPlatform: VideoPlatformMetrics[];
}

export interface RefreshResult {
  synced: number;
}
