import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { PublicationDetailPage } from './PublicationDetailPage';

const routed = (
  <Routes>
    <Route path="/publications/:id" element={<PublicationDetailPage />} />
  </Routes>
);

const publication = {
  id: 'pub-1',
  videoId: 'vid-1',
  caption: 'launch day',
  status: 'completed',
  scheduledAt: null,
  targets: [
    { platform: 'facebook', status: 'published', externalPostId: 'fb-1', error: null },
    { platform: 'youtube', status: 'failed', externalPostId: null, error: 'quota exceeded' },
  ],
  createdAt: '',
  updatedAt: '',
};

describe('PublicationDetailPage', () => {
  it('shows the overall status and per-platform targets', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/publications/pub-1`, () => HttpResponse.json(publication)),
    );
    renderWithProviders(routed, { route: '/publications/pub-1' });

    expect(await screen.findByText('launch day')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('quota exceeded')).toBeInTheDocument();
  });

  it('matches the snapshot', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/publications/pub-1`, () => HttpResponse.json(publication)),
    );
    const { container } = renderWithProviders(routed, {
      route: '/publications/pub-1',
    });
    await screen.findByText('launch day');
    expect(container).toMatchSnapshot();
  });
});
