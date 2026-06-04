import type { IPublicationRepository } from '@modules/publishing/domain/ports/publication-repository';

import type {
  IPublishedPostsProvider,
  PublishedPost,
} from '../domain/ports/published-posts-provider';

const PAGE_SIZE = 100;

/**
 * Implements {@link IPublishedPostsProvider} over the Publishing repository:
 * pages through the user's publications and flattens their `published` targets
 * into individual posts.
 */
export class PublishedPostsAdapter implements IPublishedPostsProvider {
  constructor(private readonly publications: IPublicationRepository) {}

  async getPublishedPosts(userId: string): Promise<PublishedPost[]> {
    const posts: PublishedPost[] = [];
    let skip = 0;
    let total = Infinity;

    while (skip < total) {
      const page = await this.publications.findByOwner(userId, { limit: PAGE_SIZE, skip });
      total = page.total;
      if (page.items.length === 0) {
        break;
      }

      for (const publication of page.items) {
        for (const target of publication.targets) {
          if (target.status === 'published' && target.externalPostId) {
            posts.push({
              videoId: publication.videoId,
              platform: target.platform,
              externalPostId: target.externalPostId,
            });
          }
        }
      }
      skip += page.items.length;
    }

    return posts;
  }
}
