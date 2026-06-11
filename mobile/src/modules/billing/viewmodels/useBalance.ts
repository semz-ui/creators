import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { billingApi } from '../data/billing.api';
import { billingKeys } from '../data/query-keys';

/**
 * Current credit balance. Refetches on screen focus so generations and
 * top-ups (applied by the payment webhook) show up promptly.
 */
export function useBalance() {
  const query = useQuery({
    queryKey: billingKeys.balance,
    queryFn: billingApi.getBalance,
  });

  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return query;
}
