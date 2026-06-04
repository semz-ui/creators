import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { CreateVideoPage } from './CreateVideoPage';

describe('CreateVideoPage', () => {
  it('renders the prompt field and duration presets', () => {
    renderWithProviders(<CreateVideoPage />, { route: '/create' });
    expect(screen.getByRole('heading', { name: /create a video/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '15s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate video/i })).toBeInTheDocument();
  });

  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<CreateVideoPage />, { route: '/create' });
    expect(container).toMatchSnapshot();
  });
});
