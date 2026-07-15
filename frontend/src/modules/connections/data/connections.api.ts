import { apiClient } from '@/shared/data/api-client';

import type {
  Connection,
  ConnectionList,
  Platform,
  StartConnectionResult,
} from './connections.types';

const BASE = '/api/v1/connections';

export const connectionsApi = {
  start: (platform: Platform) => apiClient.post<StartConnectionResult>(`${BASE}/${platform}/start`),

  // Narrowed to the items: unlike the paged endpoints, this collection envelope
  // carries no other fields, so unwrapping it here discards nothing.
  list: async (): Promise<Connection[]> => {
    const { items } = await apiClient.get<ConnectionList>(BASE);
    return items;
  },

  disconnect: (id: string) => apiClient.delete<void>(`${BASE}/${id}`),
};
