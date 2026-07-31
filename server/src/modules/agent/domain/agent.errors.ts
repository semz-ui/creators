import { AppError } from '@shared/domain/errors';

export class ConversationNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'CONVERSATION_NOT_FOUND';

  constructor(id: string) {
    super(`Conversation ${id} was not found`);
  }
}

/**
 * A new turn arrived while the conversation is blocked on a confirmation. The
 * client must approve or reject the pending action first — otherwise the tool
 * call would be left permanently unanswered, which the Messages API rejects.
 */
export class PendingActionRequiredError extends AppError {
  readonly statusCode = 409;
  readonly code = 'PENDING_ACTION_REQUIRED';

  constructor(toolName: string) {
    super(`This conversation is waiting for you to approve or reject "${toolName}"`);
  }
}

/** The resolved action doesn't match the one the conversation is waiting on. */
export class PendingActionMismatchError extends AppError {
  readonly statusCode = 409;
  readonly code = 'PENDING_ACTION_MISMATCH';

  constructor(message = 'There is no matching action awaiting confirmation') {
    super(message);
  }
}

/** The upstream model failed. Distinct from a 500 so clients can retry. */
export class AgentModelError extends AppError {
  readonly statusCode = 502;
  readonly code = 'AGENT_MODEL_ERROR';

  constructor(message = 'The assistant is temporarily unavailable') {
    super(message);
  }
}
