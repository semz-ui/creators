export type VideoStatus = 'queued' | 'processing' | 'ready' | 'failed';
export type VideoSource = 'generated' | 'uploaded';

export interface Video {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoInput {
  prompt: string;
  durationSeconds: number;
  musicTrackId?: string | null;
  narrationText?: string | null;
  narrationVoice?: string | null;
}

export interface UploadVideoInput {
  title: string;
  file: File;
}

export interface VideoPage {
  items: Video[];
  page: number;
  limit: number;
  total: number;
}
