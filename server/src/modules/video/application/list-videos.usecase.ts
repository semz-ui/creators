import type { IVideoRepository } from '../domain/ports/video-repository';
import { toPublicVideo, type ListVideosInput, type PagedResult, type PublicVideo } from './dto';

/** Returns a page of the owner's videos, newest first. */
export class ListVideos {
  constructor(private readonly videos: IVideoRepository) {}

  async execute(ownerId: string, input: ListVideosInput): Promise<PagedResult<PublicVideo>> {
    const skip = (input.page - 1) * input.limit;
    const { items, total } = await this.videos.findByOwner(ownerId, { limit: input.limit, skip });

    return {
      items: items.map(toPublicVideo),
      page: input.page,
      limit: input.limit,
      total,
    };
  }
}
