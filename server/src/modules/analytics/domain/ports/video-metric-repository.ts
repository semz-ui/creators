import type { VideoMetric } from '../video-metric.entity';

/** Stores the latest metrics per (user, video, platform). */
export interface IVideoMetricRepository {
  /** Latest-wins upsert keyed by the metric's composite id. */
  upsert(metric: VideoMetric): Promise<void>;
  listByUser(userId: string): Promise<VideoMetric[]>;
  listByUserAndVideo(userId: string, videoId: string): Promise<VideoMetric[]>;
}
