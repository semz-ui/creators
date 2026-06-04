import type { Platform } from '@modules/connections/domain/platform';

export interface PublishedPost {
  videoId: string;
  platform: Platform;
  externalPostId: string;
}

/**
 * Cross-module read port: the user's successfully-published posts. Implemented
 * by an adapter over the Publishing module.
 */
export interface IPublishedPostsProvider {
  getPublishedPosts(userId: string): Promise<PublishedPost[]>;
}
