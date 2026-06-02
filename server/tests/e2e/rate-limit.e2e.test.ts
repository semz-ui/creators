import express, { type Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import request from 'supertest';

import { RedisRateLimiter } from '@shared/infrastructure/rate-limit/redis-rate-limiter';
import { errorHandler } from '@shared/presentation/middleware/error-handler';
import { createRateLimit } from '@shared/presentation/middleware/rate-limit';
import { requestId } from '@shared/presentation/middleware/request-id';

function buildApp(client: Redis): Express {
  const app = express();
  app.use(requestId);
  app.use(createRateLimit(new RedisRateLimiter(client, 2, 60), { name: 'test' }));
  app.get('/ping', (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('Rate limiting (e2e)', () => {
  let client: InstanceType<typeof RedisMock>;
  let app: Express;

  beforeEach(() => {
    client = new RedisMock();
    app = buildApp(client as unknown as Redis);
  });

  afterEach(() => {
    client.disconnect();
  });

  it('allows requests up to the limit then returns 429', async () => {
    const first = await request(app).get('/ping');
    expect(first.status).toBe(200);
    expect(first.headers['ratelimit-limit']).toBe('2');
    expect(first.headers['ratelimit-remaining']).toBe('1');

    const second = await request(app).get('/ping');
    expect(second.status).toBe(200);
    expect(second.headers['ratelimit-remaining']).toBe('0');

    const third = await request(app).get('/ping');
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(third.headers['retry-after']).toBeDefined();
  });
});
