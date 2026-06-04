import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

import type { ApplyGenerationResult } from '../application/apply-generation-result.usecase';
import type { CreateVideo } from '../application/create-video.usecase';
import type { GetVideo } from '../application/get-video.usecase';
import type { ListVideos } from '../application/list-videos.usecase';
import { listVideosQuerySchema } from './video.validators';

export interface VideoUseCases {
  create: CreateVideo;
  get: GetVideo;
  list: ListVideos;
  applyResult: ApplyGenerationResult;
}

/** HTTP adapter mapping requests to the video use cases. */
export class VideoController {
  constructor(private readonly useCases: VideoUseCases) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const video = await this.useCases.create.execute(this.requireUserId(req), req.body);
    res.status(201).json(video);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listVideosQuerySchema.parse(req.query);
    const page = await this.useCases.list.execute(this.requireUserId(req), query);
    res.status(200).json(page);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    // `id` is guaranteed by the `/:id` route.
    const id = req.params.id as string;
    const video = await this.useCases.get.execute(this.requireUserId(req), id);
    res.status(200).json(video);
  };

  generationCallback = async (req: Request, res: Response): Promise<void> => {
    await this.useCases.applyResult.execute(req.body);
    res.status(204).send();
  };

  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
