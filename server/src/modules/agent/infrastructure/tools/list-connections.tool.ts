import type { AgentToolContext, AgentToolOutcome, IAgentTool } from '../../domain/ports/agent-tool';
import type { AgentToolSpec } from '../../domain/ports/agent-model';
import type { IConnectionActions } from '../../domain/ports/connection-actions';
import { toolJson } from './tool-kit';

export class ListConnectionsTool implements IAgentTool {
  readonly requiresConfirmation = false;

  readonly spec: AgentToolSpec = {
    name: 'list_connections',
    description:
      'List the user\'s connected social accounts and whether each one can be posted to. Only accounts with status "active" are publishable. Call this before promising to publish to a platform.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  };

  constructor(private readonly connections: IConnectionActions) {}

  summarize(): string {
    return 'List connected accounts';
  }

  async execute(_input: unknown, context: AgentToolContext): Promise<AgentToolOutcome> {
    const connections = await this.connections.list(context.userId);
    return { result: toolJson({ connections }) };
  }
}
