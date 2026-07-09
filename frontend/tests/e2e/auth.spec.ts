import { expect, test, type Page } from '@playwright/test';

const user = { id: 'u1', email: 'new@reelo.app' };
const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

async function mockAuth(page: Page, endpoint: 'register' | 'login') {
  await page.route(`**/api/v1/auth/${endpoint}`, (route) =>
    route.fulfill({
      status: endpoint === 'register' ? 201 : 200,
      contentType: 'application/json',
      body: JSON.stringify({ user, ...tokens }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }),
  );
  await page.route('**/api/v1/billing/balance', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: 90 }),
    }),
  );
  // The dashboard loads recent videos on arrival.
  await page.route(/\/api\/v1\/videos(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], page: 1, limit: 6, total: 0 }),
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

test('protected route redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});
