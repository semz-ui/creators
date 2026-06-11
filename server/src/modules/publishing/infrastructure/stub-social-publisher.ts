import { randomUUID } from 'node:crypto';

import { UnsupportedPlatformError } from '@modules/connections/domain/connection.errors';
import type { Platform } from '@modules/connections/domain/platform';

import type {
  ISocialPublisher,
  ISocialPublisherRegistry,
  PublishRequest,
  PublishResult,
} from '../domain/ports/social-publisher';

/**
 * Placeholder publisher: pretends to post and returns a fake external id. Real
 * per-platform integrations drop in behind {@link ISocialPublisher} later.
 */
export class StubSocialPublisher implements ISocialPublisher {
  constructor(private readonly platform: Platform) {}

  async publish(_request: PublishRequest): Promise<PublishResult> {
    return { externalPostId: `${this.platform}-post-${randomUUID().slice(0, 8)}` };
  }
}

/** Resolves the publisher for a platform from a fixed map. */
export class StaticSocialPublisherRegistry implements ISocialPublisherRegistry {
  constructor(private readonly publishers: Map<Platform, ISocialPublisher>) {}

  get(platform: Platform): ISocialPublisher {
    const publisher = this.publishers.get(platform);
    if (!publisher) {
      throw new UnsupportedPlatformError(platform);
    }
    return publisher;
  }
}
