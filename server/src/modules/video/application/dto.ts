import type { Video, VideoStatus } from '../domain/video.entity';

/** Video fields safe to return to the owning client. */
export interface PublicVideo {
  id: string;
  prompt: string;
  durationSeconds: number;
  status: VideoStatus;
  resultUrl: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoInput {
  prompt: string;
  durationSeconds: number;
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
    prompt: video.prompt,
    durationSeconds: video.durationSeconds,
    status: video.status,
    resultUrl: video.resultUrl,
    error: video.error,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}
