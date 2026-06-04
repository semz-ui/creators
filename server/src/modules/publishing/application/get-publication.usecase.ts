import type { IPublicationRepository } from '../domain/ports/publication-repository';
import { PublicationNotFoundError } from '../domain/publication.errors';
import { toPublicPublication, type PublicPublication } from './dto';

/** Fetches one of the user's publications. 404s if missing or not theirs. */
export class GetPublication {
  constructor(private readonly publications: IPublicationRepository) {}

  async execute(userId: string, id: string): Promise<PublicPublication> {
    const publication = await this.publications.findById(id);
    if (!publication || publication.userId !== userId) {
      throw new PublicationNotFoundError();
    }
    return toPublicPublication(publication);
  }
}
