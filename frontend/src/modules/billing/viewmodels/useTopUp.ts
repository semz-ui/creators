import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { billingApi } from '../data/billing.api';

export const CREDIT_PACKS = [50, 100, 250] as const;

/**
 * Starts a top-up: requests a checkout session and redirects the browser to the
 * payment provider. Credits are applied by the provider webhook on the backend.
 */
export function useTopUp() {
  const [credits, setCredits] = useState<number>(CREDIT_PACKS[1]);

  const mutation = useMutation({
    mutationFn: () => billingApi.topUp(credits),
    onSuccess: (result) => {
      window.location.assign(result.checkoutUrl);
    },
  });

  return {
    credits,
    setCredits,
    buy: () => mutation.mutate(),
    isSubmitting: mutation.isPending,
    isError: mutation.isError,
  };
}
