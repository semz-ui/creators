import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { billingKeys } from '../data/query-keys';

/** Refetches the balance and ledger — for changes made outside the app, e.g. the checkout return. */
export function useRefreshBilling() {
  const queryClient = useQueryClient();

  return useCallback(
    () => void queryClient.invalidateQueries({ queryKey: billingKeys.all }),
    [queryClient],
  );
}
