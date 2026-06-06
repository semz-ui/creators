import { expect, test, type Page } from '@playwright/test';

const user = { id: 'u1', email: 'creator@reelo.app' };

const overview = (views: number) => ({
  totals: { views, likes: 120, comments: 30, shares: 12 },
  byPlatform: [{ platform: 'facebook', metrics: { views, likes: 80, comments: 20, shares: 8 } }],
  videoCount: 1,
});

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
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'a2', refreshToken: 'r2' }),
    }),
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

test('shows the overview and refreshes metrics', async ({ page }) => {
  let refreshed = false;
  await page.route('**/api/v1/analytics/overview', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overview(refreshed ? 2000 : 1500)),
    }),
  );
  await page.route('**/api/v1/analytics/refresh', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    refreshed = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ synced: 1 }),
    });
  });

  await login(page);
  await page.getByRole('link', { name: /^analytics$/i }).click();
  await expect(page).toHaveURL(/\/analytics$/);

  await expect(page.getByText('1,500').first()).toBeVisible();
  await expect(page.getByText('1 video')).toBeVisible();
  await expect(page.getByText('Facebook')).toBeVisible();

  await page.getByRole('button', { name: /^refresh$/i }).click();
  await expect(page.getByText('2,000').first()).toBeVisible();
});

test('shows per-video analytics', async ({ page }) => {
  await page.route(/\/api\/v1\/analytics\/videos\/[\w-]+$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        videoId: 'vid-1',
        totals: { views: 800, likes: 50, comments: 10, shares: 5 },
        byPlatform: [
          {
            platform: 'facebook',
            externalPostId: 'fb-1',
            metrics: { views: 800, likes: 50, comments: 10, shares: 5 },
            syncedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    }),
  );

  await login(page);
  await page.goto('/videos/vid-1/analytics');

  await expect(page.getByRole('heading', { name: /video analytics/i })).toBeVisible();
  await expect(page.getByText('800').first()).toBeVisible();
  await expect(page.getByText('Facebook')).toBeVisible();
});
