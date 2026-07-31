import { z } from 'zod';

import { MUSIC_TRACKS, NARRATION_MAX_LENGTH, VOICES } from '@modules/video/domain/audio';

import type { AgentToolContext, AgentToolOutcome, IAgentTool } from '../../domain/ports/agent-tool';
import type { AgentToolSpec } from '../../domain/ports/agent-model';
import type { IVideoActions } from '../../domain/ports/video-actions';
import { parseToolInput, toolJson } from './tool-kit';

const MUSIC_TRACK_IDS = MUSIC_TRACKS.map((track) => track.id);

// Bounds mirror `createVideoSchema` in the video module's HTTP validators.
const inputSchema = z.object({
  prompt: z.string().trim().min(1).max(1000),
  durationSeconds: z.number().int().min(5).max(60),
  musicTrackId: z
    .string()
    .refine((id) => MUSIC_TRACK_IDS.includes(id), 'Unknown music track')
    .optional(),
  narrationText: z.string().trim().min(1).max(NARRATION_MAX_LENGTH).optional(),
  narrationVoice: z.enum(VOICES).optional(),
});

export class GenerateVideoTool implements IAgentTool {
  readonly requiresConfirmation = false;

  readonly spec: AgentToolSpec = {
    name: 'generate_video',
    description:
      'Start generating a new AI video from a prompt. This spends the user\'s credits and is asynchronous: it returns immediately with status "processing", NOT a finished video. Report that it is generating and use get_video later to check on it.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          maxLength: 1000,
          description: 'What the video should show, e.g. "a neon-lit city timelapse, cinematic".',
        },
        durationSeconds: {
          type: 'integer',
          minimum: 5,
          maximum: 60,
          description: 'Length of the clip in seconds.',
        },
        musicTrackId: {
          type: 'string',
          enum: MUSIC_TRACK_IDS,
          description: 'Optional background music track.',
        },
        narrationText: {
          type: 'string',
          maxLength: NARRATION_MAX_LENGTH,
          description: 'Optional script spoken over the video by an AI voice.',
        },
        narrationVoice: {
          type: 'string',
          enum: [...VOICES],
          description: 'Voice for narrationText. Only meaningful alongside narrationText.',
        },
      },
      required: ['prompt', 'durationSeconds'],
      additionalProperties: false,
    },
  };

  constructor(private readonly videos: IVideoActions) {}

  summarize(input: unknown): string {
    const parsed = inputSchema.safeParse(input);
    return parsed.success ? `Generate a video: "${parsed.data.prompt}"` : 'Generate a video';
  }

  async execute(input: unknown, context: AgentToolContext): Promise<AgentToolOutcome> {
    const parsed = parseToolInput(inputSchema, input, this.spec.name);
    const video = await this.videos.generate(context.userId, {
      prompt: parsed.prompt,
      durationSeconds: parsed.durationSeconds,
      ...(parsed.musicTrackId !== undefined ? { musicTrackId: parsed.musicTrackId } : {}),
      ...(parsed.narrationText !== undefined ? { narrationText: parsed.narrationText } : {}),
      ...(parsed.narrationVoice !== undefined ? { narrationVoice: parsed.narrationVoice } : {}),
    });
    return {
      result: toolJson({
        video,
        note: 'Generation has started and is not finished. Do not tell the user the video is ready.',
      }),
    };
  }
}
