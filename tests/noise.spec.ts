import { test, expect } from '@playwright/test';

test('add and delete noise items', async ({ page }) => {
  await page.goto('/');
  // dismiss onboarding if present
  const getStarted = page.getByRole('button', { name: 'Get Started' });
  if (await getStarted.count() > 0) await getStarted.click();

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
