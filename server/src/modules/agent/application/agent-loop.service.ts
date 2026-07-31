import { AppError } from '@shared/domain/errors';
import { logger } from '@shared/infrastructure/logging/logger';

import type { AgentContentBlock, AgentMessage } from '../domain/agent-message';
import { textBlock, toolCalls, toolResultBlock } from '../domain/agent-message';
import type { Conversation } from '../domain/conversation.entity';
import type { AgentToolContext, IAgentTool, IAgentToolRegistry } from '../domain/ports/agent-tool';
import type { IAgentModel } from '../domain/ports/agent-model';
import { AGENT_SYSTEM_PROMPT } from './agent.prompt';

export interface AgentLoopConfig {
  maxIterations: number;
  maxHistoryMessages: number;
}

/** Tool the one-per-turn spend cap applies to. */
const GENERATE_TOOL = 'generate_video';

const ITERATION_LIMIT_MESSAGE =
  'I stopped there — that took more steps than expected. Tell me what you want next and I will pick it up.';

/**
 * Drives the model <-> tool conversation. Mutates the conversation in place and
 * leaves persistence to the caller, mirroring `DistributionService` in the
 * publishing module.
 *
 * A tool that requires confirmation is never executed here: the loop records a
 * pending action and returns, deliberately leaving that `tool_use` block
 * unanswered until `ResolveAgentAction` supplies the result.
 */
export class AgentLoop {
  constructor(
    private readonly model: IAgentModel,
    private readonly tools: IAgentToolRegistry,
    private readonly config: AgentLoopConfig,
  ) {}

  async run(conversation: Conversation, context: AgentToolContext): Promise<void> {
    let generations = 0;

    for (let iteration = 0; iteration < this.config.maxIterations; iteration += 1) {
      const response = await this.model.complete({
        system: AGENT_SYSTEM_PROMPT,
        messages: historyWindow(conversation.messages, this.config.maxHistoryMessages),
        tools: this.tools.list().map((tool) => tool.spec),
      });

      logger.info(
        {
          conversationId: conversation.id,
          iteration,
          stopReason: response.stopReason,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        },
        'Agent model turn',
      );

      conversation.appendAssistant(response.content);
      if (response.stopReason !== 'tool_use') return;

      const calls = toolCalls({ role: 'assistant', content: response.content });
      // Defensive: `tool_use` with no tool_use blocks would deadlock the loop.
      if (calls.length === 0) return;

      const results: AgentContentBlock[] = [];
      let pausedOn: { tool: IAgentTool; call: (typeof calls)[number] } | null = null;

      for (const call of calls) {
        const tool = this.tools.get(call.name);

        if (!tool) {
          results.push(toolResultBlock(call.id, `Unknown tool "${call.name}".`, true));
          continue;
        }

        if (tool.requiresConfirmation) {
          // Only a lone confirmation call can pause the turn — pausing beside
          // siblings would leave their `tool_use` blocks unanswered, which the
          // Messages API rejects on the next request.
          if (calls.length > 1) {
            results.push(
              toolResultBlock(
                call.id,
                `"${call.name}" needs the user's approval, so it has to be called on its own. Call it again in a turn of its own.`,
                true,
              ),
            );
            continue;
          }
          pausedOn = { tool, call };
          break;
        }

        if (call.name === GENERATE_TOOL) {
          generations += 1;
          if (generations > 1) {
            results.push(
              toolResultBlock(
                call.id,
                'Only one video can be generated per turn because each one spends credits. Ask the user before generating another.',
                true,
              ),
            );
            continue;
          }
        }

        results.push(await this.executeTool(tool, call, context, conversation.id));
      }

      if (results.length > 0) {
        conversation.appendToolResults(results);
      }

      if (pausedOn) {
        conversation.awaitConfirmation({
          toolUseId: pausedOn.call.id,
          toolName: pausedOn.call.name,
          input: pausedOn.call.input,
          summary: pausedOn.tool.summarize(pausedOn.call.input),
          createdAt: new Date(),
        });
        return;
      }
    }

    conversation.appendAssistant([textBlock(ITERATION_LIMIT_MESSAGE)]);
  }

  /**
   * Runs a tool, turning any expected failure into an error result the model
   * can react to (e.g. "you're out of credits") rather than failing the turn.
   */
  async executeTool(
    tool: IAgentTool,
    call: { id: string; name: string; input: Record<string, unknown> },
    context: AgentToolContext,
    conversationId: string,
  ): Promise<AgentContentBlock> {
    try {
      const outcome = await tool.execute(call.input, context);
      return toolResultBlock(call.id, outcome.result, outcome.isError ?? false);
    } catch (error) {
      if (error instanceof AppError) {
        logger.info(
          { conversationId, tool: call.name, code: error.code },
          'Agent tool rejected the call',
        );
        return toolResultBlock(call.id, error.message, true);
      }
      logger.error({ err: error, conversationId, tool: call.name }, 'Agent tool failed');
      return toolResultBlock(
        call.id,
        'That step failed unexpectedly. Tell the user and suggest trying again.',
        true,
      );
    }
  }
}

/**
 * Trailing slice of history to replay. Two invariants the Messages API cares
 * about: the window must start on a real user turn (not a dangling
 * `tool_result` whose `tool_use` was cut off), and a `tool_use`/`tool_result`
 * pair must never be split. Falls back to the full history if no valid start
 * exists inside the window.
 */
export function historyWindow(
  messages: readonly AgentMessage[],
  maxMessages: number,
): AgentMessage[] {
  if (messages.length <= maxMessages) return [...messages];

  for (let index = messages.length - maxMessages; index < messages.length; index += 1) {
    if (isUserTurn(messages[index])) return messages.slice(index);
  }
  return [...messages];
}

function isUserTurn(message: AgentMessage | undefined): boolean {
  return message?.role === 'user' && !message.content.some((block) => block.type === 'tool_result');
}
