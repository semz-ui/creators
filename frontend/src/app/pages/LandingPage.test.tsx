import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('renders the hero heading and CTAs', () => {
    renderWithProviders(<LandingPage />);
    expect(
      screen.getByRole('heading', { name: /prompt in\. video out\. everywhere\./i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });

  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<LandingPage />);
    expect(container).toMatchSnapshot();
  });
});
