import { randomUUID } from 'node:crypto';

import type { Platform } from '@modules/connections/domain/platform';

import { Distribution, type DistributionSnapshot } from './distribution';

export type PublicationStatus =
  | 'scheduled'
  | 'publishing'
  | 'completed'
  | 'partially_failed'
  | 'failed';

export interface PublicationSnapshot {
  id: string;
  userId: string;
  videoId: string;
  caption: string | null;
  scheduledAt: Date | null;
  status: PublicationStatus;
  targets: DistributionSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NewTarget {
  platform: Platform;
  connectionId: string;
}

/**
 * A request to publish a video to one or more platforms. Holds a Distribution
 * per target; the overall status is derived from them. Distribution may run
 * immediately or after `scheduledAt`.
 */
export class Publication {
  readonly id: string;
  readonly userId: string;
  readonly videoId: string;
  readonly caption: string | null;
  readonly scheduledAt: Date | null;
  readonly createdAt: Date;

  private _status: PublicationStatus;
  private readonly _targets: Distribution[];
  private _updatedAt: Date;

  private constructor(snapshot: PublicationSnapshot) {
    this.id = snapshot.id;
    this.userId = snapshot.userId;
    this.videoId = snapshot.videoId;
    this.caption = snapshot.caption;
    this.scheduledAt = snapshot.scheduledAt;
    this.createdAt = snapshot.createdAt;
    this._status = snapshot.status;
    this._targets = snapshot.targets.map(Distribution.fromSnapshot);
    this._updatedAt = snapshot.updatedAt;
  }

  static create(params: {
    userId: string;
    videoId: string;
    caption: string | null;
    scheduledAt: Date | null;
    targets: NewTarget[];
  }): Publication {
    const now = new Date();
    const scheduledForLater =
      params.scheduledAt !== null && params.scheduledAt.getTime() > now.getTime();
    return new Publication({
      id: randomUUID(),
      userId: params.userId,
      videoId: params.videoId,
      caption: params.caption,
      scheduledAt: scheduledForLater ? params.scheduledAt : null,
      status: scheduledForLater ? 'scheduled' : 'publishing',
      targets: params.targets.map((t) =>
        Distribution.pending(t.platform, t.connectionId).toSnapshot(),
      ),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromSnapshot(snapshot: PublicationSnapshot): Publication {
    return new Publication(snapshot);
  }

  get status(): PublicationStatus {
    return this._status;
  }
  get targets(): readonly Distribution[] {
    return this._targets;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  isDue(now: Date): boolean {
    return (
      this._status === 'scheduled' &&
      this.scheduledAt !== null &&
      this.scheduledAt.getTime() <= now.getTime()
    );
  }

  pendingTargets(): Distribution[] {
    return this._targets.filter((t) => t.isPending);
  }

  /** Move from scheduled into active distribution. */
  beginDistribution(): void {
    this._status = 'publishing';
    this.touch();
  }

  markTargetPublished(platform: Platform, externalPostId: string): void {
    this.target(platform)?.markPublished(externalPostId);
    this.touch();
  }

  markTargetFailed(platform: Platform, error: string): void {
    this.target(platform)?.markFailed(error);
    this.touch();
  }

  /** Recompute the overall status from the targets. Call after distribution. */
  recomputeStatus(): void {
    const statuses = this._targets.map((t) => t.status);
    if (statuses.some((s) => s === 'pending')) {
      this._status = 'publishing';
    } else if (statuses.every((s) => s === 'published')) {
      this._status = 'completed';
    } else if (statuses.every((s) => s === 'failed')) {
      this._status = 'failed';
    } else {
      this._status = 'partially_failed';
    }
    this.touch();
  }

  toSnapshot(): PublicationSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      videoId: this.videoId,
      caption: this.caption,
      scheduledAt: this.scheduledAt,
      status: this._status,
      targets: this._targets.map((t) => t.toSnapshot()),
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private target(platform: Platform): Distribution | undefined {
    return this._targets.find((t) => t.platform === platform);
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
