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
      // Claim before doing any external work. Once claimed the publication is no
      // longer `scheduled`, so a crash mid-distribute (or another scheduler
      // instance) can't re-pick it and double-post. A lost claim means someone
      // else owns it.
      if (!(await this.publications.claimForDistribution(publication.id))) {
        continue;
      }

      try {
        await this.distribution.distribute(publication);
        await this.publications.save(publication);
        processed += 1;
      } catch {
        // Leave it claimed (status `publishing`); a reaper/operator recovers a
        // stuck publication. We never re-distribute, since duplicate external
        // posts are worse than a delayed one.
      }
    }

    return { processed };
  }
}
