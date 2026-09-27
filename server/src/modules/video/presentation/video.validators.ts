import { z } from 'zod';

import { NARRATION_MAX_LENGTH, VOICES, isMusicTrack } from '../domain/audio';
import { SELECTABLE_PROVIDERS } from '../domain/provider';
import { DURATION_MAX_SECONDS, DURATION_MIN_SECONDS } from '../domain/value-objects/duration';
import { PROMPT_MAX_LENGTH } from '../domain/value-objects/prompt';

export const createVideoSchema = z.object({
  prompt: z.string().min(1).max(PROMPT_MAX_LENGTH),
  durationSeconds: z.number().int().min(DURATION_MIN_SECONDS).max(DURATION_MAX_SECONDS),
  // Generator to use; omitted means the server's default. An unconfigured one
  // is rejected by the use case before any credits are charged.
  provider: z.enum(SELECTABLE_PROVIDERS).nullish(),
  // Optional audio (Sora+Cloudinary only; ignored by other generators).
  musicTrackId: z.string().refine(isMusicTrack, { message: 'Unknown music track' }).nullish(),
  narrationText: z.string().trim().min(1).max(NARRATION_MAX_LENGTH).nullish(),
  narrationVoice: z.enum(VOICES).nullish(),
});

export const listVideosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// `resultUrl` is required only when the job succeeded.
export const generationCallbackSchema = z.discriminatedUnion('status', [
  z.object({
    jobRef: z.string().min(1),
    status: z.literal('ready'),
    resultUrl: z.string().url(),
  }),
  z.object({
    jobRef: z.string().min(1),
    status: z.literal('failed'),
    error: z.string().min(1).optional(),
  }),
]);

export const uploadVideoSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export type CreateVideoBody = z.infer<typeof createVideoSchema>;
export type GenerationCallbackBody = z.infer<typeof generationCallbackSchema>;
