import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import type { AgentMessage } from '../data/agent.types';
import { MessageList } from './MessageList';

const transcript: AgentMessage[] = [
  { role: 'user', text: 'make a neon city clip', toolCalls: [], toolResults: [] },
  {
    role: 'assistant',
    text: 'On it.',
    toolCalls: [{ id: 'call-1', name: 'generate_video', input: { durationSeconds: 15 } }],
    toolResults: [],
  },
  // This is how the API models a tool's reply — role 'user', no typed text.
  {
    role: 'user',
    text: '',
    toolCalls: [],
    toolResults: [
      {
        toolUseId: 'call-1',
        content: '{"video":{"id":"vid-1","status":"processing"}}',
        isError: false,
      },
    ],
  },
  { role: 'assistant', text: 'Your video is generating.', toolCalls: [], toolResults: [] },
];

describe('MessageList', () => {
  it('renders what each side actually said', () => {
    renderWithProviders(<MessageList messages={transcript} />);

    expect(screen.getByText('make a neon city clip')).toBeInTheDocument();
    expect(screen.getByText('On it.')).toBeInTheDocument();
    expect(screen.getByText('Your video is generating.')).toBeInTheDocument();
  });

  it('folds a tool reply into its call instead of showing it as a user message', () => {
    renderWithProviders(<MessageList messages={transcript} />);

    // The raw JSON of the tool result must never surface as a message.
    expect(screen.queryByText(/"video"/)).not.toBeInTheDocument();
    expect(screen.getByText('Started generating a video')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Video processing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view video/i })).toHaveAttribute(
      'href',
      '/videos/vid-1',
    );
  });

  it('marks a call still awaiting its result as working', () => {
    renderWithProviders(<MessageList messages={transcript.slice(0, 2)} />);

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
