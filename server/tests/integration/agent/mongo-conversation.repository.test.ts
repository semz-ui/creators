import { MongoMemoryServer } from 'mongodb-memory-server';

import { Conversation } from '@modules/agent/domain/conversation.entity';
import { ConversationModel } from '@modules/agent/infrastructure/conversation.model';
import { MongoConversationRepository } from '@modules/agent/infrastructure/mongo-conversation.repository';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';

describe('MongoConversationRepository (integration)', () => {
  let mongod: MongoMemoryServer;
  const repo = new MongoConversationRepository();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
  });

  afterEach(async () => {
    await ConversationModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  it('round-trips a transcript containing every block type', async () => {
    const conversation = Conversation.create({ ownerId: 'user-1' });
    conversation.appendUser('make a neon city clip');
    conversation.appendAssistant([
      // Empty thinking text with a signature is what Sonnet 5 returns by
      // default; it must survive persistence to be replayable.
      { type: 'thinking', thinking: '', signature: 'sig-1' },
      { type: 'text', text: 'Starting that now.' },
      { type: 'tool_use', id: 'call-1', name: 'generate_video', input: { durationSeconds: 15 } },
    ]);
    conversation.appendToolResults([
      {
        type: 'tool_result',
        toolUseId: 'call-1',
        content: '{"video":{"id":"v1"}}',
        isError: false,
      },
    ]);

    await repo.save(conversation);
    const found = await repo.findById(conversation.id);

    expect(found).not.toBeNull();
    expect(found?.messages).toEqual(conversation.messages);
    expect(found?.title).toBe('make a neon city clip');
  });

  it('persists and clears a pending action', async () => {
    const conversation = Conversation.create({ ownerId: 'user-1' });
    conversation.appendUser('publish it');
    conversation.awaitConfirmation({
      toolUseId: 'call-9',
      toolName: 'publish_video',
      input: { videoId: 'v1', platforms: ['tiktok'] },
      summary: 'Publish video v1 to tiktok',
      createdAt: new Date(),
    });
    await repo.save(conversation);

    const paused = await repo.findById(conversation.id);
    expect(paused?.pendingAction).toMatchObject({
      toolUseId: 'call-9',
      toolName: 'publish_video',
      input: { videoId: 'v1', platforms: ['tiktok'] },
    });

    paused?.resolvePending('call-9');
    await repo.save(paused as Conversation);

    expect((await repo.findById(conversation.id))?.pendingAction).toBeNull();
  });

  it('lists an owner’s conversations most-recently-active first', async () => {
    const older = Conversation.create({ ownerId: 'user-1' });
    older.appendUser('first');
    // Ordering is by `updatedAt`, which is stamped when the message is
    // appended — so the gap has to be here, not around the saves.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = Conversation.create({ ownerId: 'user-1' });
    newer.appendUser('second');
    const other = Conversation.create({ ownerId: 'user-2' });
    other.appendUser('not mine');

    await Promise.all([repo.save(older), repo.save(newer), repo.save(other)]);

    const page = await repo.findByOwner('user-1', { limit: 10, skip: 0 });

    expect(page.total).toBe(2);
    expect(page.items.map((item) => item.id)).toEqual([newer.id, older.id]);
  });
});
