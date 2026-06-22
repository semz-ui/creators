import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

import { ValidationError } from '@shared/domain/errors';

import type { ApplyGenerationResult } from '../application/apply-generation-result.usecase';
import type { CreateVideo } from '../application/create-video.usecase';
import type { GetVideo } from '../application/get-video.usecase';
import type { ListVideos } from '../application/list-videos.usecase';
import type { ReconcileGeneration } from '../application/reconcile-generation.usecase';
import type { UploadVideo } from '../application/upload-video.usecase';
import { listVideosQuerySchema, uploadVideoSchema } from './video.validators';

export interface VideoUseCases {
  create: CreateVideo;
  upload?: UploadVideo | undefined;
  get: GetVideo;
  list: ListVideos;
  applyResult: ApplyGenerationResult;
  reconcile: ReconcileGeneration;
}

/** HTTP adapter mapping requests to the video use cases. */
export class VideoController {
  constructor(private readonly useCases: VideoUseCases) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const video = await this.useCases.create.execute(this.requireUserId(req), req.body);
    res.status(201).json(video);
  };

  upload = async (req: Request, res: Response): Promise<void> => {
    if (!this.useCases.upload) {
      throw new ValidationError('Video uploads require Cloudinary configuration');
    }
    const userId = this.requireUserId(req);
    const file = res.locals.uploadedFile as { data: Buffer; contentType: string } | undefined;
    if (!file) {
      throw new ValidationError('No video file provided');
    }
    const input = uploadVideoSchema.parse({ title: (res.locals.uploadTitle as string) ?? '' });
    const video = await this.useCases.upload.execute(userId, input, file);
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
    const userId = this.requireUserId(req);
    // Poll-on-read: opportunistically advance a still-processing job to its
    // terminal state before returning. Best-effort — never blocks the read.
    await this.useCases.reconcile.execute(userId, id);
    const video = await this.useCases.get.execute(userId, id);
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
