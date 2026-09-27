export type VideoStatus = 'queued' | 'processing' | 'ready' | 'failed';
export type VideoSource = 'generated' | 'uploaded';
/** Generators a user can pick from; the server's stub is never offered. */
export type VideoProvider = 'sora' | 'kling' | 'pika';

/** One entry in the provider picker, as reported by the server. */
export interface VideoProviderInfo {
  id: VideoProvider;
  label: string;
  /** False when the server has no credentials for it — not selectable. */
  available: boolean;
  /** False when music/narration can't be applied to its output. */
  supportsAudio: boolean;
}

export interface Video {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoInput {
  prompt: string;
  durationSeconds: number;
  provider?: VideoProvider | null;
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
