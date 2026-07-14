import { expect, test, type Page } from '@playwright/test';

import { ok } from './support/envelope';

const GENERIC_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';

async function mockForgotPassword(page: Page) {
  await page.route('**/api/v1/auth/forgot-password', (route) =>
    route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: ok({ message: GENERIC_MESSAGE }),
    }),
  );
}

test('requests a reset link from the login page', async ({ page }) => {
  await mockForgotPassword(page);

  await page.goto('/login');
  await page.getByRole('link', { name: /forgot password/i }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  await page.getByLabel(/^email$/i).fill('someone@reelo.app');
  await page.getByRole('button', { name: /send reset link/i }).click();

  await expect(page.getByText(GENERIC_MESSAGE)).toBeVisible();
  await expect(page.getByRole('link', { name: /back to log in/i })).toBeVisible();
});

test('resets the password and lands on login with a notice', async ({ page }) => {
  await page.route('**/api/v1/auth/reset-password', (route) => route.fulfill({ status: 204 }));

  await page.goto('/reset-password?token=tok-1');
  await page.getByLabel(/^new password$/i).fill('brand-new-pass-1');
  await page.getByRole('button', { name: /reset password/i }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/password has been reset/i)).toBeVisible();
});

test('shows an invalid-link error for a rejected token', async ({ page }) => {
  await page.route('**/api/v1/auth/reset-password', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired reset token' },
      }),
    }),
  );

  await page.goto('/reset-password?token=used-token');
  await page.getByLabel(/^new password$/i).fill('brand-new-pass-1');
  await page.getByRole('button', { name: /reset password/i }).click();

  await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /request a new link/i })).toBeVisible();
});

test('shows the invalid-link state when the token is missing', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByText(/invalid or incomplete/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /request a new link/i })).toBeVisible();
});
