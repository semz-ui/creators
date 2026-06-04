/**
 * Cross-module read port: resolves a video that is owned by the user and in the
 * `ready` state, returning what publishing needs (its URL). Implemented by an
 * adapter over the Video module.
 */
export interface IReadyVideoLookup {
  getReadyVideo(userId: string, videoId: string): Promise<{ videoUrl: string } | null>;
}
