import type { AgentToolSpec } from './agent-model';

export interface AgentToolContext {
  userId: string;
  conversationId: string;
}

export interface AgentToolOutcome {
  /** Serialized result fed back to the model as a `tool_result` block. */
  result: string;
  isError?: boolean;
}

/**
 * A capability the agent can invoke. Implementations are thin wrappers over
 * existing use cases — they hold no business logic of their own.
 */
export interface IAgentTool {
  readonly spec: AgentToolSpec;
  /**
   * When true the loop pauses instead of executing, and the user must approve
   * the call. Reserved for irreversible actions (publishing to a real account).
   */
  readonly requiresConfirmation: boolean;
  /** One-line description of a specific call, shown in the confirmation prompt. */
  summarize(input: unknown): string;
  execute(input: unknown, context: AgentToolContext): Promise<AgentToolOutcome>;
}

export interface IAgentToolRegistry {
  list(): IAgentTool[];
  get(name: string): IAgentTool | undefined;
}
