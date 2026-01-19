import { test, expect } from '@playwright/test';

test('pomodoro start and pause', async ({ page }) => {
  await page.goto('/');
  // dismiss onboarding if present (Maybe Later / English buttons)
  const getStarted = page.getByRole('button', { name: /Get Started|Maybe Later|English|Hindi/ });
  if (await getStarted.count() > 0) await getStarted.click();

  // open pomodoro (it is lazy-loaded, ensure it loads)
  await expect(page.getByRole('heading', { name: 'Pomodoro' })).toBeVisible();

  const start = page.getByRole('button', { name: 'Start' });
  await start.click();

  // once started, Pause button should be visible
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  // pause
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});
