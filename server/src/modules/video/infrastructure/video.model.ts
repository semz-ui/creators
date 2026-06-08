import { Schema, model } from 'mongoose';

import type { VideoStatus } from '../domain/video.entity';

export interface VideoDocument {
  _id: string;
  ownerId: string;
  prompt: string;
  durationSeconds: number;
  status: VideoStatus;
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
    prompt: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    status: { type: String, required: true },
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
