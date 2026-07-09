import { randomUUID } from 'node:crypto';

import type { IVideoRepository } from '../domain/ports/video-repository';
import type { IVideoStorage } from '../domain/ports/video-storage';
import { Video } from '../domain/video.entity';
import { Title } from '../domain/value-objects/title';
import { type PublicVideo, type UploadVideoInput, toPublicVideo } from './dto';

export class UploadVideo {
  constructor(
    private readonly videos: IVideoRepository,
    private readonly storage: IVideoStorage,
  ) {}

  async execute(
    ownerId: string,
    input: UploadVideoInput,
    file: { data: Buffer; contentType: string },
  ): Promise<PublicVideo> {
    const title = Title.create(input.title);
    const key = `upload-${randomUUID()}`;

    const { url, durationSeconds } = await this.storage.uploadWithMetadata(
      file.data,
      key,
      file.contentType,
    );

    const video = Video.createUploaded({
      ownerId,
      title: title.value,
      resultUrl: url,
      durationSeconds,
    });

    await this.videos.save(video);
    return toPublicVideo(video);
  }
}
