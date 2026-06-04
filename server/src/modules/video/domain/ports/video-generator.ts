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
 * Port for the external AI video generator. `submit` kicks off an async job;
 * the result arrives later via the generation callback (see ApplyGenerationResult).
 */
export interface IVideoGenerator {
  submit(request: GenerationRequest): Promise<GenerationHandle>;
}
