import type { Platform } from '@modules/connections/domain/platform';

import type { Metrics } from '../metrics';

/** Everything a provider needs to look up one published post's metrics. */
export interface MetricsQuery {
  platform: Platform;
  accessToken: string;
  externalPostId: string;
}

/** Fetches current engagement metrics for a post from a platform. */
export interface IMetricsProvider {
  fetch(params: MetricsQuery): Promise<Metrics>;
}

/** Resolves the metrics provider for a platform. */
export interface IMetricsProviderRegistry {
  get(platform: Platform): IMetricsProvider;
}
