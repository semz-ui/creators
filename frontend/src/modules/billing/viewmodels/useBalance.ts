import { useQuery } from '@tanstack/react-query';

import { billingApi } from '../data/billing.api';
import { billingKeys } from '../data/query-keys';

/** Current credit balance. */
export function useBalance() {
  return useQuery({
    queryKey: billingKeys.balance,
    queryFn: billingApi.getBalance,
  });
}
