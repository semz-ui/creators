import { PLATFORMS, type Platform } from '@modules/connections/domain/platform';

import type { ISocialPublisher } from '../domain/ports/social-publisher';
import { StaticSocialPublisherRegistry, StubSocialPublisher } from './stub-social-publisher';
import { YouTubeSocialPublisher, type YouTubePublisherConfig } from './youtube-social-publisher';

export interface PublisherRegistryConfig {
  /** When set, the real YouTube publisher handles 'youtube'. */
  youtube?: YouTubePublisherConfig;
}

/**
 * Registry with real publishers where configured and the stub everywhere else,
 * so the app always boots for local dev, demos, and tests.
 */
export function buildPublisherRegistry(
  config: PublisherRegistryConfig = {},
): StaticSocialPublisherRegistry {
  const publishers = new Map<Platform, ISocialPublisher>(
    PLATFORMS.map((platform) => [platform, new StubSocialPublisher(platform)]),
  );
  if (config.youtube) {
    publishers.set('youtube', new YouTubeSocialPublisher(config.youtube));
  }
  return new StaticSocialPublisherRegistry(publishers);
}
