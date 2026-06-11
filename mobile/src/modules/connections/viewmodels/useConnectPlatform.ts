import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { connectionsApi } from '../data/connections.api';
import type { Platform } from '../data/connections.types';
import { connectionKeys } from '../data/query-keys';

/**
 * Starts the OAuth flow for a platform: requests an authorization URL and
 * opens it in the system auth browser. The provider returns to the backend
 * callback; once the browser is dismissed the connections list is refetched
 * (plus again on app foreground, see useConnections).
 */
export function useConnectPlatform() {
  const queryClient = useQueryClient();
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);

  const mutation = useMutation({
    mutationFn: (platform: Platform) => connectionsApi.start(platform),
    onSuccess: async (result) => {
      await WebBrowser.openAuthSessionAsync(result.authorizationUrl);
      await queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    },
    onSettled: () => setPendingPlatform(null),
  });

  const connect = (platform: Platform) => {
    setPendingPlatform(platform);
    mutation.mutate(platform);
  };

  return { connect, pendingPlatform, isError: mutation.isError };
}
