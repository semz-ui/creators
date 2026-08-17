import { AgentLoop } from '@modules/agent/application/agent-loop.service';
import { DeleteConversation } from '@modules/agent/application/delete-conversation.usecase';
import { GetConversation } from '@modules/agent/application/get-conversation.usecase';
import { ListConversations } from '@modules/agent/application/list-conversations.usecase';
import { ResolveAgentAction } from '@modules/agent/application/resolve-agent-action.usecase';
import { RunAgentTurn } from '@modules/agent/application/run-agent-turn.usecase';
import {
  AgentModelError,
  ConversationNotFoundError,
  PendingActionMismatchError,
  PendingActionRequiredError,
} from '@modules/agent/domain/agent.errors';
import { Conversation, type ConversationSnapshot } from '@modules/agent/domain/conversation.entity';
import type { IAgentModel } from '@modules/agent/domain/ports/agent-model';
import type {
  ConversationPage,
  IConversationRepository,
} from '@modules/agent/domain/ports/conversation-repository';

import { FakeAgentModel, FakeTool, FakeToolRegistry, textTurn, toolTurn } from './fakes';

/**
 * Stores detached snapshots rather than the live entity, the way a real
 * repository does. Holding the reference would make every in-memory mutation
 * appear "stored" whether or not `save` was ever called — which quietly
 * defeats any test about what survives a failure.
 */
class InMemoryConversations implements IConversationRepository {
  readonly store = new Map<string, ConversationSnapshot>();

  async save(conversation: Conversation): Promise<void> {
    this.store.set(conversation.id, structuredClone(conversation.toSnapshot()));
    conversation.markPersisted();
  }

  // Deleted conversations are filtered out here exactly as the Mongo
  // repository does, so use cases can never see one through this fake either.
  async findById(id: string): Promise<Conversation | null> {
    const snapshot = this.store.get(id);
    if (!snapshot || snapshot.isDeleted) return null;
    return Conversation.fromSnapshot(structuredClone(snapshot));
  }

  async findByOwner(ownerId: string): Promise<ConversationPage> {
    const items = [...this.store.values()]
      .filter((snapshot) => snapshot.ownerId === ownerId && !snapshot.isDeleted)
      .map((snapshot) => Conversation.fromSnapshot(structuredClone(snapshot)));
    return { items, total: items.length };
  }
}

function build(turns: ConstructorParameters<typeof FakeAgentModel>[0], tools: FakeTool[]) {
  const conversations = new InMemoryConversations();
  const registry = new FakeToolRegistry(tools);
  const loop = new AgentLoop(new FakeAgentModel(turns), registry, {
    maxIterations: 8,
    maxHistoryMessages: 40,
  });
  return {
    conversations,
    runTurn: new RunAgentTurn(conversations, loop),
    resolve: new ResolveAgentAction(conversations, registry, loop),
    remove: new DeleteConversation(conversations),
    list: new ListConversations(conversations),
    get: new GetConversation(conversations),
  };
}

describe('RunAgentTurn', () => {
  it('creates, runs and persists a new conversation', async () => {
    const { runTurn, conversations } = build([textTurn('Hi')], []);

    const result = await runTurn.execute('user-1', { message: 'hello there' });

    expect(result.messages).toHaveLength(2);
    expect(result.title).toBe('hello there');
    expect(conversations.store.size).toBe(1);
  });

  it('hides another user’s conversation behind a not-found error', async () => {
    const { runTurn } = build([textTurn('Hi')], []);
    const created = await runTurn.execute('user-1', { message: 'hello' });

    await expect(
      runTurn.execute('user-2', { conversationId: created.id, message: 'hi' }),
    ).rejects.toBeInstanceOf(ConversationNotFoundError);
  });

  it('refuses a new turn while an action is awaiting confirmation', async () => {
    const publish = new FakeTool('publish_video', { requiresConfirmation: true });
    const { runTurn } = build([toolTurn({ id: 'call-1', name: 'publish_video' })], [publish]);

    const created = await runTurn.execute('user-1', { message: 'publish it' });
    expect(created.pendingAction).not.toBeNull();

    await expect(
      runTurn.execute('user-1', { conversationId: created.id, message: 'actually wait' }),
    ).rejects.toBeInstanceOf(PendingActionRequiredError);
  });
});

