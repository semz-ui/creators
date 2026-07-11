import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { ForgotPasswordPage } from './ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  it('renders the request-reset form', () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' });
    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });

  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<ForgotPasswordPage />, {
      route: '/forgot-password',
    });
    expect(container).toMatchSnapshot();
  });
});
