/**
 * Optional audio that can be composited onto a generated video: a track from a
 * small built-in royalty-free library, and/or AI-spoken narration.
 *
 * Music tracks must be pre-uploaded to Cloudinary at the given `publicId`
 * (see server/scripts/upload-music.ts). The compositor overlays them on the
 * base video via Cloudinary `l_audio` transformations.
 */
export interface MusicTrack {
  id: string;
  label: string;
  /** Cloudinary public_id of the uploaded track. */
  publicId: string;
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { id: 'upbeat', label: 'Upbeat', publicId: 'reelo/music/upbeat' },
  { id: 'calm', label: 'Calm', publicId: 'reelo/music/calm' },
  { id: 'cinematic', label: 'Cinematic', publicId: 'reelo/music/cinematic' },
  { id: 'lofi', label: 'Lo-fi', publicId: 'reelo/music/lofi' },
];

/** OpenAI TTS voices offered for narration. */
export const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
export type Voice = (typeof VOICES)[number];
export const DEFAULT_VOICE: Voice = 'alloy';

/** Max characters of narration text (bounds the TTS request). */
export const NARRATION_MAX_LENGTH = 600;

export function isMusicTrack(id: string): boolean {
  return MUSIC_TRACKS.some((t) => t.id === id);
}

export function isVoice(value: string): value is Voice {
  return (VOICES as readonly string[]).includes(value);
}

/** Cloudinary public_id for a track id, or undefined if unknown. */
export function musicPublicId(id: string): string | undefined {
  return MUSIC_TRACKS.find((t) => t.id === id)?.publicId;
}
