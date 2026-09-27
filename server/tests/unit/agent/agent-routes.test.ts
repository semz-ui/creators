import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';

import type { AgentController } from '@modules/agent/presentation/agent.controller';
import { createAgentRouter } from '@modules/agent/presentation/agent.routes';
import { errorHandler } from '@shared/presentation/middleware/error-handler';
import { requestId } from '@shared/presentation/middleware/request-id';

/**
 * Guards the router wiring itself: which routes sit behind the stricter agent
 * rate limiter, and which reject an unauthenticated caller.
 */
describe('createAgentRouter', () => {
  let app: Express;
  let rateLimited: string[];
  let authGuarded: string[];

  beforeEach(() => {
    rateLimited = [];
    authGuarded = [];

    const authGuard: RequestHandler = (req, _res, next) => {
      authGuarded.push(`${req.method} ${req.path}`);
      req.userId = 'user-1';
      next();
    };
    const agentRateLimit: RequestHandler = (req, _res, next) => {
      rateLimited.push(`${req.method} ${req.path}`);
      next();
    };

    const controller = {
      start: async (_req: unknown, res: express.Response) => res.status(201).json({ ok: true }),
      send: async (_req: unknown, res: express.Response) => res.status(200).json({ ok: true }),
      resolve: async (_req: unknown, res: express.Response) => res.status(200).json({ ok: true }),
      get: async (_req: unknown, res: express.Response) => res.status(200).json({ ok: true }),
      list: async (_req: unknown, res: express.Response) => res.status(200).json({ ok: true }),
    } as unknown as AgentController;

    app = express();
    app.use(requestId);
    app.use(express.json());
    app.use('/agent', createAgentRouter(controller, authGuard, agentRateLimit));
    app.use(errorHandler);
  });

  it('rate-limits the routes that run a turn', async () => {
    await request(app).post('/agent/conversations').send({ message: 'hi' }).expect(201);
    await request(app).post('/agent/conversations/c1/messages').send({ message: 'hi' }).expect(200);
    await request(app)
      .post('/agent/conversations/c1/actions/call-1')
      .send({ decision: 'approve' })
      .expect(200);

    expect(rateLimited).toEqual([
      'POST /conversations',
      'POST /conversations/c1/messages',
      'POST /conversations/c1/actions/call-1',
    ]);
  });

  it('does not rate-limit plain reads', async () => {
    await request(app).get('/agent/conversations').expect(200);
    await request(app).get('/agent/conversations/c1').expect(200);

    expect(rateLimited).toEqual([]);
    expect(authGuarded).toHaveLength(2);
  });

  it('rejects a body that fails validation before running anything', async () => {
    await request(app).post('/agent/conversations').send({ message: '' }).expect(422);
    await request(app)
      .post('/agent/conversations/c1/actions/call-1')
      .send({ decision: 'maybe' })
      .expect(422);
  });
});
