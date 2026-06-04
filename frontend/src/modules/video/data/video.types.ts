export type VideoStatus = 'queued' | 'processing' | 'ready' | 'failed';

export interface Video {
  id: string;
  prompt: string;
  durationSeconds: number;
  status: VideoStatus;
  resultUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoInput {
  prompt: string;
  durationSeconds: number;
}

export interface VideoPage {
  items: Video[];
  page: number;
  limit: number;
  total: number;
}

export const isVideoProcessing = (status: VideoStatus): boolean =>
  status === 'queued' || status === 'processing';
