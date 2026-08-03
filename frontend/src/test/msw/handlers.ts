import { http, HttpResponse } from 'msw';

import { env } from '@/shared/config/env';

import { ok } from './envelope';

/**
 * Default MSW handlers for unit/viewmodel tests. Feature modules extend these
 * with `server.use(...)` per test. The base URL matches the API client.
 */
export const handlers = [
  http.get(`${env.apiUrl}/health`, () => HttpResponse.json({ status: 'ok' })),
  // The create-video form loads this on mount; a default keeps every test that
  // renders the form from tripping MSW's unhandled-request warning.
  http.get(`${env.apiUrl}/api/v1/videos/providers`, () =>
    HttpResponse.json(
      ok({
        providers: [
          { id: 'sora', label: 'Sora', available: true, supportsAudio: true },
          { id: 'kling', label: 'Kling', available: false, supportsAudio: false },
          { id: 'pika', label: 'Pika', available: true, supportsAudio: false },
        ],
      }),
    ),
  ),
];
