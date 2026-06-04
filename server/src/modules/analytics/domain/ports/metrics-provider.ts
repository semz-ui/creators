import type { Platform } from '@modules/connections/domain/platform';

import type { Metrics } from '../metrics';

/** Fetches current engagement metrics for a post from a platform. */
export interface IMetricsProvider {
  fetch(params: {
    platform: Platform;
    accessToken: string;
    externalPostId: string;
  }): Promise<Metrics>;
}

/** Resolves the metrics provider for a platform. */
export interface IMetricsProviderRegistry {
  get(platform: Platform): IMetricsProvider;
}
