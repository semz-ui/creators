import type { Platform } from '@modules/connections/domain/platform';

export type DistributionStatus = 'pending' | 'published' | 'failed';

export interface DistributionSnapshot {
  platform: Platform;
  connectionId: string;
  status: DistributionStatus;
  externalPostId: string | null;
  error: string | null;
}

/** One platform target within a {@link Publication}. */
export class Distribution {
  readonly platform: Platform;
  readonly connectionId: string;
  private _status: DistributionStatus;
  private _externalPostId: string | null;
  private _error: string | null;

  private constructor(s: DistributionSnapshot) {
    this.platform = s.platform;
    this.connectionId = s.connectionId;
    this._status = s.status;
    this._externalPostId = s.externalPostId;
    this._error = s.error;
  }

  static pending(platform: Platform, connectionId: string): Distribution {
    return new Distribution({
      platform,
      connectionId,
      status: 'pending',
      externalPostId: null,
      error: null,
    });
  }

  static fromSnapshot(s: DistributionSnapshot): Distribution {
    return new Distribution(s);
  }

  get status(): DistributionStatus {
    return this._status;
  }
  get externalPostId(): string | null {
    return this._externalPostId;
  }
  get error(): string | null {
    return this._error;
  }
  get isPending(): boolean {
    return this._status === 'pending';
  }

  markPublished(externalPostId: string): void {
    this._status = 'published';
    this._externalPostId = externalPostId;
    this._error = null;
  }

  markFailed(error: string): void {
    this._status = 'failed';
    this._error = error;
  }

  toSnapshot(): DistributionSnapshot {
    return {
      platform: this.platform,
      connectionId: this.connectionId,
      status: this._status,
      externalPostId: this._externalPostId,
      error: this._error,
    };
  }
}
