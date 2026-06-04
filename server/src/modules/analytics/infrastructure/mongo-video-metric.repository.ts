import type { IVideoMetricRepository } from '../domain/ports/video-metric-repository';
import { VideoMetric } from '../domain/video-metric.entity';
import { VideoMetricModel, type VideoMetricDocument } from './video-metric.model';

/** MongoDB implementation of {@link IVideoMetricRepository}. */
export class MongoVideoMetricRepository implements IVideoMetricRepository {
  async upsert(metric: VideoMetric): Promise<void> {
    const s = metric.toSnapshot();
    await VideoMetricModel.updateOne(
      { _id: s.id },
      {
        $set: {
          userId: s.userId,
          videoId: s.videoId,
          platform: s.platform,
          externalPostId: s.externalPostId,
          views: s.views,
          likes: s.likes,
          comments: s.comments,
          shares: s.shares,
          syncedAt: s.syncedAt,
        },
      },
      { upsert: true },
    ).exec();
  }

  async listByUser(userId: string): Promise<VideoMetric[]> {
    const docs = await VideoMetricModel.find({ userId }).lean<VideoMetricDocument[]>().exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async listByUserAndVideo(userId: string, videoId: string): Promise<VideoMetric[]> {
    const docs = await VideoMetricModel.find({ userId, videoId })
      .lean<VideoMetricDocument[]>()
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  private toEntity(doc: VideoMetricDocument): VideoMetric {
    return VideoMetric.fromSnapshot({
      id: doc._id,
      userId: doc.userId,
      videoId: doc.videoId,
      platform: doc.platform,
      externalPostId: doc.externalPostId,
      views: doc.views,
      likes: doc.likes,
      comments: doc.comments,
      shares: doc.shares,
      syncedAt: doc.syncedAt,
    });
  }
}
