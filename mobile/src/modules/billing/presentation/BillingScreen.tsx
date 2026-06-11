import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatNumber } from '@/shared/lib/format';
import { Button, Card, EmptyState, Screen, Spinner } from '@/shared/ui';

import type { LedgerEntry, LedgerReason } from '../data/billing.types';
import { useBalance } from '../viewmodels/useBalance';
import { useLedger } from '../viewmodels/useLedger';
import { CREDIT_PACKS, useTopUp } from '../viewmodels/useTopUp';

const PAGE_SIZE = 10;

const REASON_LABEL: Record<LedgerReason, string> = {
  topup: 'Top-up',
  generation: 'Video generation',
  refund: 'Refund',
};

function LedgerRow({ entry, last }: { entry: LedgerEntry; last: boolean }) {
  const signed = entry.type === 'credit' ? `+${entry.amount}` : `−${entry.amount}`;
  return (
    <View
      className={cn(
        'flex-row items-center justify-between px-5 py-3',
        !last && 'border-b border-line-subtle',
      )}
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-medium text-sm text-content">{REASON_LABEL[entry.reason]}</Text>
        <Text className="font-sans text-xs text-content-muted">
          {formatDateTime(entry.createdAt)}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text
          className={cn(
            'font-sans-semibold text-sm',
            entry.type === 'credit' ? 'text-success' : 'text-content',
          )}
        >
          {signed}
        </Text>
        <Text className="font-sans text-xs text-content-muted">
          {formatNumber(entry.balanceAfter)} after
        </Text>
      </View>
    </View>
  );
}

export function BillingScreen() {
  const balance = useBalance();
  const [page, setPage] = useState(1);
  const ledger = useLedger(page, PAGE_SIZE);
  const topUp = useTopUp();

  const totalPages = ledger.data ? Math.max(1, Math.ceil(ledger.data.total / PAGE_SIZE)) : 1;

  const refreshAll = () => {
    void balance.refetch();
    void ledger.refetch();
  };

  return (
    <Screen
      title="Billing"
      subtitle="Credits power your video generations"
      showBack
      refreshing={balance.isRefetching || ledger.isRefetching}
      onRefresh={refreshAll}
    >
      <Card className="mb-4 gap-1">
        <Text className="font-sans text-xs uppercase text-content-muted">Current balance</Text>
        <Text className="font-display-bold text-4xl text-content">
          {balance.data ? `${formatNumber(balance.data.balance)} credits` : '—'}
        </Text>
      </Card>

      <Card className="mb-4 gap-4">
        <Text className="font-sans-medium text-sm text-content-secondary">Buy more credits</Text>
        <View className="flex-row gap-2">
          {CREDIT_PACKS.map((pack) => {
            const selected = topUp.credits === pack;
            return (
              <Pressable
                key={pack}
                onPress={() => topUp.setCredits(pack)}
                className={cn(
                  'flex-1 items-center rounded-xl border px-3 py-3',
                  selected ? 'border-brand bg-brand' : 'border-line bg-surface active:bg-sunken',
                )}
              >
                <Text
                  className={cn(
                    'font-sans-semibold text-base',
                    selected ? 'text-content-inverse' : 'text-content',
                  )}
                >
                  {pack}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {topUp.isError ? (
          <Text className="font-sans text-sm text-danger">
            Couldn&apos;t start checkout. Try again.
          </Text>
        ) : null}
        <Button
          title={`Buy ${topUp.credits} credits`}
          onPress={topUp.buy}
          loading={topUp.isSubmitting}
          block
        />
        <Text className="font-sans text-xs text-content-muted">
          Checkout opens in the browser; credits appear here once payment completes (pull to
          refresh).
        </Text>
      </Card>

      <Text className="mb-3 font-display text-lg text-content">History</Text>
      {ledger.isPending ? (
        <Spinner />
      ) : ledger.isError ? (
        <EmptyState title="Couldn't load your history" message="Pull to refresh to try again." />
      ) : ledger.data.items.length === 0 ? (
        <EmptyState title="No transactions yet" />
      ) : (
        <>
          <Card className="p-0">
            {ledger.data.items.map((entry, index) => (
              <LedgerRow
                key={entry.id}
                entry={entry}
                last={index === ledger.data.items.length - 1}
              />
            ))}
          </Card>
          {totalPages > 1 ? (
            <View className="mt-3 flex-row items-center justify-between">
              <Button
                title="Previous"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Text className="font-sans text-sm text-content-secondary">
                Page {page} of {totalPages}
              </Text>
              <Button
                title="Next"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
