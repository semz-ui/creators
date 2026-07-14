import { expect, test, type Page } from '@playwright/test';

import { ok } from './support/envelope';

const user = { id: 'u1', email: 'new@reelo.app' };
const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

async function mockAuth(page: Page, endpoint: 'register' | 'login' | 'google') {
  await page.route(`**/api/v1/auth/${endpoint}`, (route) =>
    route.fulfill({
      status: endpoint === 'register' ? 201 : 200,
      contentType: 'application/json',
      body: ok({ user, ...tokens }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok(user) }),
  );
  await page.route('**/api/v1/billing/balance', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ balance: 90 }),
    }),
  );
  // The dashboard loads recent videos on arrival.
  await page.route(/\/api\/v1\/videos(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ items: [], page: 1, limit: 6, total: 0 }),
    }),
  );
}

test('registers and lands on the dashboard', async ({ page }) => {
  await mockAuth(page, 'register');

  await page.goto('/signup');
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /turn a prompt into a video/i })).toBeVisible();
  await expect(page.getByText(user.email).first()).toBeVisible();
});

test('logs in and lands on the dashboard', async ({ page }) => {
  await mockAuth(page, 'login');

  await page.goto('/login');
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /^log in$/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /turn a prompt into a video/i })).toBeVisible();
});

// Relies on the dev server running without VITE_GOOGLE_CLIENT_ID, which makes
// the login page render the stub Google button instead of the GIS iframe.
test('signs in with Google and lands on the dashboard', async ({ page }) => {
  await mockAuth(page, 'google');

  await page.goto('/login');
  await page.getByRole('button', { name: /continue with google/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /turn a prompt into a video/i })).toBeVisible();
});

test('protected route redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});
