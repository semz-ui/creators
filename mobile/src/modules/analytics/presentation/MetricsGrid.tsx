import { Text, View } from 'react-native';

import { formatNumber } from '@/shared/lib/format';

import type { Metrics } from '../data/analytics.types';

const ROWS: { key: keyof Metrics; label: string }[] = [
  { key: 'views', label: 'Views' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
];

export function MetricsGrid({ metrics }: { metrics: Metrics }) {
  return (
    <View className="flex-row flex-wrap">
      {ROWS.map(({ key, label }) => (
        <View key={key} className="w-1/2 gap-0.5 py-2">
          <Text className="font-sans text-xs uppercase text-content-muted">{label}</Text>
          <Text className="font-display text-xl text-content">{formatNumber(metrics[key])}</Text>
        </View>
      ))}
    </View>
  );
}
