import { apiClient } from '@/shared/data/api-client';

import type { Overview, RefreshResult, VideoAnalytics } from './analytics.types';

const BASE = '/api/v1/analytics';

export const analyticsApi = {
  getOverview: () => apiClient.get<Overview>(`${BASE}/overview`),

  getVideoAnalytics: (videoId: string) =>
    apiClient.get<VideoAnalytics>(`${BASE}/videos/${videoId}`),

  refresh: () => apiClient.post<RefreshResult>(`${BASE}/refresh`),
};
