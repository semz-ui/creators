import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { AnalyticsOverviewPage } from './AnalyticsOverviewPage';

const overview = {
  totals: { views: 1500, likes: 120, comments: 30, shares: 12 },
  byPlatform: [
    { platform: 'facebook', metrics: { views: 1000, likes: 80, comments: 20, shares: 8 } },
    { platform: 'youtube', metrics: { views: 500, likes: 40, comments: 10, shares: 4 } },
  ],
  videoCount: 2,
};

describe('AnalyticsOverviewPage', () => {
  it('shows totals, video count, and per-platform breakdown', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/analytics/overview`, () => HttpResponse.json(overview)),
    );
    renderWithProviders(<AnalyticsOverviewPage />, { route: '/analytics' });

    expect(await screen.findByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('2 videos')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('matches the snapshot', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/analytics/overview`, () => HttpResponse.json(overview)),
    );
    const { container } = renderWithProviders(<AnalyticsOverviewPage />, { route: '/analytics' });
    await screen.findByText('1,500');
    expect(container).toMatchSnapshot();
  });
});
