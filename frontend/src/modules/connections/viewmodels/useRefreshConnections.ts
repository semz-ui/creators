import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { connectionKeys } from '../data/query-keys';

/** Refetches the connections list — for changes made outside the app, e.g. the OAuth return. */
export function useRefreshConnections() {
  const queryClient = useQueryClient();

  return useCallback(
    () => void queryClient.invalidateQueries({ queryKey: connectionKeys.all }),
    [queryClient],
  );
}
