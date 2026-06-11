import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { connectionsApi } from '../data/connections.api';
import { connectionKeys } from '../data/query-keys';

/**
 * The user's linked accounts. Refetches on screen focus and whenever the app
 * returns to the foreground — the OAuth flow finishes in the system browser,
 * so the list is stale by the time the user switches back.
 */
export function useConnections() {
  const query = useQuery({
    queryKey: connectionKeys.list,
    queryFn: connectionsApi.list,
  });

  const { refetch } = query;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

  return query;
}
