import { test, expect } from '@playwright/test';

test('pomodoro start and pause', async ({ page }) => {
  await page.goto('/');
  // mark onboarding as seen to avoid modal blocking the UI during tests
  await page.evaluate(() => { localStorage.setItem('dmm_seen_onboarding', '1'); localStorage.setItem('dmm_username', 'Test'); });
  await page.reload();

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
