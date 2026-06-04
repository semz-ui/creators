import { Metrics } from '../domain/metrics';
import type { IVideoMetricRepository } from '../domain/ports/video-metric-repository';
import type { VideoAnalyticsResult } from './dto';

/**
 * Per-video analytics: metrics for each platform the video was published to,
 * plus totals. Empty (not 404) when there are no metrics — avoids leaking
 * whether a video exists/belongs to the user.
 */
export class GetVideoAnalytics {
  constructor(private readonly metrics: IVideoMetricRepository) {}

  async execute(userId: string, videoId: string): Promise<VideoAnalyticsResult> {
    const rows = await this.metrics.listByUserAndVideo(userId, videoId);

    let totals = Metrics.zero();
    const byPlatform = rows.map((row) => {
      totals = totals.add(row.metrics);
      return {
        platform: row.platform,
        externalPostId: row.externalPostId,
        metrics: row.metrics.toValues(),
        syncedAt: row.syncedAt,
      };
    });

    return { videoId, totals: totals.toValues(), byPlatform };
  }
}
