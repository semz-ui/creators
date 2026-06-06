import type { Video } from '../video.entity';

export interface ListOptions {
  limit: number;
  skip: number;
}

export interface PagedVideos {
  items: Video[];
  total: number;
}

/** Terminal state to move a processing job into. */
export type TerminalTransition =
  | { status: 'ready'; resultUrl: string }
  | { status: 'failed'; error: string };

/** Persistence port for the Video aggregate. */
export interface IVideoRepository {
  save(video: Video): Promise<void>;
  findById(id: string): Promise<Video | null>;
  /** Lookup by the generator's job reference (used by the result callback). */
  findByJobRef(jobRef: string): Promise<Video | null>;
  /**
   * Atomically move a processing job to a terminal state — but only if it is
   * still `processing` (compare-and-set keyed on jobRef). Returns the updated
   * Video when THIS call performed the transition, or null when the job is
   * unknown or already terminal. Being a single-document conditional update it
   * is atomic even without multi-document transactions, so concurrent callers
   * (parallel poll-on-read or duplicate callbacks) can't both apply a result —
   * which is what keeps the failure refund from running twice.
   */
  claimTerminal(jobRef: string, transition: TerminalTransition): Promise<Video | null>;
  /** A page of a user's videos, newest first, plus the total count. */
  findByOwner(ownerId: string, options: ListOptions): Promise<PagedVideos>;
}
