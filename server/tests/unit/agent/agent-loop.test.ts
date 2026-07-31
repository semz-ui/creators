import { AgentLoop, historyWindow } from '@modules/agent/application/agent-loop.service';
import type { AgentMessage } from '@modules/agent/domain/agent-message';
import { Conversation } from '@modules/agent/domain/conversation.entity';
import { InsufficientCreditsError } from '@modules/billing/domain/billing.errors';

import { FakeAgentModel, FakeTool, FakeToolRegistry, textTurn, toolTurn } from './fakes';

const CONTEXT = { userId: 'user-1', conversationId: 'conv-1' };

type ScriptedTurns = ConstructorParameters<typeof FakeAgentModel>[0];

function buildLoop(turns: ScriptedTurns, tools: FakeTool[], maxIterations = 8) {
  const model = new FakeAgentModel(turns);
  const registry = new FakeToolRegistry(tools);
  const loop = new AgentLoop(model, registry, { maxIterations, maxHistoryMessages: 40 });
  return { model, loop };
}

function startConversation(message = 'hello'): Conversation {
  const conversation = Conversation.create({ ownerId: 'user-1' });
  conversation.appendUser(message);
  return conversation;
}

describe('AgentLoop', () => {
  it('appends the assistant reply and stops when no tool is called', async () => {
    const { loop } = buildLoop([textTurn('Hi there')], []);
    const conversation = startConversation();

    await loop.run(conversation, CONTEXT);

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[1]?.role).toBe('assistant');
    expect(conversation.pendingAction).toBeNull();
  });

  it('executes a tool, feeds the result back, and continues', async () => {
    const tool = new FakeTool('list_videos', { result: '{"videos":[]}' });
    const { loop, model } = buildLoop(
      [toolTurn({ id: 'call-1', name: 'list_videos' }), textTurn('You have no videos yet.')],
      [tool],
    );
    const conversation = startConversation('what videos do I have');

    await loop.run(conversation, CONTEXT);

    expect(tool.calls).toHaveLength(1);
    expect(tool.calls[0]?.context).toEqual(CONTEXT);
    // user, assistant(tool_use), user(tool_result), assistant(text)
    expect(conversation.messages).toHaveLength(4);
    expect(conversation.messages[2]?.content[0]).toMatchObject({
      type: 'tool_result',
      toolUseId: 'call-1',
      isError: false,
    });
    // The second request replays the tool result.
    expect(model.requests).toHaveLength(2);
    expect(model.requests[1]?.messages).toHaveLength(3);
  });

  it('pauses without executing a tool that requires confirmation', async () => {
    const publish = new FakeTool('publish_video', { requiresConfirmation: true });
    const { loop } = buildLoop(
      [toolTurn({ id: 'call-1', name: 'publish_video', input: { videoId: 'v1' } })],
      [publish],
    );
    const conversation = startConversation('post it to tiktok');

    await loop.run(conversation, CONTEXT);

    expect(publish.calls).toHaveLength(0);
    expect(conversation.pendingAction).toMatchObject({
      toolUseId: 'call-1',
      toolName: 'publish_video',
      input: { videoId: 'v1' },
      summary: 'summary of publish_video',
    });
    // The tool_use block is deliberately left unanswered.
    const last = conversation.messages[conversation.messages.length - 1];
    expect(last?.role).toBe('assistant');
    expect(last?.content[0]).toMatchObject({ type: 'tool_use' });
  });

  it('refuses a confirmation tool called alongside siblings instead of pausing', async () => {
    const publish = new FakeTool('publish_video', { requiresConfirmation: true });
    const list = new FakeTool('list_videos');
    const { loop } = buildLoop(
      [
        toolTurn({ id: 'call-1', name: 'list_videos' }, { id: 'call-2', name: 'publish_video' }),
        textTurn('Let me try that again.'),
      ],
      [publish, list],
    );
    const conversation = startConversation();

    await loop.run(conversation, CONTEXT);

    expect(publish.calls).toHaveLength(0);
    expect(conversation.pendingAction).toBeNull();
    const results = conversation.messages[2]?.content ?? [];
    expect(results).toHaveLength(2);
    expect(results[1]).toMatchObject({ toolUseId: 'call-2', isError: true });
  });

  it('answers an unknown tool with an error result rather than throwing', async () => {
    const { loop } = buildLoop(
      [toolTurn({ id: 'call-1', name: 'teleport' }), textTurn('Sorry about that.')],
      [],
    );
    const conversation = startConversation();

    await loop.run(conversation, CONTEXT);

    expect(conversation.messages[2]?.content[0]).toMatchObject({
      type: 'tool_result',
      isError: true,
      content: 'Unknown tool "teleport".',
    });
  });

  it('turns an expected domain failure into an error result the model can read', async () => {
    const tool = new FakeTool('generate_video', { throws: new InsufficientCreditsError() });
    const { loop } = buildLoop(
      [toolTurn({ id: 'call-1', name: 'generate_video' }), textTurn('You are out of credits.')],
      [tool],
    );
    const conversation = startConversation('make a video');

    await loop.run(conversation, CONTEXT);

    const result = conversation.messages[2]?.content[0];
    expect(result).toMatchObject({ type: 'tool_result', isError: true });
    expect((result as { content: string }).content).toContain('credit');
  });

  it('hides unexpected failures behind a generic error result', async () => {
    const tool = new FakeTool('list_videos', { throws: new Error('mongo socket closed') });
    const { loop } = buildLoop(
      [toolTurn({ id: 'call-1', name: 'list_videos' }), textTurn('Something went wrong.')],
      [tool],
    );
    const conversation = startConversation();

    await loop.run(conversation, CONTEXT);

    const result = conversation.messages[2]?.content[0] as { content: string; isError: boolean };
    expect(result.isError).toBe(true);
    expect(result.content).not.toContain('mongo');
  });

  it('allows only one generation per turn', async () => {
    const generate = new FakeTool('generate_video');
    const { loop } = buildLoop(
      [
        toolTurn({ id: 'call-1', name: 'generate_video' }),
        toolTurn({ id: 'call-2', name: 'generate_video' }),
        textTurn('Ask me before I make another.'),
      ],
      [generate],
    );
    const conversation = startConversation('make two videos');

    await loop.run(conversation, CONTEXT);

    expect(generate.calls).toHaveLength(1);
    expect(conversation.messages[4]?.content[0]).toMatchObject({
      toolUseId: 'call-2',
      isError: true,
    });
  });

  it('stops with an explanatory message when it runs out of iterations', async () => {
    const tool = new FakeTool('list_videos');
    const { loop } = buildLoop([toolTurn({ id: 'call-1', name: 'list_videos' })], [tool], 2);
    const conversation = startConversation();

    await loop.run(conversation, CONTEXT);

    const last = conversation.messages[conversation.messages.length - 1];
    expect(last?.role).toBe('assistant');
    expect((last?.content[0] as { text: string }).text).toContain('more steps than expected');
  });
});

