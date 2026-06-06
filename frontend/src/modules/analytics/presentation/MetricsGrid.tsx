import { formatNumber } from '@/shared/lib/format';

import type { Metrics } from '../data/analytics.types';

const FIELDS: Array<{ key: keyof Metrics; label: string }> = [
  { key: 'views', label: 'Views' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
];

export function MetricsGrid({ metrics }: { metrics: Metrics }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {FIELDS.map(({ key, label }) => (
        <div key={key} className="rounded-lg bg-sunken px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-content-muted">
            {label}
          </dt>
          <dd className="mt-1 font-display text-2xl font-bold text-content">
            {formatNumber(metrics[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}
