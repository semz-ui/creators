import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { ConversationModel } from '@modules/agent/infrastructure/conversation.model';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { ConnectionModel } from '@modules/connections/infrastructure/connection.model';
import { PublicationModel } from '@modules/publishing/infrastructure/publication.model';
import { VideoModel } from '@modules/video/infrastructure/video.model';

import { createApp } from '../../src/app';

const GENERATION_SECRET = 'dev-generation-callback-secret-change-me';

/**
 * Drives the agent end to end against the stub model (no ANTHROPIC_API_KEY is
 * set in tests), covering the whole prompt -> generate -> approve -> publish
 * handshake through real HTTP.
 */
describe('Agent flow (e2e)', () => {
  let mongod: MongoMemoryServer;
  let redisClient: InstanceType<typeof RedisMock>;
  let app: Express;
  let token: string;

  const bearer = () => ({ Authorization: `Bearer ${token}` });

  async function markLatestVideoReady(): Promise<void> {
    const doc = await VideoModel.findOne().sort({ createdAt: -1 }).lean();
    await request(app)
      .post('/api/v1/videos/callbacks/generation')
      .set('x-generation-secret', GENERATION_SECRET)
      .send({ jobRef: doc?.jobRef, status: 'ready', resultUrl: 'https://cdn.reelo.app/v.mp4' })
      .expect(204);
  }

  async function connectTikTok(): Promise<void> {
    const start = await request(app).post('/api/v1/connections/tiktok/start').set(bearer());
    const state = new URL(start.body.data.authorizationUrl).searchParams.get('state');
    await request(app).get('/api/v1/connections/callback').query({ state, code: 'c' });
  }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
    redisClient = new RedisMock();
    app = createApp(buildContainer({ redisClient: redisClient as unknown as Redis }));
    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'agent@reelo.app', password: 'password123' });
    token = registered.body.data.accessToken;
  });

  afterEach(async () => {
    await Promise.all([
      ConversationModel.deleteMany({}),
      VideoModel.deleteMany({}),
      PublicationModel.deleteMany({}),
      // Connections leak between tests otherwise, which would silently let the
      // "no connected account" case publish successfully.
      ConnectionModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await disconnectMongo();
    await mongod.stop();
    redisClient.disconnect();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app).post('/api/v1/agent/conversations').send({ message: 'hi' }).expect(401);
  });

  it('validates the message body', async () => {
    await request(app)
      .post('/api/v1/agent/conversations')
      .set(bearer())
      .send({ message: '   ' })
      .expect(422);
  });

  it('generates a video from a prompt in one turn', async () => {
    const response = await request(app)
      .post('/api/v1/agent/conversations')
      .set(bearer())
      .send({ message: 'make a 15 second neon city clip' })
      .expect(201);

    const { data } = response.body;
    expect(data.pendingAction).toBeNull();

    const call = data.messages
      .flatMap((message: { toolCalls: { name: string }[] }) => message.toolCalls)
      .find((toolCall: { name: string }) => toolCall.name === 'generate_video');
    expect(call).toBeDefined();

    // The tool really created a video, still generating.
    const videos = await VideoModel.find().lean();
    expect(videos).toHaveLength(1);
    expect(videos[0]?.status).toBe('processing');
    expect(videos[0]?.durationSeconds).toBe(15);

    // ...and the agent says so rather than claiming it is ready.
    const reply = data.messages[data.messages.length - 1].text as string;
    expect(reply).toContain('generating');
  });

  it('pauses for confirmation before publishing, then posts on approval', async () => {
    const started = await request(app)
      .post('/api/v1/agent/conversations')
      .set(bearer())
      .send({ message: 'make a 15 second neon city clip' })
      .expect(201);
    const conversationId = started.body.data.id as string;

    await markLatestVideoReady();
    await connectTikTok();

    const asked = await request(app)
      .post(`/api/v1/agent/conversations/${conversationId}/messages`)
      .set(bearer())
      .send({ message: 'post it to tiktok' })
      .expect(200);

    // Paused: nothing published yet.
    const pending = asked.body.data.pendingAction;
    expect(pending).toMatchObject({ toolName: 'publish_video' });
    expect(pending.summary).toContain('tiktok');
    expect(await PublicationModel.countDocuments()).toBe(0);

    // A new turn is refused until the action is resolved.
    await request(app)
      .post(`/api/v1/agent/conversations/${conversationId}/messages`)
      .set(bearer())
      .send({ message: 'actually hold on' })
      .expect(409);

    const approved = await request(app)
      .post(`/api/v1/agent/conversations/${conversationId}/actions/${pending.toolUseId}`)
      .set(bearer())
      .send({ decision: 'approve' })
      .expect(200);

    expect(approved.body.data.pendingAction).toBeNull();
    const publications = await PublicationModel.find().lean();
    expect(publications).toHaveLength(1);
    expect(publications[0]?.targets?.[0]?.platform).toBe('tiktok');
  });

  it('publishes nothing when the user rejects the action', async () => {
    const started = await request(app)
      .post('/api/v1/agent/conversations')
      .set(bearer())
      .send({ message: 'make a 15 second neon city clip' })
      .expect(201);
    const conversationId = started.body.data.id as string;

    await markLatestVideoReady();
    await connectTikTok();

    const asked = await request(app)
      .post(`/api/v1/agent/conversations/${conversationId}/messages`)
      .set(bearer())
      .send({ message: 'post it to tiktok' })
      .expect(200);
    const { toolUseId } = asked.body.data.pendingAction;

    const rejected = await request(app)
      .post(`/api/v1/agent/conversations/${conversationId}/actions/${toolUseId}`)
      .set(bearer())
      .send({ decision: 'reject' })
      .expect(200);

    expect(rejected.body.data.pendingAction).toBeNull();
    expect(await PublicationModel.countDocuments()).toBe(0);
  });

  it('reports a publish failure back to the user instead of erroring', async () => {
    const started = await request(app)
      .post('/api/v1/agent/conversations')
      .set(bearer())
      .send({ message: 'make a 15 second neon city clip' })
      .expect(201);
    const conversationId = started.body.data.id as string;

    // Ready video, but no connected account to post to.
    await markLatestVideoReady();

    const asked = await request(app)
      .post(`/api/v1/agent/conversations/${conversationId}/messages`)
      .set(bearer())
      .send({ message: 'post it to tiktok' })
      .expect(200);

    const approved = await request(app)
      .post(
        `/api/v1/agent/conversations/${conversationId}/actions/${asked.body.data.pendingAction.toolUseId}`,
      )
      .set(bearer())
      .send({ decision: 'approve' })
      .expect(200);

    const results = approved.body.data.messages.flatMap(
      (message: { toolResults: { isError: boolean; content: string }[] }) => message.toolResults,
    );
    expect(results.some((result: { isError: boolean }) => result.isError)).toBe(true);
    expect(await PublicationModel.countDocuments()).toBe(0);
  });

  it('lists and fetches conversations, and hides other users’ ones', async () => {
    const created = await request(app)
      .post('/api/v1/agent/conversations')
      .set(bearer())
      .send({ message: 'what can you do' })
      .expect(201);
    const id = created.body.data.id as string;

    const fetched = await request(app)
      .get(`/api/v1/agent/conversations/${id}`)
      .set(bearer())
      .expect(200);
    expect(fetched.body.data.id).toBe(id);
    // Reasoning blocks and signatures never reach the wire.
    expect(JSON.stringify(fetched.body)).not.toContain('signature');

    const listed = await request(app).get('/api/v1/agent/conversations').set(bearer()).expect(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].id).toBe(id);

    const other = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'other@reelo.app', password: 'password123' });
    await request(app)
      .get(`/api/v1/agent/conversations/${id}`)
      .set({ Authorization: `Bearer ${other.body.data.accessToken}` })
      .expect(404);
  });
});
