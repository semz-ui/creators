import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { Button, Card, Spinner } from '@/shared/ui';

import { useBalance } from '../viewmodels/useBalance';
import { useLedger } from '../viewmodels/useLedger';
import { CREDIT_PACKS, useTopUp } from '../viewmodels/useTopUp';
import { LedgerList } from './LedgerList';

const LIMIT = 10;

export function BillingPage() {
  const { data: balance, isPending: balancePending } = useBalance();
  const topUp = useTopUp();
  const [page, setPage] = useState(1);
  const { data: ledger, isPending: ledgerPending } = useLedger(page, LIMIT);

  const totalPages = ledger ? Math.max(1, Math.ceil(ledger.total / ledger.limit)) : 1;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-content">Billing</h1>
      <p className="mt-1 text-content-secondary">Credits power your video generations.</p>

      <Card className="mt-6">
        <p className="text-sm text-content-secondary">Current balance</p>
        <p className="font-display text-4xl font-bold text-content" data-testid="balance">
          {balancePending ? '—' : `${balance?.balance ?? 0} credits`}
        </p>

        <div className="mt-5 border-t border-line-subtle pt-5">
          <p className="text-sm font-medium text-content-secondary">Buy more credits</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack}
                type="button"
                aria-pressed={topUp.credits === pack}
                onClick={() => topUp.setCredits(pack)}
                className={cn(
                  'h-10 rounded-lg border px-4 text-sm font-medium transition-colors',
                  topUp.credits === pack
                    ? 'border-brand bg-brand text-content-inverse'
                    : 'border-line bg-surface text-content hover:bg-sunken',
                )}
              >
                {pack} credits
              </button>
            ))}
          </div>
          {topUp.isError && (
            <p className="mt-2 text-sm text-danger">Couldn&apos;t start checkout. Try again.</p>
          )}
          <Button className="mt-4" disabled={topUp.isSubmitting} onClick={topUp.buy}>
            {topUp.isSubmitting ? 'Redirecting…' : `Buy ${topUp.credits} credits`}
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 mt-8 font-display text-lg font-medium text-content">History</h2>
      <Card>
        {ledgerPending ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            <LedgerList entries={ledger?.items ?? []} />
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-content-muted">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
