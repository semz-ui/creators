import { useQuery } from '@tanstack/react-query';

import { connectionsApi } from '../data/connections.api';
import { connectionKeys } from '../data/query-keys';

/** The user's linked accounts. */
export function useConnections() {
  return useQuery({
    queryKey: connectionKeys.list,
    queryFn: connectionsApi.list,
  });
}
