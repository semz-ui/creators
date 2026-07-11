import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { ResetPasswordPage } from './ResetPasswordPage';

describe('ResetPasswordPage', () => {
  it('renders the new-password form when a token is present', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=tok-1' });
    expect(screen.getByRole('heading', { name: /choose a new password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows the invalid-link state when the token is missing', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' });
    expect(screen.getByText(/invalid or incomplete/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new link/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it('matches the snapshot with a token', () => {
    const { container } = renderWithProviders(<ResetPasswordPage />, {
      route: '/reset-password?token=tok-1',
    });
    expect(container).toMatchSnapshot();
  });
});
