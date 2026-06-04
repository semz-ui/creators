import type { IVideoRepository } from '../domain/ports/video-repository';
import { VideoNotFoundError } from '../domain/video.errors';
import { toPublicVideo, type PublicVideo } from './dto';

/** Fetches one of the owner's videos. 404s if it doesn't exist or isn't theirs. */
export class GetVideo {
  constructor(private readonly videos: IVideoRepository) {}

  async execute(ownerId: string, id: string): Promise<PublicVideo> {
    const video = await this.videos.findById(id);
    // Same response whether missing or not-owned, to avoid leaking existence.
    if (!video || video.ownerId !== ownerId) {
      throw new VideoNotFoundError();
    }
    return toPublicVideo(video);
  }
}
