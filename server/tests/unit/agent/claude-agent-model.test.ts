import Anthropic from '@anthropic-ai/sdk';

import { AgentModelError } from '@modules/agent/domain/agent.errors';
import { ClaudeAgentModel } from '@modules/agent/infrastructure/claude-agent-model';
import { TooManyRequestsError } from '@shared/domain/errors';

type CreateMock = jest.Mock<Promise<unknown>, [Record<string, unknown>]>;

function buildModel(): { model: ClaudeAgentModel; create: CreateMock } {
  const model = new ClaudeAgentModel({
    apiKey: 'test-key',
    model: 'claude-sonnet-5',
    maxTokens: 4096,
    effort: 'medium',
  });
  const create: CreateMock = jest.fn();
  // Replace the SDK call while leaving the real error classes intact, so the
  // `instanceof` checks in the adapter are still exercised.
  (model as unknown as { client: { messages: { create: CreateMock } } }).client.messages.create =
    create;
  return { model, create };
}

function response(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    content: [],
    stop_reason: 'end_turn',
    usage: { input_tokens: 10, output_tokens: 5 },
    ...overrides,
  };
}

const REQUEST = {
  system: 'be helpful',
  tools: [
    { name: 'list_videos', description: 'list them', inputSchema: { type: 'object' as const } },
  ],
  messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'hi' }] }],
};

describe('ClaudeAgentModel', () => {
  it('sends one-tool-at-a-time settings and a cache breakpoint', async () => {
    const { model, create } = buildModel();
    create.mockResolvedValue(response({ content: [{ type: 'text', text: 'hello' }] }));

    await model.complete(REQUEST);

    const params = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-sonnet-5');
    expect(params.output_config).toEqual({ effort: 'medium' });
    expect(params.cache_control).toEqual({ type: 'ephemeral' });
    expect(params.tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true });
    // `thinking` is deliberately unset — Sonnet 5 runs adaptive by default and
    // disabling it makes the model less willing to call tools.
    expect(params.thinking).toBeUndefined();
    expect(params.tools).toEqual([
      { name: 'list_videos', description: 'list them', input_schema: { type: 'object' } },
    ]);
  });

  it('round-trips every block type in both directions', async () => {
    const { model, create } = buildModel();
    create.mockResolvedValue(
      response({
        content: [
          { type: 'thinking', thinking: 'because', signature: 'sig-1' },
          { type: 'text', text: 'calling a tool' },
          { type: 'tool_use', id: 'call-1', name: 'list_videos', input: { limit: 5 } },
        ],
        stop_reason: 'tool_use',
      }),
    );

    const result = await model.complete({
      ...REQUEST,
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'hi' }] },
        {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: '', signature: 'sig-0' },
            { type: 'tool_use', id: 'call-0', name: 'list_videos', input: {} },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'tool_result', toolUseId: 'call-0', content: '{}', isError: false }],
        },
      ],
    });

    // Outbound mapping keeps the reasoning block verbatim (the API rejects edits).
    const params = create.mock.calls[0]?.[0] as { messages: { content: unknown[] }[] };
    expect(params.messages[1]?.content[0]).toEqual({
      type: 'thinking',
      thinking: '',
      signature: 'sig-0',
    });
    expect(params.messages[2]?.content[0]).toEqual({
      type: 'tool_result',
      tool_use_id: 'call-0',
      content: '{}',
      is_error: false,
    });

    // Inbound mapping.
    expect(result.stopReason).toBe('tool_use');
    expect(result.content).toEqual([
      { type: 'thinking', thinking: 'because', signature: 'sig-1' },
      { type: 'text', text: 'calling a tool' },
      { type: 'tool_use', id: 'call-1', name: 'list_videos', input: { limit: 5 } },
    ]);
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it('treats stop_sequence as the end of the turn', async () => {
    const { model, create } = buildModel();
    create.mockResolvedValue(
      response({ content: [{ type: 'text', text: 'done' }], stop_reason: 'stop_sequence' }),
    );

    await expect(model.complete(REQUEST)).resolves.toMatchObject({ stopReason: 'end_turn' });
  });

  it('substitutes readable text for an empty refusal', async () => {
    const { model, create } = buildModel();
    create.mockResolvedValue(response({ content: [], stop_reason: 'refusal' }));

    const result = await model.complete(REQUEST);

    expect(result.stopReason).toBe('refusal');
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({ type: 'text' });
  });

  it('drops a half-written tool call when the response was truncated', async () => {
    const { model, create } = buildModel();
    create.mockResolvedValue(
      response({
        content: [{ type: 'tool_use', id: 'call-1', name: 'list_videos', input: {} }],
        stop_reason: 'max_tokens',
      }),
    );

    const result = await model.complete(REQUEST);

    // A tool_use with no result would 400 the next request.
    expect(result.content.some((block) => block.type === 'tool_use')).toBe(false);
    expect(result.content[0]).toMatchObject({ type: 'text' });
  });

  it('maps a rate limit to the shared 429 error', async () => {
    const { model, create } = buildModel();
    create.mockRejectedValue(
      new Anthropic.RateLimitError(429, undefined, 'slow down', new Headers()),
    );

    await expect(model.complete(REQUEST)).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it('maps any other upstream failure to a 502', async () => {
    const { model, create } = buildModel();
    create.mockRejectedValue(new Error('socket hang up'));

    await expect(model.complete(REQUEST)).rejects.toBeInstanceOf(AgentModelError);
  });
});
