import type { Platform } from '@modules/connections/domain/platform';

/**
 * Presentation-layer DTOs for the analytics module: the exact JSON shapes this
 * API puts on the wire. Owned by the presentation layer and deliberately
 * separate from the application DTOs (`application/dto.ts`) — the presenter
 * maps one to the other so neither layer's contract drifts into the other.
 */

export interface MetricsResponse {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface PlatformBreakdownResponse {
  platform: Platform;
  metrics: MetricsResponse;
}

export interface OverviewResponse {
  totals: MetricsResponse;
  byPlatform: PlatformBreakdownResponse[];
  videoCount: number;
}

export interface VideoPlatformMetricsResponse {
  platform: Platform;
  externalPostId: string;
  metrics: MetricsResponse;
  syncedAt: Date;
}

export interface VideoAnalyticsResponse {
  videoId: string;
  totals: MetricsResponse;
  byPlatform: VideoPlatformMetricsResponse[];
}

export interface SyncResponse {
  synced: number;
  failed: number;
}
