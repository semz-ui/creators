import { apiClient } from '@/shared/data/api-client';

import type { Balance, LedgerPage, TopUpResult } from './billing.types';

const BASE = '/api/v1/billing';

export const billingApi = {
  getBalance: () => apiClient.get<Balance>(`${BASE}/balance`),

  getLedger: (params: { page: number; limit: number }) =>
    apiClient.get<LedgerPage>(`${BASE}/ledger?page=${params.page}&limit=${params.limit}`),

  topUp: (credits: number) => apiClient.post<TopUpResult>(`${BASE}/topup`, { credits }),
};
