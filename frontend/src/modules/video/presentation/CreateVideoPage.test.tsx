import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { CreateVideoPage } from './CreateVideoPage';

describe('CreateVideoPage', () => {
  it('renders the tabbed layout with generate tab active by default', () => {
    renderWithProviders(<CreateVideoPage />, { route: '/create' });
    expect(screen.getByRole('heading', { name: /add a video/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /generate/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /upload/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate video/i })).toBeInTheDocument();
  });

  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<CreateVideoPage />, { route: '/create' });
    expect(container).toMatchSnapshot();
  });
});
