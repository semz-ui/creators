import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { connectionsApi } from '../data/connections.api';
import type { Platform } from '../data/connections.types';

/**
 * Starts the OAuth flow for a platform: requests an authorization URL and
 * redirects the browser to it. The provider returns to the backend callback,
 * which redirects back to /connections/callback.
 */
export function useConnectPlatform() {
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);

  const mutation = useMutation({
    mutationFn: (platform: Platform) => connectionsApi.start(platform),
    onSuccess: (result) => {
      window.location.assign(result.authorizationUrl);
    },
    onSettled: () => setPendingPlatform(null),
  });

  const connect = (platform: Platform) => {
    setPendingPlatform(platform);
    mutation.mutate(platform);
  };

  return { connect, pendingPlatform, isError: mutation.isError };
}
