export type AgentRole = 'user' | 'assistant';

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolUseId: string;
  /** Serialized JSON produced by the tool. Parse via `parseToolResult`. */
  content: string;
  isError: boolean;
}

/**
 * One turn in the transcript. A `user` message carrying `toolResults` is a
 * tool's reply, not something the person typed — see `MessageList`.
 */
export interface AgentMessage {
  role: AgentRole;
  text: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

/** An action the agent wants to take that the user must approve first. */
export interface PendingAction {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  summary: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: AgentMessage[];
  pendingAction: PendingAction | null;
  createdAt: string;
  updatedAt: string;
}

export type ActionDecision = 'approve' | 'reject';

export interface ConversationPage {
  items: Conversation[];
  page: number;
  limit: number;
  total: number;
}
