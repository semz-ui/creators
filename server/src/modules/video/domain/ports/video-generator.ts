import type { VideoProvider } from '../provider';

export interface GenerationRequest {
  videoId: string;
  prompt: string;
  durationSeconds: number;
}

export interface GenerationHandle {
  /** Provider-side job reference; results arrive later keyed by this. */
  jobRef: string;
}

/**
 * Outcome of polling a generation job. `processing` means still running;
 * `ready`/`failed` are terminal and carry the result url or error.
 */
export type GenerationStatus =
  | { state: 'processing' }
  // `assetId` is set when the result lives in our own storage (Cloudinary
  // public_id) so the app can composite audio onto it; absent for generators
  // that return a remote URL we don't control.
  | { state: 'ready'; resultUrl: string; assetId?: string }
  | { state: 'failed'; error: string };

/**
 * Port for the external AI video generator. `submit` kicks off an async job;
 * the result is then obtained either by the provider calling our generation
 * callback, or by `poll`ing the job by its `jobRef` (used by poll-on-read).
 */
export interface IVideoGenerator {
  submit(request: GenerationRequest): Promise<GenerationHandle>;
  poll(jobRef: string): Promise<GenerationStatus>;
}

/**
 * Resolves the generator for a provider. Because the provider is chosen per
 * video, a job can only be polled by the generator that accepted it — callers
 * must resolve from the video's own `provider`, never from the default.
 *
 * `get` throws for a provider with no credentials configured, so availability
 * is checked with `isAvailable` before anything with a side effect happens.
 */
export interface IVideoGeneratorRegistry {
  get(provider: VideoProvider): IVideoGenerator;
  isAvailable(provider: VideoProvider): boolean;
  /** Provider used when the caller doesn't name one (and for legacy rows). */
  defaultProvider(): VideoProvider;
}
