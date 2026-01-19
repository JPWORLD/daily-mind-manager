import { test, expect } from '@playwright/test';

test('add and toggle today task persists', async ({ page }) => {
  await page.goto('/');
  // dismiss onboarding if present
  const getStarted = page.getByRole('button', { name: 'Get Started' });
  if (await getStarted.count() > 0) await getStarted.click();

  const input = page.getByPlaceholder('Aaj ka sabse zaruri kaam...');
  await input.fill('Buy milk');

  // after filling, toggle button should appear
  const toggle = page.getByRole('button', { name: /Isse Poora Karein|Kaam Ho Gaya!/ });
  await expect(toggle).toBeVisible();

  // mark as done
  await toggle.click();
  await expect(page.getByText('Kaam Ho Gaya!')).toBeVisible();

  // reload and ensure task & done state persisted
  await page.reload();
  await expect(page.getByPlaceholder('Aaj ka sabse zaruri kaam...')).toHaveValue('Buy milk');
  await expect(page.getByText('Kaam Ho Gaya!')).toBeVisible();
});
