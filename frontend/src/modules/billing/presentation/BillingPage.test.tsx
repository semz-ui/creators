import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { BillingPage } from './BillingPage';

function mockBilling() {
  server.use(
    http.get(`${env.apiUrl}/api/v1/billing/balance`, () => HttpResponse.json(ok({ balance: 90 }))),
    http.get(`${env.apiUrl}/api/v1/billing/ledger`, () =>
      HttpResponse.json(
        ok({
          items: [
            {
              id: 'l1',
              type: 'debit',
              amount: 10,
              reason: 'generation',
              referenceId: 'v1',
              balanceAfter: 90,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'l2',
              type: 'credit',
              amount: 100,
              reason: 'topup',
              referenceId: 'p1',
              balanceAfter: 100,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          page: 1,
          limit: 10,
          total: 2,
        }),
      ),
    ),
  );
}

describe('BillingPage', () => {
  it('shows the balance, top-up packs, and ledger', async () => {
    mockBilling();
    renderWithProviders(<BillingPage />, { route: '/billing' });

    expect(await screen.findByText(/90 credits/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '50 credits' })).toBeInTheDocument();
    expect(await screen.findByText('Video generation')).toBeInTheDocument();
    expect(screen.getByText('Top-up')).toBeInTheDocument();
    expect(screen.getByText('+100')).toBeInTheDocument();
  });

  it('matches the snapshot', async () => {
    mockBilling();
    const { container } = renderWithProviders(<BillingPage />, { route: '/billing' });
    await screen.findByText('Video generation');
    expect(container).toMatchSnapshot();
  });
});
