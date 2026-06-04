import type { Publication } from '../publication.entity';

export interface ListOptions {
  limit: number;
  skip: number;
}

export interface PagedPublications {
  items: Publication[];
  total: number;
}

/** Persistence port for the Publication aggregate. */
export interface IPublicationRepository {
  save(publication: Publication): Promise<void>;
  findById(id: string): Promise<Publication | null>;
  findByOwner(ownerId: string, options: ListOptions): Promise<PagedPublications>;
  /** Scheduled publications whose time has come (`scheduledAt <= now`). */
  findDue(now: Date, limit: number): Promise<Publication[]>;
}
