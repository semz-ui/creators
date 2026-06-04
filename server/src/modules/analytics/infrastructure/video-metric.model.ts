import { Schema, model } from 'mongoose';

import type { Platform } from '@modules/connections/domain/platform';

/** `_id` is the composite key `userId:videoId:platform` (latest-wins upsert). */
export interface VideoMetricDocument {
  _id: string;
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

const videoMetricSchema = new Schema<VideoMetricDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    videoId: { type: String, required: true },
    platform: { type: String, required: true },
    externalPostId: { type: String, required: true },
    views: { type: Number, required: true, default: 0 },
    likes: { type: Number, required: true, default: 0 },
    comments: { type: Number, required: true, default: 0 },
    shares: { type: Number, required: true, default: 0 },
    syncedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

videoMetricSchema.index({ userId: 1, videoId: 1 });

export const VideoMetricModel = model<VideoMetricDocument>('VideoMetric', videoMetricSchema);
