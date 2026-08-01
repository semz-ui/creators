/** Wire shapes for the agent endpoints. */

export interface ToolCallResponse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultResponse {
  toolUseId: string;
  content: string;
  isError: boolean;
}

export interface AgentMessageResponse {
  role: 'user' | 'assistant';
  text: string;
  toolCalls: ToolCallResponse[];
  toolResults: ToolResultResponse[];
}

export interface PendingActionResponse {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  summary: string;
}

export interface ConversationResponse {
  id: string;
  title: string;
  messages: AgentMessageResponse[];
  /** Non-null when the agent is waiting for the user to approve an action. */
  pendingAction: PendingActionResponse | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationPageResponse {
  items: ConversationResponse[];
  page: number;
  limit: number;
  total: number;
}
