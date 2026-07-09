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

export const MAX_UPLOAD_MB = 500;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export interface VideoPage {
  items: Video[];
  page: number;
  limit: number;
  total: number;
}

/** Music library + voices — kept in sync with the server (modules/video/domain/audio.ts). */
export const MUSIC_TRACKS: readonly { id: string; label: string }[] = [
  { id: 'upbeat', label: 'Upbeat' },
  { id: 'calm', label: 'Calm' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'lofi', label: 'Lo-fi' },
];

export const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
export type Voice = (typeof VOICES)[number];

export const NARRATION_MAX = 600;

export const isVideoProcessing = (status: VideoStatus): boolean =>
  status === 'queued' || status === 'processing';
