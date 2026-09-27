import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import type { AgentMessage } from '../data/agent.types';
import { MessageList } from './MessageList';

const VIDEO_DETAIL = `${env.apiUrl}/api/v1/videos/:id`;

const videoResult = (video: Record<string, unknown>) => ({
  toolUseId: 'call-1',
  content: JSON.stringify({ video }),
  isError: false,
});

const transcript = (result: ReturnType<typeof videoResult>): AgentMessage[] => [
  { role: 'user', text: 'make a neon city clip', toolCalls: [], toolResults: [] },
  {
    role: 'assistant',
    text: 'On it.',
    toolCalls: [{ id: 'call-1', name: 'generate_video', input: { durationSeconds: 15 } }],
    toolResults: [],
  },
  // This is how the API models a tool's reply — role 'user', no typed text.
  { role: 'user', text: '', toolCalls: [], toolResults: [result] },
  { role: 'assistant', text: 'Your video is generating.', toolCalls: [], toolResults: [] },
];

const READY_VIDEO = {
  id: 'vid-1',
  status: 'ready',
  prompt: 'neon city clip',
  durationSeconds: 15,
  resultUrl: 'https://cdn.example/vid-1.mp4',
  error: null,
};

describe('MessageList', () => {
  it('renders what each side actually said', () => {
    renderWithProviders(<MessageList messages={transcript(videoResult(READY_VIDEO))} />);

    expect(screen.getByText('make a neon city clip')).toBeInTheDocument();
    expect(screen.getByText('On it.')).toBeInTheDocument();
    expect(screen.getByText('Your video is generating.')).toBeInTheDocument();
  });

  it('folds a tool reply into its call instead of showing it as a user message', () => {
    renderWithProviders(<MessageList messages={transcript(videoResult(READY_VIDEO))} />);

    // The raw JSON of the tool result must never surface as a message.
    expect(screen.queryByText(/"video"/)).not.toBeInTheDocument();
    expect(screen.getByText('Started generating a video')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Video ready')).toBeInTheDocument();
  });

  it('plays a finished video inline, without re-fetching it', () => {
    // No handler is registered: MSW is set to fail on unhandled requests, so a
    // request here would fail the test — which is exactly the point.
    renderWithProviders(<MessageList messages={transcript(videoResult(READY_VIDEO))} />);

    const player = screen.getByLabelText('neon city clip');
    expect(player).toHaveAttribute('src', 'https://cdn.example/vid-1.mp4');
    expect(player).toHaveAttribute('controls');
    expect(screen.getByRole('link', { name: /publish/i })).toHaveAttribute(
      'href',
      '/videos/vid-1/publish',
    );
  });

  it('keeps chasing a video that was still generating when the tool ran', async () => {
    server.use(http.get(VIDEO_DETAIL, () => HttpResponse.json(ok(READY_VIDEO))));

    renderWithProviders(
      <MessageList messages={transcript(videoResult({ ...READY_VIDEO, status: 'processing' }))} />,
    );

    // The transcript only knew it was generating…
    expect(screen.getByText('Generating…')).toBeInTheDocument();
    // …so the card asks the server and swaps in the player once it's ready.
    const player = await screen.findByLabelText('neon city clip');
    expect(player).toHaveAttribute('src', 'https://cdn.example/vid-1.mp4');
  });

  it('marks a call still awaiting its result as working', () => {
    renderWithProviders(
      <MessageList messages={transcript(videoResult(READY_VIDEO)).slice(0, 2)} />,
    );

    expect(screen.getByText('Working')).toBeInTheDocument();
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('shows a failed tool call with its reason', () => {
    renderWithProviders(
      <MessageList
        messages={[
          {
            role: 'assistant',
            text: '',
            toolCalls: [{ id: 'call-2', name: 'publish_video', input: {} }],
            toolResults: [],
          },
          {
            role: 'user',
            text: '',
            toolCalls: [],
            toolResults: [
              { toolUseId: 'call-2', content: 'No active tiktok connection', isError: true },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('No active tiktok connection')).toBeInTheDocument();
  });
});
