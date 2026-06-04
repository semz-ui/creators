import type { Platform } from '@modules/connections/domain/platform';

export interface PublishRequest {
  platform: Platform;
  accessToken: string;
  videoUrl: string;
  caption: string | null;
}

export interface PublishResult {
  externalPostId: string;
}

/** Posts a video to a single platform using the connection's token. */
export interface ISocialPublisher {
  publish(request: PublishRequest): Promise<PublishResult>;
}

/** Resolves the publisher for a platform. */
export interface ISocialPublisherRegistry {
  get(platform: Platform): ISocialPublisher;
}
