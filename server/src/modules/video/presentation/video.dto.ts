import type { VideoSource, VideoStatus } from '../domain/video.entity';

/**
 * Presentation-layer DTOs for the video module: the exact JSON shapes this API
 * puts on the wire. Owned by the presentation layer and deliberately separate
 * from the application DTOs (`application/dto.ts`) — the presenter maps one to
 * the other so neither layer's contract drifts into the other.
 */

export interface VideoResponse {
  id: string;
  source: VideoSource;
  title: string | null;
  prompt: string;
  durationSeconds: number;
  status: VideoStatus;
  resultUrl: string | null;
  error: string | null;
  musicTrackId: string | null;
  narrationText: string | null;
  narrationVoice: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoPageResponse {
  items: VideoResponse[];
  page: number;
  limit: number;
  total: number;
}
