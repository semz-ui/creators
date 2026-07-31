import { AgentLoop } from '@modules/agent/application/agent-loop.service';
import { ResolveAgentAction } from '@modules/agent/application/resolve-agent-action.usecase';
import { RunAgentTurn } from '@modules/agent/application/run-agent-turn.usecase';
import {
  ConversationNotFoundError,
  PendingActionMismatchError,
  PendingActionRequiredError,
} from '@modules/agent/domain/agent.errors';
import type { Conversation } from '@modules/agent/domain/conversation.entity';
import type {
  ConversationPage,
  IConversationRepository,
} from '@modules/agent/domain/ports/conversation-repository';

import { FakeAgentModel, FakeTool, FakeToolRegistry, textTurn, toolTurn } from './fakes';

class InMemoryConversations implements IConversationRepository {
  readonly store = new Map<string, Conversation>();

  async save(conversation: Conversation): Promise<void> {
    this.store.set(conversation.id, conversation);
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.store.get(id) ?? null;
  }

  async findByOwner(ownerId: string): Promise<ConversationPage> {
    const items = [...this.store.values()].filter((c) => c.ownerId === ownerId);
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