describe('ResolveAgentAction', () => {
  const publishTurn = toolTurn({
    id: 'call-1',
    name: 'publish_video',
    input: { videoId: 'v1', platforms: ['tiktok'] },
  });

  it('executes the tool on approval and resumes the conversation', async () => {
    const publish = new FakeTool('publish_video', {
      requiresConfirmation: true,
      result: '{"publication":{"id":"p1"}}',
    });
    const { runTurn, resolve } = build([publishTurn, textTurn('Posted.')], [publish]);
    const created = await runTurn.execute('user-1', { message: 'publish it' });

    const result = await resolve.execute('user-1', {
      conversationId: created.id,
      toolUseId: 'call-1',
      decision: 'approve',
    });

    expect(publish.calls).toHaveLength(1);
    expect(publish.calls[0]?.input).toEqual({ videoId: 'v1', platforms: ['tiktok'] });
    expect(result.pendingAction).toBeNull();
    expect(result.messages[result.messages.length - 1]?.text).toBe('Posted.');
  });

  it('records a declined result without executing the tool', async () => {
    const publish = new FakeTool('publish_video', { requiresConfirmation: true });
    const { runTurn, resolve } = build([publishTurn, textTurn('No problem.')], [publish]);
    const created = await runTurn.execute('user-1', { message: 'publish it' });

    const result = await resolve.execute('user-1', {
      conversationId: created.id,
      toolUseId: 'call-1',
      decision: 'reject',
    });

    expect(publish.calls).toHaveLength(0);
    expect(result.pendingAction).toBeNull();
    const declined = result.messages.find((message) =>
      message.toolResults.some((toolResult) => toolResult.toolUseId === 'call-1'),
    );
    expect(declined?.toolResults[0]).toMatchObject({ isError: true });
    expect(declined?.toolResults[0]?.content).toContain('declined');
  });

  it('persists the cleared action before resuming, so a failed resume cannot publish twice', async () => {
    const publish = new FakeTool('publish_video', { requiresConfirmation: true });
    const conversations = new InMemoryConversations();
    const registry = new FakeToolRegistry([publish]);

    // Pauses for confirmation on the first turn, then fails when it resumes —
    // the shape of a 502/429 out of the model after the post already went out.
    let turns = 0;
    const model: IAgentModel = {
      complete: async () => {
        turns += 1;
        if (turns === 1) return publishTurn;
        throw new AgentModelError();
      },
    };
    const loop = new AgentLoop(model, registry, { maxIterations: 8, maxHistoryMessages: 40 });
    const runTurn = new RunAgentTurn(conversations, loop);
    const resolve = new ResolveAgentAction(conversations, registry, loop);

    const created = await runTurn.execute('user-1', { message: 'publish it' });
    const approve = {
      conversationId: created.id,
      toolUseId: 'call-1',
      decision: 'approve' as const,
    };

    await expect(resolve.execute('user-1', approve)).rejects.toBeInstanceOf(AgentModelError);
    expect(publish.calls).toHaveLength(1);

    // The stored conversation is already past the confirmation, so the client's
    // retry is refused rather than posting a second time.
    expect((await conversations.findById(created.id))?.pendingAction).toBeNull();
    await expect(resolve.execute('user-1', approve)).rejects.toBeInstanceOf(
      PendingActionMismatchError,
    );
    expect(publish.calls).toHaveLength(1);
  });

  it('rejects a decision that does not match the pending action', async () => {
    const publish = new FakeTool('publish_video', { requiresConfirmation: true });
    const { runTurn, resolve } = build([publishTurn, textTurn('ok')], [publish]);
    const created = await runTurn.execute('user-1', { message: 'publish it' });

    await expect(
      resolve.execute('user-1', {
        conversationId: created.id,
        toolUseId: 'some-other-id',
        decision: 'approve',
      }),
    ).rejects.toBeInstanceOf(PendingActionMismatchError);
  });

  it('never exposes the model’s reasoning blocks to clients', async () => {
    const { runTurn } = build(
      [
        {
          content: [
            { type: 'thinking', thinking: 'secret reasoning', signature: 'sig-1' },
            { type: 'text', text: 'Done.' },
          ],
          stopReason: 'end_turn',
          usage: { inputTokens: 1, outputTokens: 1 },
        },
      ],
      [],
    );

    const result = await runTurn.execute('user-1', { message: 'hi' });

    expect(JSON.stringify(result)).not.toContain('secret reasoning');
    expect(JSON.stringify(result)).not.toContain('sig-1');
    expect(result.messages[1]?.text).toBe('Done.');
  });
});

describe('DeleteConversation', () => {
  it('marks the conversation deleted instead of erasing the transcript', async () => {
    const { runTurn, remove, conversations } = build([textTurn('Hi')], []);
    const created = await runTurn.execute('user-1', { message: 'hello there' });

    await remove.execute('user-1', created.id);

    // Still on disk — the transcript records real, billed side effects.
    const stored = conversations.store.get(created.id);
    expect(stored?.isDeleted).toBe(true);
    expect(stored?.messages).toHaveLength(2);
  });

  it('takes it out of the history and makes it unreadable', async () => {
    const { runTurn, remove, list, get } = build([textTurn('Hi')], []);
    const created = await runTurn.execute('user-1', { message: 'hello there' });

    await remove.execute('user-1', created.id);

    await expect(list.execute('user-1', { page: 1, limit: 30 })).resolves.toMatchObject({
      items: [],
      total: 0,
    });
    await expect(get.execute('user-1', created.id)).rejects.toBeInstanceOf(
      ConversationNotFoundError,
    );
  });

  it('hides another user’s conversation behind a not-found error', async () => {
    const { runTurn, remove, conversations } = build([textTurn('Hi')], []);
    const created = await runTurn.execute('user-1', { message: 'hello' });

    await expect(remove.execute('user-2', created.id)).rejects.toBeInstanceOf(
      ConversationNotFoundError,
    );
    expect(conversations.store.get(created.id)?.isDeleted).toBe(false);
  });

  it('is not repeatable — a second delete finds nothing', async () => {
    const { runTurn, remove } = build([textTurn('Hi')], []);
    const created = await runTurn.execute('user-1', { message: 'hello' });

    await remove.execute('user-1', created.id);

    await expect(remove.execute('user-1', created.id)).rejects.toBeInstanceOf(
      ConversationNotFoundError,
    );
  });

  it('lets the user abandon a conversation paused on a confirmation', async () => {
    const publish = new FakeTool('publish_video', { requiresConfirmation: true });
    const { runTurn, remove, conversations } = build(
      [toolTurn({ id: 'call-9', name: 'publish_video', input: { videoId: 'v1' } })],
      [publish],
    );
    const created = await runTurn.execute('user-1', { message: 'post it' });
    expect(created.pendingAction).not.toBeNull();

    await remove.execute('user-1', created.id);

    // Deleting is a way to decline: the tool never ran, and the paused action
    // is cleared rather than left dangling on a hidden conversation.
    expect(publish.calls).toHaveLength(0);
    expect(conversations.store.get(created.id)?.pendingAction).toBeNull();
  });
});
