import { http, HttpResponse } from 'msw';

import { env } from '@/shared/config/env';

/**
 * Default MSW handlers for unit/viewmodel tests. Feature modules extend these
 * with `server.use(...)` per test. The base URL matches the API client.
 */
export const handlers = [
  http.get(`${env.apiUrl}/health`, () => HttpResponse.json({ status: 'ok' })),
];
