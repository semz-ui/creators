import { cn } from '@/shared/lib/cn';

import type { LedgerEntry, LedgerReason } from '../data/billing.types';

const REASON_LABEL: Record<LedgerReason, string> = {
  topup: 'Top-up',
  generation: 'Video generation',
  refund: 'Refund',
};

export function LedgerList({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-content-secondary">No transactions yet.</p>;
  }

  return (
    <ul className="divide-y divide-line-subtle">
      {entries.map((entry) => {
        const isCredit = entry.type === 'credit';
        return (
          <li key={entry.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-content">{REASON_LABEL[entry.reason]}</p>
              <p className="text-xs text-content-muted">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className={cn('font-medium', isCredit ? 'text-success' : 'text-content')}>
                {isCredit ? '+' : '−'}
                {entry.amount}
              </p>
              <p className="text-xs text-content-muted">{entry.balanceAfter} left</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
