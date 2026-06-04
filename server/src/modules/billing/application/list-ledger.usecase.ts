import type { ILedgerRepository } from '../domain/ports/ledger-repository';
import { toPublicLedgerEntry, type PagedResult, type PublicLedgerEntry } from './dto';

/** Returns a page of the user's ledger entries, newest first. */
export class ListLedger {
  constructor(private readonly ledger: ILedgerRepository) {}

  async execute(
    userId: string,
    input: { page: number; limit: number },
  ): Promise<PagedResult<PublicLedgerEntry>> {
    const skip = (input.page - 1) * input.limit;
    const { items, total } = await this.ledger.listByUser(userId, { limit: input.limit, skip });
    return {
      items: items.map(toPublicLedgerEntry),
      page: input.page,
      limit: input.limit,
      total,
    };
  }
}
