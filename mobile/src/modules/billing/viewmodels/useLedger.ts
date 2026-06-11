import { useQuery } from '@tanstack/react-query';

import { billingApi } from '../data/billing.api';
import { billingKeys } from '../data/query-keys';

/** Paged ledger history. */
export function useLedger(page = 1, limit = 10) {
  return useQuery({
    queryKey: billingKeys.ledger(page, limit),
    queryFn: () => billingApi.getLedger({ page, limit }),
  });
}
