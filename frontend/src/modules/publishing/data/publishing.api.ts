import { apiClient } from '@/shared/data/api-client';

import type { CreatePublicationInput, Publication, PublicationPage } from './publishing.types';

const BASE = '/api/v1/publications';

export const publishingApi = {
  create: (input: CreatePublicationInput) => apiClient.post<Publication>(BASE, input),

  list: (params: { page: number; limit: number }) =>
    apiClient.get<PublicationPage>(`${BASE}?page=${params.page}&limit=${params.limit}`),

  get: (id: string) => apiClient.get<Publication>(`${BASE}/${id}`),
};
