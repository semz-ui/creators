import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { formatNumber } from '@/shared/lib/format';

import { useBalance } from '../viewmodels/useBalance';

/** Compact credit-balance pill; taps through to Billing. */
export function BalanceChip() {
  const router = useRouter();
  const balance = useBalance();

  return (
    <Pressable
      onPress={() => router.push('/(app)/billing')}
      className="flex-row items-center gap-1.5 rounded-full bg-info-bg px-3 py-1.5 active:opacity-80"
    >
      <Ionicons name="flash" size={14} color="#0284c7" />
      <Text className="font-sans-semibold text-sm text-content-brand">
        {balance.data ? formatNumber(balance.data.balance) : '—'}
      </Text>
    </Pressable>
  );
}
