import type { CreditService } from './credit.service';

/** Returns the user's current credit balance (seeding the free grant if new). */
export class GetBalance {
  constructor(private readonly credits: CreditService) {}

  async execute(userId: string): Promise<{ balance: number }> {
    return { balance: await this.credits.getBalance(userId) };
  }
}
