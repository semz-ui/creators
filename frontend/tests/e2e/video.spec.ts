import { expect, test, type Page } from '@playwright/test';

const user = { id: 'u1', email: 'creator@reelo.app' };

/** Mock auth + log in through the UI so the in-memory session is established. */
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

const emptyList = { items: [], page: 1, limit: 6, total: 0 };

test('creates a video and sees it become ready', async ({ page }) => {
  // List (dashboard "recent") empty; create returns processing; detail returns ready.
  await page.route(/\/api\/v1\/videos(\?|$)/, (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'vid-1',
          prompt: 'a cat',
          durationSeconds: 15,
          status: 'processing',
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyList),
    });
  });
  await page.route(/\/api\/v1\/videos\/[\w-]+$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'vid-1',
        prompt: 'a cat',
        durationSeconds: 15,
        status: 'ready',
        resultUrl: 'https://cdn.reelo.app/v.mp4',
        error: null,
      }),
    }),
  );

  await login(page);

  await page.getByRole('link', { name: /create video/i }).click();
  await expect(page).toHaveURL(/\/create$/);

  await page.getByLabel(/prompt/i).fill('a cat surfing a neon wave');
  await page.getByRole('button', { name: '30s' }).click();
  await page.getByRole('button', { name: /generate video/i }).click();

  await expect(page).toHaveURL(/\/videos\/vid-1$/);
  await expect(page.getByText('a cat')).toBeVisible();
  await expect(page.locator('video')).toBeVisible();
});

test('library lists videos', async ({ page }) => {
  await page.route(/\/api\/v1\/videos(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'v1',
            prompt: 'sunset over the sea',
            durationSeconds: 15,
            status: 'ready',
            resultUrl: 'https://cdn/v.mp4',
            error: null,
          },
          {
            id: 'v2',
            prompt: 'city at night',
            durationSeconds: 30,
            status: 'processing',
            resultUrl: null,
            error: null,
          },
        ],
        page: 1,
        limit: 12,
        total: 2,
      }),
    }),
  );

  await login(page);
  await page.getByRole('link', { name: /^library$/i }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText('sunset over the sea')).toBeVisible();
  await expect(page.getByText('city at night')).toBeVisible();
});
