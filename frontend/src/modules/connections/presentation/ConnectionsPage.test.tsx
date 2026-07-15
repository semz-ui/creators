import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { ConnectionsPage } from './ConnectionsPage';

const facebook = {
  id: 'c1',
  platform: 'facebook',
  displayName: 'My Page',
  externalAccountId: 'fb_1',
  status: 'active',
  scopes: [],
  expiresAt: null,
  createdAt: '',
  updatedAt: '',
};

describe('ConnectionsPage', () => {
  it('shows connected and not-connected platforms', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/connections`, () =>
        HttpResponse.json(ok({ items: [facebook] })),
      ),
    );
    renderWithProviders(<ConnectionsPage />, { route: '/connections' });

    expect(await screen.findByText('My Page')).toBeInTheDocument();
    // Facebook is connected → Disconnect; the others offer Connect.
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^connect$/i })).toHaveLength(3);
  });

  it('matches the snapshot once loaded', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/connections`, () =>
        HttpResponse.json(ok({ items: [facebook] })),
      ),
    );
    const { container } = renderWithProviders(<ConnectionsPage />, { route: '/connections' });
    await waitFor(() => expect(screen.getByText('My Page')).toBeInTheDocument());
    expect(container).toMatchSnapshot();
  });
});
