import { z } from 'zod';

import type { AgentToolContext, AgentToolOutcome, IAgentTool } from '../../domain/ports/agent-tool';
import type { AgentToolSpec } from '../../domain/ports/agent-model';
import type { IVideoActions } from '../../domain/ports/video-actions';
import { parseToolInput, toolJson } from './tool-kit';

const inputSchema = z.object({
  videoId: z.string().min(1),
});

export class GetVideoTool implements IAgentTool {
  readonly requiresConfirmation = false;

  readonly spec: AgentToolSpec = {
    name: 'get_video',
    description:
      'Fetch one video and its current generation status ("queued", "processing", "ready" or "failed"). Use this to check whether a video that was still generating has finished.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'Id returned by generate_video or list_videos.' },
      },
      required: ['videoId'],
      additionalProperties: false,
    },
  };

  constructor(private readonly videos: IVideoActions) {}

  summarize(): string {
    return 'Check a video';
  }

  async execute(input: unknown, context: AgentToolContext): Promise<AgentToolOutcome> {
    const { videoId } = parseToolInput(inputSchema, input, this.spec.name);
    const video = await this.videos.get(context.userId, videoId);
    return { result: toolJson({ video }) };
  }
}
