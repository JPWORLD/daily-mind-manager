import { test, expect } from '@playwright/test';

test('add and delete noise items', async ({ page }) => {
  await page.goto('/');
  // mark onboarding as seen to avoid modal blocking the UI during tests
  await page.evaluate(() => { localStorage.setItem('dmm_seen_onboarding', '1'); localStorage.setItem('dmm_username', 'Test'); localStorage.setItem('dmm_lang', 'hi'); });
  await page.reload();

  const noiseInput = page.getByPlaceholder('Jo bhi pareshan kare likh do...');
  await noiseInput.fill('Call mom');
  await noiseInput.press('Enter');

  // item should appear
  await expect(page.getByText('Call mom')).toBeVisible();

  // delete via trash button (there are multiple trash icons, pick the one near the item)
  const item = page.getByText('Call mom').locator('..');
  await item.getByRole('button').click();

  await expect(page.getByText('Call mom')).toHaveCount(0);
});
