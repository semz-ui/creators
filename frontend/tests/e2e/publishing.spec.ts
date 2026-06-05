import { expect, test, type Page } from '@playwright/test';

const user = { id: 'u1', email: 'creator@reelo.app' };

const readyVideo = {
  id: 'vid-1',
  prompt: 'a neon city',
  durationSeconds: 15,
  status: 'ready',
  resultUrl: 'https://cdn.reelo.app/v.mp4',
  error: null,
};

const facebookConnection = {
  id: 'c1',
  platform: 'facebook',
  displayName: 'My Page',
  externalAccountId: 'fb_1',
  status: 'active',
  scopes: [],
  expiresAt: null,
  createdAt: '',
  updatedAt: '',
};

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
  await page.goto('/login');
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('publishes a ready video and sees per-platform status', async ({ page }) => {
  await page.route(/\/api\/v1\/videos\/[\w-]+$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(readyVideo),
    }),
  );
  await page.route('**/api/v1/connections', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [facebookConnection] }),
    }),
  );
  await page.route('**/api/v1/publications', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'pub-1',
        videoId: 'vid-1',
        caption: 'check it out',
        status: 'completed',
        scheduledAt: null,
        targets: [
          { platform: 'facebook', status: 'published', externalPostId: 'fb-1', error: null },
        ],
        createdAt: '',
        updatedAt: '',
      }),
    }),
  );
  await page.route(/\/api\/v1\/publications\/[\w-]+$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'pub-1',
        videoId: 'vid-1',
        caption: 'check it out',
        status: 'completed',
        scheduledAt: null,
        targets: [
          { platform: 'facebook', status: 'published', externalPostId: 'fb-1', error: null },
        ],
        createdAt: '',
        updatedAt: '',
      }),
    }),
  );

  await login(page);

  await page.goto('/videos/vid-1/publish');
  await page.getByRole('button', { name: 'Facebook' }).click();
  await page.getByRole('button', { name: /publish now/i }).click();

  await expect(page).toHaveURL(/\/publications\/pub-1$/);
  await expect(page.getByText('Completed')).toBeVisible();
  await expect(page.getByText('Facebook')).toBeVisible();
  await expect(page.getByText('Published')).toBeVisible();
});

test('publications list shows status', async ({ page }) => {
  await page.route(/\/api\/v1\/publications(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'pub-1',
            videoId: 'vid-1',
            caption: 'launch day',
            status: 'completed',
            scheduledAt: null,
            targets: [
              { platform: 'facebook', status: 'published', externalPostId: 'fb-1', error: null },
            ],
            createdAt: '',
            updatedAt: '',
          },
        ],
        page: 1,
        limit: 12,
        total: 1,
      }),
    }),
  );

  await login(page);
  await page.getByRole('link', { name: /^publications$/i }).click();
  await expect(page).toHaveURL(/\/publications$/);
  await expect(page.getByText('launch day')).toBeVisible();
  await expect(page.getByText('Completed')).toBeVisible();
});
