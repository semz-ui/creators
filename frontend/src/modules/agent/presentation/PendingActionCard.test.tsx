import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import type { PendingAction } from '../data/agent.types';
import { PendingActionCard } from './PendingActionCard';

const action: PendingAction = {
  toolUseId: 'call-9',
  toolName: 'publish_video',
  input: { videoId: 'vid-1', platforms: ['tiktok'] },
  summary: 'Publish video vid-1 to tiktok',
};

describe('PendingActionCard', () => {
  it('states what is about to happen and offers both answers', () => {
    renderWithProviders(
      <PendingActionCard
        action={action}
        isResolving={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText('Publish video vid-1 to tiktok')).toBeInTheDocument();
    expect(screen.getByText(/can.t be undone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeEnabled();
  });

  it('reports each decision', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    renderWithProviders(
      <PendingActionCard
        action={action}
        isResolving={false}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('locks both buttons while the decision is being applied', () => {
    renderWithProviders(
      <PendingActionCard action={action} isResolving onApprove={vi.fn()} onReject={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: /working/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });
});
