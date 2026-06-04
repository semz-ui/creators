import type { IVideoRepository } from '@modules/video/domain/ports/video-repository';

import type { IReadyVideoLookup } from '../domain/ports/ready-video-lookup';

/**
 * Implements the publishing-side {@link IReadyVideoLookup} over the Video
 * module's repository. Only surfaces videos that are owned and `ready`.
 */
export class ReadyVideoLookupAdapter implements IReadyVideoLookup {
  constructor(private readonly videos: IVideoRepository) {}

  async getReadyVideo(userId: string, videoId: string): Promise<{ videoUrl: string } | null> {
    const video = await this.videos.findById(videoId);
    if (!video || video.ownerId !== userId || video.status !== 'ready' || !video.resultUrl) {
      return null;
    }
    return { videoUrl: video.resultUrl };
  }
}
