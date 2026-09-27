import { parsePlatform } from '@modules/connections/domain/platform';
import type { CreatePublication } from '@modules/publishing/application/create-publication.usecase';

import type {
  AgentPublication,
  AgentPublishInput,
  IPublishingActions,
} from '../domain/ports/publishing-actions';

export class PublishingActionsAdapter implements IPublishingActions {
  constructor(private readonly createPublication: CreatePublication) {}

  async publish(userId: string, input: AgentPublishInput): Promise<AgentPublication> {
    // `parsePlatform` throws UnsupportedPlatformError (400) for anything the
    // model invents, which the loop turns into an error result it can react to.
    const platforms = input.platforms.map(parsePlatform);

    const publication = await this.createPublication.execute(userId, {
      videoId: input.videoId,
      platforms,
      ...(input.caption !== undefined ? { caption: input.caption } : {}),
    });

    return {
      id: publication.id,
      videoId: publication.videoId,
      status: publication.status,
      caption: publication.caption,
      scheduledAt: publication.scheduledAt,
      targets: publication.targets.map((target) => ({
        platform: target.platform,
        status: target.status,
        externalPostId: target.externalPostId,
        error: target.error,
      })),
    };
  }
}
