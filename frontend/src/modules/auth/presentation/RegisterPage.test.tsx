import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { RegisterPage } from './RegisterPage';

describe('RegisterPage', () => {
  it('renders the registration form', () => {
    renderWithProviders(<RegisterPage />, { route: '/signup' });
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<RegisterPage />, { route: '/signup' });
    expect(container).toMatchSnapshot();
  });
});
