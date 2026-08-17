import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { VideoProviderInfo } from '../data/video.types';
import { ProviderPicker } from './ProviderPicker';

const PROVIDERS: VideoProviderInfo[] = [
  { id: 'sora', label: 'Sora', available: true, supportsAudio: true },
  { id: 'kling', label: 'Kling', available: false, supportsAudio: false },
  { id: 'pika', label: 'Pika', available: true, supportsAudio: false },
];

describe('ProviderPicker', () => {
  it('lists every provider, including ones the server cannot use', () => {
    render(<ProviderPicker providers={PROVIDERS} value="sora" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /sora/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kling/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pika/i })).toBeInTheDocument();
  });

  it('disables an unavailable provider and explains why', () => {
    render(<ProviderPicker providers={PROVIDERS} value="sora" onChange={vi.fn()} />);

    const kling = screen.getByRole('button', { name: /kling/i });
    expect(kling).toBeDisabled();
    expect(kling).toHaveAttribute('title', expect.stringMatching(/not configured/i));
    expect(screen.getByRole('button', { name: /sora/i })).toBeEnabled();
  });

  it('announces availability to screen readers, not just by dot color', () => {
    render(<ProviderPicker providers={PROVIDERS} value="sora" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /sora \(available\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kling \(not configured\)/i })).toBeInTheDocument();
  });

  it('marks the selected provider as pressed', () => {
    render(<ProviderPicker providers={PROVIDERS} value="pika" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /pika/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /sora/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports a pick, and cannot report an unavailable one', async () => {
    const onChange = vi.fn();
    render(<ProviderPicker providers={PROVIDERS} value="sora" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /pika/i }));
    expect(onChange).toHaveBeenCalledWith('pika');

    onChange.mockClear();
    await userEvent.click(screen.getByRole('button', { name: /kling/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders nothing before the providers query resolves', () => {
    const { container } = render(<ProviderPicker providers={[]} value={null} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
