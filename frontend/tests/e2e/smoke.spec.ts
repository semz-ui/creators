import { expect, test } from '@playwright/test';

test('landing page renders and navigates to sign up', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /prompt in\. video out\. everywhere\./i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
});
