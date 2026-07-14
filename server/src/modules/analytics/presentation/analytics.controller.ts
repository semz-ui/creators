import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';
import { respond } from '@shared/presentation/http/respond';

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
    respond(res, 200, result);
  };

  overview = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.overview.execute(this.requireUserId(req));
    respond(res, 200, result);
  };

  videoAnalytics = async (req: Request, res: Response): Promise<void> => {
    const videoId = req.params.videoId as string;
    const result = await this.useCases.videoAnalytics.execute(this.requireUserId(req), videoId);
    respond(res, 200, result);
  };

  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
