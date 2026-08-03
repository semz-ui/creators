import type { VideoProvider } from '../domain/provider';
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
  provider: VideoProvider | null;
  resultUrl: string | null;
  error: string | null;
  musicTrackId: string | null;
  narrationText: string | null;
  narrationVoice: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** One entry in the provider picker: what it is and whether it can be used. */
export interface VideoProviderResponse {
  id: VideoProvider;
  label: string;
  /** False when this deployment has no credentials for it — not selectable. */
  available: boolean;
  /** False when added music/narration can't be applied to its output. */
  supportsAudio: boolean;
}

export interface VideoProvidersResponse {
  providers: VideoProviderResponse[];
}

export interface VideoPageResponse {
  items: VideoResponse[];
  page: number;
  limit: number;
  total: number;
}
