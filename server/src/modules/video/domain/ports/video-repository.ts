import type { Video } from '../video.entity';

export interface ListOptions {
  limit: number;
  skip: number;
}

export interface PagedVideos {
  items: Video[];
  total: number;
}

/** Persistence port for the Video aggregate. */
export interface IVideoRepository {
  save(video: Video): Promise<void>;
  findById(id: string): Promise<Video | null>;
  /** Lookup by the generator's job reference (used by the result callback). */
  findByJobRef(jobRef: string): Promise<Video | null>;
  /** A page of a user's videos, newest first, plus the total count. */
  findByOwner(ownerId: string, options: ListOptions): Promise<PagedVideos>;
}
