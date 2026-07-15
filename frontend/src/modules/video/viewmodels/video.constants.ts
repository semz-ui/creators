/** Upload limits — kept in sync with the server (video upload.middleware.ts). */
export const MAX_UPLOAD_MB = 500;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

/** Music library + voices — kept in sync with the server (modules/video/domain/audio.ts). */
export const MUSIC_TRACKS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'upbeat', label: 'Upbeat' },
  { id: 'calm', label: 'Calm' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'lofi', label: 'Lo-fi' },
];

export const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
export type Voice = (typeof VOICES)[number];

export const NARRATION_MAX = 600;
