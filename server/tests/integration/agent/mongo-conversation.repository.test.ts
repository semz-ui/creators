import { MongoMemoryServer } from 'mongodb-memory-server';

import { ConversationConflictError } from '@modules/agent/domain/agent.errors';
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

  it('rejects a write from a stale copy instead of clobbering the winner', async () => {
    const conversation = Conversation.create({ ownerId: 'user-1' });
    conversation.appendUser('first');
    await repo.save(conversation);

    // Two concurrent turns load the same revision.
    const first = (await repo.findById(conversation.id)) as Conversation;
    const second = (await repo.findById(conversation.id)) as Conversation;

    first.appendAssistant([{ type: 'text', text: 'from the first turn' }]);
    await repo.save(first);

    second.appendAssistant([{ type: 'text', text: 'from the second turn' }]);
    await expect(repo.save(second)).rejects.toBeInstanceOf(ConversationConflictError);

    const stored = await repo.findById(conversation.id);
    expect(stored?.messages).toHaveLength(2);
    expect(stored?.messages[1]?.content[0]).toMatchObject({ text: 'from the first turn' });
  });

  it('allows consecutive saves from the same instance', async () => {
    // ResolveAgentAction saves twice in one request — once to durably clear the
    // pending action, once after the resumed turn.
    const conversation = Conversation.create({ ownerId: 'user-1' });
    conversation.appendUser('hello');
    await repo.save(conversation);

    conversation.appendAssistant([{ type: 'text', text: 'hi' }]);
    await expect(repo.save(conversation)).resolves.toBeUndefined();

    expect((await repo.findById(conversation.id))?.messages).toHaveLength(2);
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

  it('keeps a soft-deleted conversation on disk but out of every read', async () => {
    const kept = Conversation.create({ ownerId: 'user-1' });
    kept.appendUser('keep me');
    const removed = Conversation.create({ ownerId: 'user-1' });
    removed.appendUser('delete me');
    await Promise.all([repo.save(kept), repo.save(removed)]);

    removed.softDelete();
    await repo.save(removed);

    expect(await repo.findById(removed.id)).toBeNull();
    const page = await repo.findByOwner('user-1', { limit: 10, skip: 0 });
    expect(page.total).toBe(1);
    expect(page.items.map((item) => item.id)).toEqual([kept.id]);

    // The row itself survives — the transcript is evidence of real side effects.
    const raw = await ConversationModel.findById(removed.id).lean().exec();
    expect(raw).not.toBeNull();
    expect(raw?.isDeleted).toBe(true);
    expect(raw?.messages).toHaveLength(1);
  });

  it('treats a document written before the flag existed as live', async () => {
    const conversation = Conversation.create({ ownerId: 'user-1' });
    conversation.appendUser('legacy row');
    await repo.save(conversation);
    // Simulate a document that predates the soft-delete field.
    await ConversationModel.updateOne(
      { _id: conversation.id },
      { $unset: { isDeleted: '' } },
    ).exec();

    expect(await repo.findById(conversation.id)).not.toBeNull();
    expect((await repo.findByOwner('user-1', { limit: 10, skip: 0 })).total).toBe(1);
  });
});
