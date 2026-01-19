import { test, expect } from '@playwright/test';

test('home page shows app header', async ({ page }) => {
  // ensure onboarding/language are set before any app script runs
  await page.addInitScript(() => { localStorage.setItem('dmm_seen_onboarding', '1'); localStorage.setItem('dmm_username', 'Test'); localStorage.setItem('dmm_lang', 'hi'); });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'माइंड मैनेजर' })).toBeVisible();
});
