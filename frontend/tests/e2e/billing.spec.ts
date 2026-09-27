import { expect, test, type Page } from '@playwright/test';

import { ok } from './support/envelope';
import { seedMode } from './support/session';

const user = { id: 'u1', email: 'creator@reelo.app' };

async function login(page: Page) {
  // Without a stored preference a fresh login lands on the mode chooser.
  await seedMode(page, 'studio');
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
  await page.route(/\/api\/v1\/videos(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ items: [], page: 1, limit: 6, total: 0 }),
    }),
  );
  await page.route('**/api/v1/billing/balance', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ balance: 90 }),
    }),
  );
  await page.goto('/login');
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('shows balance + ledger and starts a top-up', async ({ page }) => {
  await page.route(/\/api\/v1\/billing\/ledger(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({
        items: [
          {
            id: 'l1',
            type: 'debit',
            amount: 10,
            reason: 'generation',
            referenceId: 'v1',
            balanceAfter: 90,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
      }),
    }),
  );
  await page.route('**/api/v1/billing/topup', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: ok({ paymentId: 'p1', checkoutUrl: 'https://pay.stub.local/checkout/p1' }),
    });
  });
  await page.route('**pay.stub.local/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>pay</body></html>' }),
  );

  await login(page);
  await page
    .getByRole('link', { name: /^billing$/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/billing$/);
  // Let the page's enter transition settle before clicking, so a re-render
  // mid-animation doesn't detach the button under us.
  await expect(page.getByRole('main')).toHaveCSS('opacity', '1');

  await expect(page.getByTestId('balance')).toHaveText('90 credits');
  await expect(page.getByText('Video generation', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '250 credits' }).click();
  await page.getByRole('button', { name: /buy 250 credits/i }).click();
  await expect(page).toHaveURL(/pay\.stub\.local/);
});
