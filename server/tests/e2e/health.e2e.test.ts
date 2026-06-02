import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '../../src/app';

describe('HTTP app (e2e)', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  it('GET /health returns 200 with liveness payload', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('echoes a provided x-request-id header', async () => {
    const res = await request(app).get('/health').set('x-request-id', 'trace-123');

    expect(res.headers['x-request-id']).toBe('trace-123');
  });

  it('generates an x-request-id when none is provided', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('unknown routes return a 404 error envelope with a requestId', async () => {
    const res = await request(app).post('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('/does-not-exist');
    expect(typeof res.body.error.requestId).toBe('string');
  });

  it('does not leak the x-powered-by header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
