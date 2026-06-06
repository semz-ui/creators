import { useMutation, useQueryClient } from '@tanstack/react-query';

import { analyticsApi } from '../data/analytics.api';
import { analyticsKeys } from '../data/query-keys';

/** Pulls fresh metrics from the platforms, then refreshes the cached views. */
export function useRefreshAnalytics() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: analyticsApi.refresh,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
  });

  return {
    refresh: () => mutation.mutate(),
    isRefreshing: mutation.isPending,
  };
}
