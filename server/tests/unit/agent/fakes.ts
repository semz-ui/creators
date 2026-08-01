import type { AgentContentBlock } from '@modules/agent/domain/agent-message';
import type {
  AgentTurnRequest,
  AgentTurnResponse,
  IAgentModel,
} from '@modules/agent/domain/ports/agent-model';
import type {
  AgentToolContext,
  AgentToolOutcome,
  IAgentTool,
  IAgentToolRegistry,
} from '@modules/agent/domain/ports/agent-tool';

/** Model that replays a scripted list of turns, recording what it was asked. */
export class FakeAgentModel implements IAgentModel {
  readonly requests: AgentTurnRequest[] = [];
  private index = 0;

  constructor(private readonly turns: AgentTurnResponse[]) {}

  async complete(request: AgentTurnRequest): Promise<AgentTurnResponse> {
    this.requests.push(request);
    const turn = this.turns[this.index] ?? this.turns[this.turns.length - 1];
    this.index += 1;
    if (!turn) throw new Error('FakeAgentModel has no turns scripted');
    return turn;
  }
}

export function textTurn(text: string): AgentTurnResponse {
  return {
    content: [{ type: 'text', text }],
    stopReason: 'end_turn',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

export function toolTurn(
  ...calls: { id: string; name: string; input?: unknown }[]
): AgentTurnResponse {
  return {
    content: calls.map(
      (call): AgentContentBlock => ({
        type: 'tool_use',
        id: call.id,
        name: call.name,
        input: (call.input ?? {}) as Record<string, unknown>,
      }),
    ),
    stopReason: 'tool_use',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

export interface FakeToolOptions {
  requiresConfirmation?: boolean;
  result?: string;
  throws?: Error;
}

export class FakeTool implements IAgentTool {
  readonly calls: { input: unknown; context: AgentToolContext }[] = [];
  readonly requiresConfirmation: boolean;

  constructor(
    readonly name: string,
    private readonly options: FakeToolOptions = {},
  ) {
    this.requiresConfirmation = options.requiresConfirmation ?? false;
  }

  get spec() {
    return {
      name: this.name,
      description: `fake ${this.name}`,
      inputSchema: { type: 'object', properties: {} },
    };
  }

  summarize(): string {
    return `summary of ${this.name}`;
  }

  async execute(input: unknown, context: AgentToolContext): Promise<AgentToolOutcome> {
    this.calls.push({ input, context });
    if (this.options.throws) throw this.options.throws;
    return { result: this.options.result ?? '{"ok":true}' };
  }
}

export class FakeToolRegistry implements IAgentToolRegistry {
  constructor(private readonly tools: IAgentTool[]) {}

  list(): IAgentTool[] {
    return this.tools;
  }

  get(name: string): IAgentTool | undefined {
    return this.tools.find((tool) => tool.spec.name === name);
  }
}
