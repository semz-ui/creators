import {
  NoActiveConnectionError,
  NoTargetsSpecifiedError,
  VideoNotPublishableError,
} from '../domain/publication.errors';
import type { IConnectionTokenProvider } from '../domain/ports/connection-token-provider';
import type { IPublicationRepository } from '../domain/ports/publication-repository';
import type { IReadyVideoLookup } from '../domain/ports/ready-video-lookup';
import { Publication, type NewTarget } from '../domain/publication.entity';
import type { DistributionService } from './distribution.service';
import { toPublicPublication, type CreatePublicationInput, type PublicPublication } from './dto';

/**
 * Creates a publication for a ready video to one or more connected platforms.
 * Validates the video and connections up front, then distributes immediately
 * (no `scheduledAt`, or one in the past) or stores it for the scheduler.
 */
export class CreatePublication {
  constructor(
    private readonly publications: IPublicationRepository,
    private readonly videos: IReadyVideoLookup,
    private readonly connections: IConnectionTokenProvider,
    private readonly distribution: DistributionService,
  ) {}

  async execute(userId: string, input: CreatePublicationInput): Promise<PublicPublication> {
    const platforms = [...new Set(input.platforms)];
    if (platforms.length === 0) {
      throw new NoTargetsSpecifiedError();
    }

    const video = await this.videos.getReadyVideo(userId, input.videoId);
    if (!video) {
      throw new VideoNotPublishableError();
    }

    const targets: NewTarget[] = [];
    for (const platform of platforms) {
      const connection = await this.connections.getActiveConnection(userId, platform);
      if (!connection) {
        throw new NoActiveConnectionError(platform);
      }
      targets.push({ platform, connectionId: connection.connectionId });
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const publication = Publication.create({
      userId,
      videoId: input.videoId,
      caption: input.caption ?? null,
      scheduledAt,
      targets,
    });

    if (publication.status !== 'scheduled') {
      await this.distribution.distribute(publication);
    }

    await this.publications.save(publication);
    return toPublicPublication(publication);
  }
}
