export interface AudioCompositionInput {
  /** Storage public_id of the base (generated) video. */
  baseAssetId: string;
  /** Library track id to add as background music, if any. */
  musicTrackId?: string | null;
  /** Spoken narration to synthesize and overlay, if any. */
  narration?: { text: string; voice: string } | null;
}

/**
 * Builds a delivery URL for the base video with background music and/or spoken
 * narration mixed in. Returns the plain base URL when no audio is requested.
 */
export interface IAudioCompositor {
  compose(input: AudioCompositionInput): Promise<string>;
}
