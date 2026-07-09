import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import type { Video } from '../data/video.types';
import { VideoCard } from './VideoCard';

const baseVideo: Video = {
  id: 'vid-1',
  source: 'generated',
  title: null,
  prompt: 'a neon city skyline',
  durationSeconds: 15,
  status: 'ready',
  resultUrl: 'https://cdn/v.mp4',
  error: null,
  musicTrackId: null,
  narrationText: null,
  narrationVoice: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('VideoCard', () => {
  it('shows the prompt, duration, and status', () => {
    renderWithProviders(<VideoCard video={baseVideo} />);
    expect(screen.getByText('a neon city skyline')).toBeInTheDocument();
    expect(screen.getByText('15s')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders a processing badge for a generating video', () => {
    renderWithProviders(
      <VideoCard video={{ ...baseVideo, status: 'processing', resultUrl: null }} />,
    );
    expect(screen.getByText('Generating')).toBeInTheDocument();
  });

  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<VideoCard video={baseVideo} />);
    expect(container).toMatchSnapshot();
  });
});
