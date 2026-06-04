import type { IPublicationRepository } from '../domain/ports/publication-repository';
import type { DistributionService } from './distribution.service';

const BATCH_LIMIT = 50;

/**
 * Distributes scheduled publications whose time has come. Intended to be driven
 * by a scheduler/cron (via the secret-protected endpoint). Each publication is
 * isolated — one failing doesn't stop the batch.
 */
export class RunDuePublications {
  constructor(
    private readonly publications: IPublicationRepository,
    private readonly distribution: DistributionService,
  ) {}

  async execute(now: Date = new Date()): Promise<{ processed: number }> {
    const due = await this.publications.findDue(now, BATCH_LIMIT);

    let processed = 0;
    for (const publication of due) {
      try {
        await this.distribution.distribute(publication);
        await this.publications.save(publication);
        processed += 1;
      } catch {
        // Skip this one; the next scheduler tick will retry it.
      }
    }

    return { processed };
  }
}
