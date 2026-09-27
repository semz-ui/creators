import { z } from 'zod';

import { PLATFORMS } from '@modules/connections/domain/platform';

import type { AgentToolContext, AgentToolOutcome, IAgentTool } from '../../domain/ports/agent-tool';
import type { AgentToolSpec } from '../../domain/ports/agent-model';
import type { IPublishingActions } from '../../domain/ports/publishing-actions';
import { parseToolInput, toolJson } from './tool-kit';

// `caption` bound mirrors `createPublicationSchema` in the publishing module.
const inputSchema = z.object({
  videoId: z.string().min(1),
  platforms: z.array(z.string().min(1)).nonempty(),
  caption: z.string().max(2200).optional(),
});

/**
 * The one tool that requires confirmation: publishing posts to a real social
 * account and cannot be undone from Reelo. The loop records it as a pending
 * action instead of executing it, and the user approves or rejects.
 */
export class PublishVideoTool implements IAgentTool {
  readonly requiresConfirmation = true;

  readonly spec: AgentToolSpec = {
    name: 'publish_video',
    description:
      'Publish a ready video to the given connected platforms. This asks the user to confirm before anything is posted, so after calling it say you have asked them to approve — never that the video has been posted. Call it on its own, not alongside other tools.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'Id of a video whose status is "ready".' },
        platforms: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', enum: [...PLATFORMS] },
          description: 'Platforms to post to. Each must have an active connection.',
        },
        caption: { type: 'string', maxLength: 2200, description: 'Optional post caption.' },
      },
      required: ['videoId', 'platforms'],
      additionalProperties: false,
    },
  };

  constructor(private readonly publishing: IPublishingActions) {}

  summarize(input: unknown): string {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return 'Publish a video';
    return `Publish video ${parsed.data.videoId} to ${parsed.data.platforms.join(', ')}`;
  }

  async execute(input: unknown, context: AgentToolContext): Promise<AgentToolOutcome> {
    const parsed = parseToolInput(inputSchema, input, this.spec.name);
    const publication = await this.publishing.publish(context.userId, {
      videoId: parsed.videoId,
      platforms: parsed.platforms,
      ...(parsed.caption !== undefined ? { caption: parsed.caption } : {}),
    });
    return { result: toolJson({ publication }) };
  }
}
