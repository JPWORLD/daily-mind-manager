import { test, expect } from '@playwright/test';

test('add and delete noise items', async ({ page }) => {
  // ensure onboarding/language are set before any app script runs
  await page.addInitScript(() => { localStorage.setItem('dmm_seen_onboarding', '1'); localStorage.setItem('dmm_username', 'Test'); localStorage.setItem('dmm_lang', 'hi'); });
  await page.goto('/');

  const noiseInput = page.getByPlaceholder('जो भी परेशान करे लिख दें...');
  await noiseInput.fill('Call mom');
  await noiseInput.press('Enter');

  // item should appear
  await expect(page.getByText('Call mom')).toBeVisible();

  // delete via trash button (there are multiple trash icons, pick the one near the item)
  const item = page.getByText('Call mom').locator('..');
  await item.getByRole('button').click();

  await expect(page.getByText('Call mom')).toHaveCount(0);
});