describe('historyWindow', () => {
  const userMessage = (text: string): AgentMessage => ({
    role: 'user',
    content: [{ type: 'text', text }],
  });
  const assistantToolUse = (id: string): AgentMessage => ({
    role: 'assistant',
    content: [{ type: 'tool_use', id, name: 'list_videos', input: {} }],
  });
  const toolResult = (id: string): AgentMessage => ({
    role: 'user',
    content: [{ type: 'tool_result', toolUseId: id, content: '{}', isError: false }],
  });

  it('returns everything when the history is short enough', () => {
    const messages = [userMessage('a'), assistantToolUse('1'), toolResult('1')];
    expect(historyWindow(messages, 40)).toEqual(messages);
  });

  it('never starts on a dangling tool result', () => {
    const messages = [
      userMessage('old'),
      assistantToolUse('1'),
      toolResult('1'),
      userMessage('new'),
      assistantToolUse('2'),
      toolResult('2'),
    ];

    // A naive tail of 4 would start at the tool_result for call 1.
    const window = historyWindow(messages, 4);

    expect(window[0]).toEqual(userMessage('new'));
    expect(window).toHaveLength(3);
  });

  it('falls back to the full history when the window has no clean start', () => {
    const messages = [userMessage('a'), assistantToolUse('1'), toolResult('1')];
    expect(historyWindow(messages, 1)).toEqual(messages);
  });
});
