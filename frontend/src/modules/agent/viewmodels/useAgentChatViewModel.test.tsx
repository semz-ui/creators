import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { FormEvent, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';

import type { Conversation } from '../data/agent.types';
import { useAgentChatViewModel } from './useAgentChatViewModel';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const submit = { preventDefault: () => undefined } as unknown as FormEvent;

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  title: 'make a clip',
  messages: [
    { role: 'user', text: 'make a clip', toolCalls: [], toolResults: [] },
    { role: 'assistant', text: 'Generating now.', toolCalls: [], toolResults: [] },
  ],
  pendingAction: null,
  createdAt: '2026-07-31T10:00:00.000Z',
  updatedAt: '2026-07-31T10:00:00.000Z',
  ...overrides,
});

const paused = conversation({
  pendingAction: {
    toolUseId: 'call-9',
    toolName: 'publish_video',
    input: { videoId: 'vid-1', platforms: ['tiktok'] },
    summary: 'Publish video vid-1 to tiktok',
  },
});

describe('useAgentChatViewModel', () => {
  it('starts a conversation on the first send and routes to it', async () => {
    let body: unknown;
    server.use(
      http.post(`${env.apiUrl}/api/v1/agent/conversations`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(ok(conversation()), { status: 201 });
      }),
    );

    const { result } = renderHook(() => useAgentChatViewModel(undefined), { wrapper });
    act(() => result.current.setDraft('make a clip'));
    act(() => result.current.onSubmit(submit));

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/agent/conv-1', { replace: true }),
    );
    expect(body).toEqual({ message: 'make a clip' });
  });

  it('shows the message optimistically while the turn is in flight', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/agent/conversations`, async () => {
        // Long enough to observe the in-flight state.
        await new Promise((resolve) => setTimeout(resolve, 30));
        return HttpResponse.json(ok(conversation()), { status: 201 });
      }),
    );

    const { result } = renderHook(() => useAgentChatViewModel(undefined), { wrapper });
    act(() => result.current.setDraft('make a clip'));
    act(() => result.current.onSubmit(submit));

    // The composer clears immediately and the message appears as a bubble.
    expect(result.current.draft).toBe('');
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.text).toBe('make a clip');
    expect(result.current.isSending).toBe(true);

    await waitFor(() => expect(result.current.isSending).toBe(false));
  });

  it('sends later turns to the existing conversation', async () => {
    let path = '';
    server.use(
      http.get(`${env.apiUrl}/api/v1/agent/conversations/conv-1`, () =>
        HttpResponse.json(ok(conversation())),
      ),
      http.post(`${env.apiUrl}/api/v1/agent/conversations/conv-1/messages`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(ok(conversation()));
      }),
    );

    const { result } = renderHook(() => useAgentChatViewModel('conv-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setDraft('and now publish it'));
    act(() => result.current.onSubmit(submit));

    await waitFor(() => expect(path).toBe('/api/v1/agent/conversations/conv-1/messages'));
  });

  it('blocks sending while an action is awaiting confirmation', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/agent/conversations/conv-1`, () =>
        HttpResponse.json(ok(paused)),
      ),
    );

    const { result } = renderHook(() => useAgentChatViewModel('conv-1'), { wrapper });
    await waitFor(() => expect(result.current.pendingAction).not.toBeNull());

    act(() => result.current.setDraft('never mind'));
    expect(result.current.canSend).toBe(false);
  });

  it('approves the pending action and clears it', async () => {
    let body: unknown;
    server.use(
      http.get(`${env.apiUrl}/api/v1/agent/conversations/conv-1`, () =>
        HttpResponse.json(ok(paused)),
      ),
      http.post(
        `${env.apiUrl}/api/v1/agent/conversations/conv-1/actions/call-9`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(ok(conversation()));
        },
      ),
    );

    const { result } = renderHook(() => useAgentChatViewModel('conv-1'), { wrapper });
    await waitFor(() => expect(result.current.pendingAction).not.toBeNull());

    act(() => result.current.approve());

    await waitFor(() => expect(result.current.pendingAction).toBeNull());
    expect(body).toEqual({ decision: 'approve' });
  });

  it('explains a 409 in terms the user can act on', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/agent/conversations/conv-1`, () =>
        HttpResponse.json(ok(conversation())),
      ),
      http.post(`${env.apiUrl}/api/v1/agent/conversations/conv-1/messages`, () =>
        HttpResponse.json(
          { error: { code: 'PENDING_ACTION_REQUIRED', message: 'raw server text' } },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useAgentChatViewModel('conv-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setDraft('hello'));
    act(() => result.current.onSubmit(submit));

    await waitFor(() => expect(result.current.formError).toMatch(/approve or reject/i));
    // The optimistic bubble is rolled back so the transcript stays truthful.
    expect(result.current.messages).toHaveLength(2);
  });

  it('surfaces the action a 409 refers to instead of dead-ending on the error', async () => {
    // The client's copy is behind: it has no pending action, but the server is
    // paused on one — so the send is refused and there is nothing to approve.
    let conversationState = conversation();
    server.use(
      http.get(`${env.apiUrl}/api/v1/agent/conversations/conv-1`, () =>
        HttpResponse.json(ok(conversationState)),
      ),
      http.post(`${env.apiUrl}/api/v1/agent/conversations/conv-1/messages`, () => {
        conversationState = paused;
        return HttpResponse.json(
          { error: { code: 'PENDING_ACTION_REQUIRED', message: 'raw server text' } },
          { status: 409 },
        );
      }),
    );

    const { result } = renderHook(() => useAgentChatViewModel('conv-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pendingAction).toBeNull();

    act(() => result.current.setDraft('hello'));
    act(() => result.current.onSubmit(submit));

    // The refetch the conflict triggered brings back the action to approve, so
    // the error now points at something the user can actually see.
    await waitFor(() => expect(result.current.pendingAction).not.toBeNull());
    expect(result.current.canSend).toBe(false);
  });

  it('tells the user a resolved action was already handled, not to redo it', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/agent/conversations/conv-1`, () =>
        HttpResponse.json(ok(paused)),
      ),
      http.post(`${env.apiUrl}/api/v1/agent/conversations/conv-1/actions/call-9`, () =>
        HttpResponse.json(
          { error: { code: 'PENDING_ACTION_MISMATCH', message: 'raw server text' } },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useAgentChatViewModel('conv-1'), { wrapper });
    await waitFor(() => expect(result.current.pendingAction).not.toBeNull());

    act(() => result.current.approve());

    await waitFor(() => expect(result.current.formError).toMatch(/already handled/i));
  });

  it('drops a conflict warning once a later turn succeeds', async () => {
    let messagesCalls = 0;
    server.use(
      http.get(`${env.apiUrl}/api/v1/agent/conversations/conv-1`, () =>
        HttpResponse.json(ok(conversation())),
      ),
      http.post(`${env.apiUrl}/api/v1/agent/conversations/conv-1/messages`, () => {
        messagesCalls += 1;
        return messagesCalls === 1
          ? HttpResponse.json(
              { error: { code: 'PENDING_ACTION_REQUIRED', message: 'raw server text' } },
              { status: 409 },
            )
          : HttpResponse.json(ok(conversation()));
      }),
    );

    const { result } = renderHook(() => useAgentChatViewModel('conv-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setDraft('hello'));
    act(() => result.current.onSubmit(submit));
    await waitFor(() => expect(result.current.formError).not.toBeNull());

    act(() => result.current.setDraft('hello again'));
    act(() => result.current.onSubmit(submit));

    await waitFor(() => expect(result.current.formError).toBeNull());
  });
});
