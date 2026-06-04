import type { Platform } from '@modules/connections/domain/platform';

import { Metrics } from '../domain/metrics';
import type { IVideoMetricRepository } from '../domain/ports/video-metric-repository';
import type { OverviewResult } from './dto';

/** Account-level analytics: totals across all the user's posts + per-platform. */
export class GetOverview {
  constructor(private readonly metrics: IVideoMetricRepository) {}

  async execute(userId: string): Promise<OverviewResult> {
    const rows = await this.metrics.listByUser(userId);

    const byPlatform = new Map<Platform, Metrics>();
    const videos = new Set<string>();
    let totals = Metrics.zero();

    for (const row of rows) {
      totals = totals.add(row.metrics);
      videos.add(row.videoId);
      byPlatform.set(
        row.platform,
        (byPlatform.get(row.platform) ?? Metrics.zero()).add(row.metrics),
      );
    }

    return {
      totals: totals.toValues(),
      byPlatform: [...byPlatform.entries()].map(([platform, m]) => ({
        platform,
        metrics: m.toValues(),
      })),
      videoCount: videos.size,
    };
  }
}
