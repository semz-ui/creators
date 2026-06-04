import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { connectionsApi } from '../data/connections.api';
import { connectionKeys } from '../data/query-keys';

/** Removes a linked account and refreshes the list. */
export function useDisconnect() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (id: string) => connectionsApi.disconnect(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionKeys.all }),
    onSettled: () => setPendingId(null),
  });

  const disconnect = (id: string) => {
    setPendingId(id);
    mutation.mutate(id);
  };

  return { disconnect, pendingId };
}
