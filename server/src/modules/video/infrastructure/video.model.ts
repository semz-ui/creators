import { Schema, model } from 'mongoose';

import type { VideoProvider } from '../domain/provider';
import type { VideoSource, VideoStatus } from '../domain/video.entity';

export interface VideoDocument {
  _id: string;
  ownerId: string;
  source: VideoSource;
  title: string | null;
  prompt: string;
  durationSeconds: number;
  status: VideoStatus;
  provider: VideoProvider | null;
  jobRef: string | null;
  resultUrl: string | null;
  error: string | null;
  musicTrackId: string | null;
  narrationText: string | null;
  narrationVoice: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<VideoDocument>(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true },
    source: { type: String, default: 'generated' },
    title: { type: String, default: null },
    prompt: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    status: { type: String, required: true },
    // Null for uploads and pre-selection rows; readers fall back to the default.
    provider: { type: String, default: null },
    jobRef: { type: String, default: null },
    resultUrl: { type: String, default: null },
    error: { type: String, default: null },
    musicTrackId: { type: String, default: null },
    narrationText: { type: String, default: null },
    narrationVoice: { type: String, default: null },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// List a user's videos newest-first.
videoSchema.index({ ownerId: 1, createdAt: -1 });
// Resolve a video from the generator's callback.
videoSchema.index({ jobRef: 1 }, { sparse: true });

export const VideoModel = model<VideoDocument>('Video', videoSchema);
