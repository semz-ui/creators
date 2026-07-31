import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlock, ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources';

import { TooManyRequestsError } from '@shared/domain/errors';
import { logger } from '@shared/infrastructure/logging/logger';

import type { AgentContentBlock, AgentMessage, AgentStopReason } from '../domain/agent-message';
import { textBlock } from '../domain/agent-message';
import { AgentModelError } from '../domain/agent.errors';
import type { AgentTurnRequest, AgentTurnResponse, IAgentModel } from '../domain/ports/agent-model';

export interface ClaudeAgentModelConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

const REFUSAL_TEXT =
  "I can't help with that one. Try rephrasing it, or ask me something else about your videos.";

const TRUNCATED_TEXT = 'I ran out of room mid-answer. Ask me again and I will keep it shorter.';

/**
 * Real model adapter, backed by the Claude Messages API.
 *
 * Two deliberate choices:
 * - `thinking` is left unset. Claude Sonnet 5 runs adaptive thinking by
 *   default, and explicitly disabling it makes the model markedly less willing
 *   to reach for tools — which is the whole point of this module.
 * - `disable_parallel_tool_use` keeps the model to one tool call per turn, so
 *   pausing for a confirmation can never strand a sibling `tool_use` block
 *   without its matching result.
 */
export class ClaudeAgentModel implements IAgentModel {
  private readonly client: Anthropic;

  constructor(private readonly config: ClaudeAgentModelConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async complete(request: AgentTurnRequest): Promise<AgentTurnResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        output_config: { effort: this.config.effort },
        // Caches the stable prefix (system + tool definitions + prior turns).
        cache_control: { type: 'ephemeral' },
        system: request.system,
        tools: request.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
        })),
        tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        messages: request.messages.map(toMessageParam),
      });

      const stopReason = mapStopReason(response.stop_reason);
      return {
        content: normalizeContent(response.content.map(fromContentBlock), stopReason),
        stopReason,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new TooManyRequestsError('The assistant is busy right now — try again shortly.');
      }
      logger.error({ err: error }, 'Claude agent model request failed');
      throw new AgentModelError();
    }
  }
}

function toMessageParam(message: AgentMessage): MessageParam {
  return { role: message.role, content: message.content.map(toContentBlockParam) };
}

function toContentBlockParam(block: AgentContentBlock): ContentBlockParam {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text };
    case 'thinking':
      return { type: 'thinking', thinking: block.thinking, signature: block.signature };
    case 'redacted_thinking':
      return { type: 'redacted_thinking', data: block.data };
    case 'tool_use':
      return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
    case 'tool_result':
      return {
        type: 'tool_result',
        tool_use_id: block.toolUseId,
        content: block.content,
        is_error: block.isError,
      };
  }
}

function fromContentBlock(block: ContentBlock): AgentContentBlock {
  switch (block.type) {
    case 'thinking':
      return { type: 'thinking', thinking: block.thinking, signature: block.signature };
    case 'redacted_thinking':
      return { type: 'redacted_thinking', data: block.data };
    case 'tool_use':
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: (block.input ?? {}) as Record<string, unknown>,
      };
    case 'text':
      return { type: 'text', text: block.text };
    default:
      // Server-tool blocks — none are enabled, but never drop a block silently.
      logger.warn({ blockType: block.type }, 'Unexpected content block from agent model');
      return { type: 'text', text: '' };
  }
}

function mapStopReason(raw: string | null): AgentStopReason {
  switch (raw) {
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
      return 'max_tokens';
    case 'refusal':
      return 'refusal';
    default:
      // `stop_sequence`, `pause_turn` and null all end the turn for our purposes.
      return 'end_turn';
  }
}

/**
 * Keeps the stored transcript replayable. A refusal can come back with no
 * content at all, and a `max_tokens` cut-off can leave a half-written tool call
 * that will never get a result — both would make the next request 400.
 */
function normalizeContent(
  blocks: AgentContentBlock[],
  stopReason: AgentStopReason,
): AgentContentBlock[] {
  let content = blocks.filter((block) => block.type !== 'text' || block.text.length > 0);

  if (stopReason === 'refusal') {
    return [textBlock(REFUSAL_TEXT)];
  }
  if (stopReason === 'max_tokens') {
    content = content.filter((block) => block.type !== 'tool_use');
    if (!content.some((block) => block.type === 'text')) {
      content.push(textBlock(TRUNCATED_TEXT));
    }
  }
  return content.length > 0 ? content : [textBlock(REFUSAL_TEXT)];
}
