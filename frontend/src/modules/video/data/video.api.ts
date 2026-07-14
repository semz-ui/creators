import { apiClient } from '@/shared/data/api-client';
import { HttpError } from '@/shared/data/http-error';
import { env } from '@/shared/config/env';

import type { CreateVideoInput, UploadVideoInput, Video, VideoPage } from './video.types';

const BASE = '/api/v1/videos';

export const videoApi = {
  create: (input: CreateVideoInput) => apiClient.post<Video>(BASE, input),

  upload: (input: UploadVideoInput, onProgress?: (pct: number) => void): Promise<Video> =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('title', input.title);
      form.append('file', input.file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${env.apiUrl}${BASE}/upload`);

      const token = apiClient.getAuthToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText) as unknown;
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve((data as { success: true; data: Video }).data);
          } else {
            const body = data as { error?: { code?: string; message?: string } };
            reject(
              new HttpError(
                xhr.status,
                body.error?.code ?? 'ERROR',
                body.error?.message ?? 'Upload failed',
              ),
            );
          }
        } catch {
          reject(new HttpError(xhr.status, 'ERROR', 'Upload failed'));
        }
      };

      xhr.onerror = () => reject(new HttpError(0, 'NETWORK_ERROR', 'Network error during upload'));
      xhr.send(form);
    }),

  list: (params: { page: number; limit: number }) =>
    apiClient.get<VideoPage>(`${BASE}?page=${params.page}&limit=${params.limit}`),

  get: (id: string) => apiClient.get<Video>(`${BASE}/${id}`),
};
