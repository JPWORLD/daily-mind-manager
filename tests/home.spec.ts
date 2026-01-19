import { test, expect } from '@playwright/test';

test('home page shows app header', async ({ page }) => {
  await page.goto('/');
  // mark onboarding as seen to avoid modal blocking the UI during tests
  await page.evaluate(() => { localStorage.setItem('dmm_seen_onboarding', '1'); localStorage.setItem('dmm_username', 'Test'); });
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Mind Manager' })).toBeVisible();
});
