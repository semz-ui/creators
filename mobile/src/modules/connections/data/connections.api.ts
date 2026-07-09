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

  list: async (): Promise<Connection[]> => {
    const { items } = await apiClient.get<ConnectionList>(BASE);
    return items;
  },

  disconnect: (id: string) => apiClient.delete<void>(`${BASE}/${id}`),
};
