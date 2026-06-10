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
