import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

import type { GetOverview } from '../application/get-overview.usecase';
import type { GetVideoAnalytics } from '../application/get-video-analytics.usecase';
import type { SyncUserMetrics } from '../application/sync-user-metrics.usecase';

export interface AnalyticsUseCases {
  sync: SyncUserMetrics;
  overview: GetOverview;
  videoAnalytics: GetVideoAnalytics;
}

/** HTTP adapter for the analytics module. */
export class AnalyticsController {
  constructor(private readonly useCases: AnalyticsUseCases) {}

  refresh = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.sync.execute(this.requireUserId(req));
    res.status(200).json(result);
  };

  overview = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.overview.execute(this.requireUserId(req));
    res.status(200).json(result);
  };

  videoAnalytics = async (req: Request, res: Response): Promise<void> => {
    const videoId = req.params.videoId as string;
    const result = await this.useCases.videoAnalytics.execute(this.requireUserId(req), videoId);
    res.status(200).json(result);
  };

  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
