import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { ConversationRail } from './ConversationRail';

const conversation = (id: string, title: string) => ({
  id,
  title,
  messages: [],
  pendingAction: null,
  createdAt: '2026-07-31T10:00:00.000Z',
  updatedAt: '2026-07-31T10:00:00.000Z',
});

const LIST = `${env.apiUrl}/api/v1/agent/conversations`;

describe('ConversationRail', () => {
  it('lists past conversations in the order the server returns them', async () => {
    server.use(
      http.get(LIST, () =>
        HttpResponse.json(
          ok({
            items: [conversation('c2', 'sunset promo'), conversation('c1', 'neon city clip')],
            page: 1,
            limit: 30,
            total: 2,
          }),
        ),
      ),
    );

    renderWithProviders(<ConversationRail onNewChat={vi.fn()} />);

    const links = await screen.findAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['sunset promo', 'neon city clip']);
    expect(links[0]).toHaveAttribute('href', '/agent/c2');
  });

  it('marks the open conversation as current', async () => {
    server.use(
      http.get(LIST, () =>
        HttpResponse.json(
          ok({
            items: [conversation('c1', 'neon city clip'), conversation('c2', 'sunset promo')],
            page: 1,
            limit: 30,
            total: 2,
          }),
        ),
      ),
    );

    renderWithProviders(<ConversationRail onNewChat={vi.fn()} />, { route: '/agent/c2' });

    const current = await screen.findByRole('link', { name: 'sunset promo' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'neon city clip' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('invites a first chat when there is no history', async () => {
    server.use(
      http.get(LIST, () => HttpResponse.json(ok({ items: [], page: 1, limit: 30, total: 0 }))),
    );

    renderWithProviders(<ConversationRail onNewChat={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/past chats will appear here/i)).toBeVisible());
  });

  it('says so when the history cannot be loaded', async () => {
    server.use(http.get(LIST, () => HttpResponse.json({ error: {} }, { status: 500 })));

    renderWithProviders(<ConversationRail onNewChat={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/couldn.t load your chats/i)).toBeVisible());
  });

  it('starts a new chat', async () => {
    const onNewChat = vi.fn();
    server.use(
      http.get(LIST, () => HttpResponse.json(ok({ items: [], page: 1, limit: 30, total: 0 }))),
    );

    renderWithProviders(<ConversationRail onNewChat={onNewChat} />);

    fireEvent.click(screen.getByRole('button', { name: /new chat/i }));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });
});
