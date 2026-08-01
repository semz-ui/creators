import type { AgentContentBlock, AgentMessage, AgentStopReason } from '../agent-message';

/** A tool as the model sees it. `inputSchema` is JSON Schema. */
export interface AgentToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AgentTurnRequest {
  system: string;
  messages: AgentMessage[];
  tools: AgentToolSpec[];
}

export interface AgentTurnResponse {
  content: AgentContentBlock[];
  stopReason: AgentStopReason;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * The language model behind the agent. Implemented by the real Claude adapter
 * when a key is configured, and by a deterministic stub otherwise.
 */
export interface IAgentModel {
  complete(request: AgentTurnRequest): Promise<AgentTurnResponse>;
}
