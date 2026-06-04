import { apiClient } from '@/shared/data/api-client';

import type { CreateVideoInput, Video, VideoPage } from './video.types';

const BASE = '/api/v1/videos';

export const videoApi = {
  create: (input: CreateVideoInput) => apiClient.post<Video>(BASE, input),

  list: (params: { page: number; limit: number }) =>
    apiClient.get<VideoPage>(`${BASE}?page=${params.page}&limit=${params.limit}`),

  get: (id: string) => apiClient.get<Video>(`${BASE}/${id}`),
};
