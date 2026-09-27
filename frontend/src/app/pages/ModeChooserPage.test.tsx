import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useModeStore } from '@/shared/preferences/mode.store';
import { renderWithProviders } from '@/test/render';

import { ModeChooserPage } from './ModeChooserPage';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

describe('ModeChooserPage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    useModeStore.getState().clear();
    localStorage.clear();
  });

  it('offers both experiences', () => {
    renderWithProviders(<ModeChooserPage />);

    expect(screen.getByRole('button', { name: /assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /studio/i })).toBeInTheDocument();
  });

  it('remembers the assistant and goes there', () => {
    renderWithProviders(<ModeChooserPage />);

    fireEvent.click(screen.getByRole('button', { name: /assistant/i }));

    expect(useModeStore.getState().mode).toBe('assistant');
    expect(navigateMock).toHaveBeenCalledWith('/agent', { replace: true });
  });

  it('remembers the studio and goes there', () => {
    renderWithProviders(<ModeChooserPage />);

    fireEvent.click(screen.getByRole('button', { name: /studio/i }));

    expect(useModeStore.getState().mode).toBe('studio');
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('does not ask again once a choice has been made', () => {
    useModeStore.getState().setMode('studio');

    renderWithProviders(<ModeChooserPage />);

    expect(screen.queryByRole('button', { name: /assistant/i })).not.toBeInTheDocument();
  });
});
