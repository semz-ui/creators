import type { IPublicationRepository } from '../domain/ports/publication-repository';
import {
  toPublicPublication,
  type ListPublicationsInput,
  type PagedResult,
  type PublicPublication,
} from './dto';

/** Returns a page of the user's publications, newest first. */
export class ListPublications {
  constructor(private readonly publications: IPublicationRepository) {}

  async execute(
    userId: string,
    input: ListPublicationsInput,
  ): Promise<PagedResult<PublicPublication>> {
    const skip = (input.page - 1) * input.limit;
    const { items, total } = await this.publications.findByOwner(userId, {
      limit: input.limit,
      skip,
    });

    return {
      items: items.map(toPublicPublication),
      page: input.page,
      limit: input.limit,
      total,
    };
  }
}
