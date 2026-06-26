import { expect, test, type Page } from '@playwright/test';

const user = { id: 'u1', email: 'creator@reelo.app' };

async function login(page: Page) {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user, accessToken: 'a', refreshToken: 'r' }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }),
  );
  await page.route(/\/api\/v1\/videos(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], page: 1, limit: 6, total: 0 }),
    }),
  );
  await page.route('**/api/v1/billing/balance', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: 90 }),
    }),
  );
  await page.goto('/login');
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('mobile nav lets you navigate when the sidebar is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await login(page);

  // On mobile the sidebar is display:none; the mobile nav drives navigation.
  await page.getByRole('link', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/create$/);
  await expect(page.getByRole('heading', { name: /add a video/i })).toBeVisible();
});

test('unknown routes render a not-found page', async ({ page }) => {
  await page.goto('/this-does-not-exist');
  await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
});
