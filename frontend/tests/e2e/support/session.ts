import { expect, type Page } from '@playwright/test';

import { ok } from './envelope';

export const user = { id: 'u1', email: 'creator@reelo.app' };

/**
 * Pre-seeds the experience preference so login skips the chooser. Must be
 * called before `page.goto`, since `addInitScript` runs on document creation.
 */
export async function seedMode(page: Page, mode: 'assistant' | 'studio'): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem(
      'reelo.mode',
      JSON.stringify({ state: { mode: value }, version: 0 }),
    );
  }, mode);
}

/** Routes the auth + chrome endpoints every authenticated page needs. */
export async function routeSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ user, accessToken: 'a', refreshToken: 'r' }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok(user) }),
  );
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ accessToken: 'a2', refreshToken: 'r2' }),
    }),
  );
  await page.route('**/api/v1/billing/balance', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok({ balance: 90 }) }),
  );
}

/**
 * Signs in through the real form and lands in the studio.
 *
 * The mode is seeded first: without a stored preference the app sends a fresh
 * login to the chooser, which is covered on its own in `agent.spec.ts`.
 */
export async function login(page: Page): Promise<void> {
  await seedMode(page, 'studio');
  await routeSession(page);
  await page.route(/\/api\/v1\/videos(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ items: [], page: 1, limit: 6, total: 0 }),
    }),
  );

  await page.goto('/login');
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
