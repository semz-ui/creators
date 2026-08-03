import type { VideoProvider } from '../domain/provider';
import type { Video, VideoSource, VideoStatus } from '../domain/video.entity';

/** Video fields safe to return to the owning client. */
export interface PublicVideo {
  id: string;
  source: VideoSource;
  title: string | null;
  prompt: string;
  durationSeconds: number;
  status: VideoStatus;
  /** Generator that produced it; null for uploads and pre-selection rows. */
  provider: VideoProvider | null;
  resultUrl: string | null;
  error: string | null;
  musicTrackId: string | null;
  narrationText: string | null;
  narrationVoice: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoInput {
  prompt: string;
  durationSeconds: number;
  /** Generator to use; falls back to the registry's default when absent. */
  provider?: string | null;
  musicTrackId?: string | null;
  narrationText?: string | null;
  narrationVoice?: string | null;
}

export interface UploadVideoInput {
  title: string;
}

export interface ListVideosInput {
  page: number;
  limit: number;
}

export interface GenerationResultInput {
  jobRef: string;
  status: 'ready' | 'failed';
  resultUrl?: string;
  error?: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function toPublicVideo(video: Video): PublicVideo {
  return {
    id: video.id,
    source: video.source,
    title: video.title,
    prompt: video.prompt,
    durationSeconds: video.durationSeconds,
    status: video.status,
    provider: video.provider,
    resultUrl: video.resultUrl,
    error: video.error,
    musicTrackId: video.musicTrackId,
    narrationText: video.narrationText,
    narrationVoice: video.narrationVoice,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}
