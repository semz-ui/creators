import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { billingApi } from '../data/billing.api';
import { billingKeys } from '../data/query-keys';

export const CREDIT_PACKS = [50, 100, 250] as const;

/**
 * Starts a top-up: requests a checkout session and opens the Stripe-hosted
 * page in the in-app browser. Credits are applied by the provider webhook on
 * the backend, so balance + ledger refetch when the browser closes (webhook
 * latency means the balance may take a moment — the screen supports
 * pull-to-refresh for that).
 */
export function useTopUp() {
  const queryClient = useQueryClient();
  const [credits, setCredits] = useState<number>(CREDIT_PACKS[1]);

  const mutation = useMutation({
    mutationFn: () => billingApi.topUp(credits),
    onSuccess: async (result) => {
      await WebBrowser.openBrowserAsync(result.checkoutUrl);
      await queryClient.invalidateQueries({ queryKey: billingKeys.all });
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
