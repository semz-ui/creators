import type { IConnectionTokenProvider } from '../domain/ports/connection-token-provider';
import type { IReadyVideoLookup } from '../domain/ports/ready-video-lookup';
import type { ISocialPublisherRegistry } from '../domain/ports/social-publisher';
import type { Publication } from '../domain/publication.entity';

/**
 * Runs the actual distribution of a publication's pending targets. Mutates the
 * publication in place (caller persists). Per-target failures are isolated — one
 * platform failing never blocks the others — and the overall status is derived
 * at the end.
 */
export class DistributionService {
  constructor(
    private readonly videos: IReadyVideoLookup,
    private readonly connections: IConnectionTokenProvider,
    private readonly publishers: ISocialPublisherRegistry,
  ) {}

  async distribute(publication: Publication): Promise<void> {
    publication.beginDistribution();

    const video = await this.videos.getReadyVideo(publication.userId, publication.videoId);
    if (!video) {
      for (const target of publication.pendingTargets()) {
        publication.markTargetFailed(target.platform, 'Video is no longer available');
      }
      publication.recomputeStatus();
      return;
    }

    for (const target of publication.pendingTargets()) {
      // Bind to the connection captured when the publication was created, so a
      // scheduled post still goes to the intended account even if the user has
      // since switched their active connection for this platform.
      const connection = await this.connections.getActiveConnectionById(
        publication.userId,
        target.connectionId,
      );
      if (!connection) {
        publication.markTargetFailed(target.platform, 'No active connection');
        continue;
      }

      try {
        const { externalPostId } = await this.publishers.get(target.platform).publish({
          platform: target.platform,
          accessToken: connection.accessToken,
          videoUrl: video.videoUrl,
          caption: publication.caption,
        });
        publication.markTargetPublished(target.platform, externalPostId);
      } catch {
        publication.markTargetFailed(target.platform, 'Publish failed');
      }
    }

    publication.recomputeStatus();
  }
}
