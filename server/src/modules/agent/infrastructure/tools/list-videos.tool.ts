import { z } from 'zod';

import type { AgentToolContext, AgentToolOutcome, IAgentTool } from '../../domain/ports/agent-tool';
import type { AgentToolSpec } from '../../domain/ports/agent-model';
import type { IVideoActions } from '../../domain/ports/video-actions';
import { parseToolInput, toolJson } from './tool-kit';

const inputSchema = z.object({
  limit: z.number().int().min(1).max(20).optional(),
});

export class ListVideosTool implements IAgentTool {
  readonly requiresConfirmation = false;

  readonly spec: AgentToolSpec = {
    name: 'list_videos',
    description:
      "List the user's most recent videos, newest first, with their generation status. Use this to find a video the user refers to without giving an id.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description: 'How many videos to return. Defaults to 10.',
        },
      },
      additionalProperties: false,
    },
  };

  constructor(private readonly videos: IVideoActions) {}

  summarize(): string {
    return 'List recent videos';
  }

  async execute(input: unknown, context: AgentToolContext): Promise<AgentToolOutcome> {
    const { limit } = parseToolInput(inputSchema, input, this.spec.name);
    const videos = await this.videos.list(context.userId, { page: 1, limit: limit ?? 10 });
    return { result: toolJson({ videos }) };
  }
}
