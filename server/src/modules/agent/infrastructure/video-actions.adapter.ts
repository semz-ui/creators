import type { PublicVideo } from '@modules/video/application/dto';
import type { CreateVideo } from '@modules/video/application/create-video.usecase';
import type { GetVideo } from '@modules/video/application/get-video.usecase';
import type { ListVideos } from '@modules/video/application/list-videos.usecase';
import type { ReconcileGeneration } from '@modules/video/application/reconcile-generation.usecase';

import type {
  AgentGenerateVideoInput,
  AgentVideo,
  IVideoActions,
} from '../domain/ports/video-actions';

/** Adapts the video module's use cases to the narrow port the agent tools use. */
export class VideoActionsAdapter implements IVideoActions {
  constructor(
    private readonly createVideo: CreateVideo,
    private readonly getVideo: GetVideo,
    private readonly listVideos: ListVideos,
    private readonly reconcile: ReconcileGeneration,
  ) {}

  async generate(userId: string, input: AgentGenerateVideoInput): Promise<AgentVideo> {
    const video = await this.createVideo.execute(userId, {
      prompt: input.prompt,
      durationSeconds: input.durationSeconds,
      ...(input.musicTrackId !== undefined ? { musicTrackId: input.musicTrackId } : {}),
      ...(input.narrationText !== undefined ? { narrationText: input.narrationText } : {}),
      ...(input.narrationVoice !== undefined ? { narrationVoice: input.narrationVoice } : {}),
    });
    return toAgentVideo(video);
  }

  async get(userId: string, videoId: string): Promise<AgentVideo> {
    // Same order as `GET /videos/:id`: poll the generator, then read.
    await this.reconcile.execute(userId, videoId);
    return toAgentVideo(await this.getVideo.execute(userId, videoId));
  }

  async list(userId: string, options: { page: number; limit: number }): Promise<AgentVideo[]> {
    const page = await this.listVideos.execute(userId, options);
    return page.items.map(toAgentVideo);
  }
}

function toAgentVideo(video: PublicVideo): AgentVideo {
  return {
    id: video.id,
    status: video.status,
    prompt: video.prompt,
    durationSeconds: video.durationSeconds,
    resultUrl: video.resultUrl,
    error: video.error,
    createdAt: video.createdAt,
  };
}
