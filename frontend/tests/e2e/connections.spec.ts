import { expect, test, type Page } from '@playwright/test';

const user = { id: 'u1', email: 'creator@reelo.app' };

const facebook = {
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
  await page.route('**/api/v1/billing/balance', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: 90 }),
    }),
  );
  // A full page reload (e.g. the OAuth return) re-runs session restore via refresh.
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

test('connects a platform via the OAuth redirect', async ({ page }) => {
  await page.route('**/api/v1/connections', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    }),
  );
  await page.route('**/api/v1/connections/facebook/start', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authorizationUrl: 'https://oauth.stub.local/facebook/authorize?state=x',
      }),
    }),
  );
  // Land the external redirect somewhere harmless.
  await page.route('**oauth.stub.local/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>provider</body></html>',
    }),
  );

  await login(page);
  await page.getByRole('link', { name: /^connections$/i }).click();
  await expect(page).toHaveURL(/\/connections$/);

  await page
    .getByRole('listitem')
    .filter({ hasText: 'Facebook' })
    .getByRole('button', { name: /^connect$/i })
    .click();

  await expect(page).toHaveURL(/oauth\.stub\.local/);
});

test('disconnects a linked platform', async ({ page }) => {
  let disconnected = false;
  await page.route('**/api/v1/connections', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: disconnected ? [] : [facebook] }),
    }),
  );
  await page.route('**/api/v1/connections/c1', (route) => {
    disconnected = true;
    return route.fulfill({ status: 204, body: '' });
  });

  await login(page);
  await page.getByRole('link', { name: /^connections$/i }).click();

  await expect(page.getByText('My Page')).toBeVisible();
  await page.getByRole('button', { name: /disconnect/i }).click();
  await expect(page.getByText('My Page')).toHaveCount(0);
});

test('callback page returns to connections', async ({ page }) => {
  await page.route('**/api/v1/connections', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    }),
  );
  await login(page);

  await page.goto('/connections/callback?status=success&platform=facebook');
  await expect(page.getByText(/account linked/i)).toBeVisible();
  await expect(page).toHaveURL(/\/connections$/);
});
