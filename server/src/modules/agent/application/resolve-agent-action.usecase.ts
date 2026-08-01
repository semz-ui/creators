import { ConversationNotFoundError, PendingActionMismatchError } from '../domain/agent.errors';
import { toolResultBlock } from '../domain/agent-message';
import type { Conversation } from '../domain/conversation.entity';
import type { IConversationRepository } from '../domain/ports/conversation-repository';
import type { IAgentToolRegistry } from '../domain/ports/agent-tool';
import type { AgentLoop } from './agent-loop.service';
import type { PublicConversation, ResolveActionInput } from './dto';
import { toPublicConversation } from './dto';

const DECLINED_RESULT = 'The user declined this action. Do not retry it unless they ask.';

/**
 * Approves or rejects the action the conversation is paused on. Either way the
 * pending `tool_use` block gets its matching `tool_result`, and the loop
 * resumes so the agent can report the outcome.
 */
export class ResolveAgentAction {
  constructor(
    private readonly conversations: IConversationRepository,
    private readonly tools: IAgentToolRegistry,
    private readonly loop: AgentLoop,
  ) {}

  async execute(userId: string, input: ResolveActionInput): Promise<PublicConversation> {
    const conversation = await this.load(userId, input.conversationId);
    const pending = conversation.pendingAction;

    if (!pending || pending.toolUseId !== input.toolUseId) {
      throw new PendingActionMismatchError();
    }

    const context = { userId, conversationId: conversation.id };

    if (input.decision === 'reject') {
      conversation.resolvePending(input.toolUseId);
      conversation.appendToolResults([toolResultBlock(pending.toolUseId, DECLINED_RESULT, true)]);
    } else {
      const tool = this.tools.get(pending.toolName);
      if (!tool) {
        // The tool was removed between the pause and the approval.
        throw new PendingActionMismatchError(
          `"${pending.toolName}" is no longer available. Start a new request.`,
        );
      }
      conversation.resolvePending(input.toolUseId);
      const result = await this.loop.executeTool(
        tool,
        { id: pending.toolUseId, name: pending.toolName, input: pending.input },
        context,
        conversation.id,
      );
      conversation.appendToolResults([result]);
    }

    // Persist the decision BEFORE resuming the model. The tool's side effect
    // has already happened and is not undoable — if the resumed turn then
    // fails (a 502/429 out of the model), an unsaved `pendingAction` would let
    // a retried approval publish a second time.
    await this.conversations.save(conversation);

    await this.loop.run(conversation, context);
    await this.conversations.save(conversation);

    return toPublicConversation(conversation);
  }

  private async load(userId: string, id: string): Promise<Conversation> {
    const conversation = await this.conversations.findById(id);
    if (!conversation || conversation.ownerId !== userId) {
      throw new ConversationNotFoundError(id);
    }
    return conversation;
  }
}
