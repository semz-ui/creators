import type { Platform } from '@modules/connections/domain/platform';

import { Metrics } from './metrics';

export interface VideoMetricSnapshot {
  id: string;
  userId: string;
  videoId: string;
  platform: Platform;
  externalPostId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  syncedAt: Date;
}

/**
 * Latest known metrics for one video on one platform. Keyed by
 * `userId:videoId:platform` so a re-sync upserts (latest wins) rather than
 * accumulating rows.
 */
export class VideoMetric {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly videoId: string,
    readonly platform: Platform,
    readonly externalPostId: string,
    readonly metrics: Metrics,
    readonly syncedAt: Date,
  ) {}

  static keyOf(userId: string, videoId: string, platform: Platform): string {
    return `${userId}:${videoId}:${platform}`;
  }

  static create(params: {
    userId: string;
    videoId: string;
    platform: Platform;
    externalPostId: string;
    metrics: Metrics;
  }): VideoMetric {
    return new VideoMetric(
      VideoMetric.keyOf(params.userId, params.videoId, params.platform),
      params.userId,
      params.videoId,
      params.platform,
      params.externalPostId,
      params.metrics,
      new Date(),
    );
  }

  static fromSnapshot(s: VideoMetricSnapshot): VideoMetric {
    return new VideoMetric(
      s.id,
      s.userId,
      s.videoId,
      s.platform,
      s.externalPostId,
      Metrics.of({ views: s.views, likes: s.likes, comments: s.comments, shares: s.shares }),
      s.syncedAt,
    );
  }

  toSnapshot(): VideoMetricSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      videoId: this.videoId,
      platform: this.platform,
      externalPostId: this.externalPostId,
      views: this.metrics.views,
      likes: this.metrics.likes,
      comments: this.metrics.comments,
      shares: this.metrics.shares,
      syncedAt: this.syncedAt,
    };
  }
}
