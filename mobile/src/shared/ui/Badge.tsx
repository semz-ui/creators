import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const TONE: Record<BadgeTone, { container: string; label: string }> = {
  neutral: { container: 'bg-sunken', label: 'text-content-secondary' },
  success: { container: 'bg-success-bg', label: 'text-success' },
  warning: { container: 'bg-warning-bg', label: 'text-warning' },
  danger: { container: 'bg-danger-bg', label: 'text-danger' },
  info: { container: 'bg-info-bg', label: 'text-info' },
  brand: { container: 'bg-info-bg', label: 'text-content-brand' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', TONE[tone].container)}>
      <Text className={cn('font-sans-medium text-xs', TONE[tone].label)}>{label}</Text>
    </View>
  );
}
