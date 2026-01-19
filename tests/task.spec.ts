import { test, expect } from '@playwright/test';

test('add and toggle today task persists', async ({ page }) => {
  // ensure onboarding/language are set before any app script runs
  await page.addInitScript(() => { localStorage.setItem('dmm_seen_onboarding', '1'); localStorage.setItem('dmm_username', 'Test'); localStorage.setItem('dmm_lang', 'hi'); });
  await page.goto('/');

  const input = page.getByPlaceholder('आज का सबसे जरूरी काम...');
  await input.fill('Buy milk');

  // after filling, toggle button should appear
  const toggle = page.getByRole('button', { name: /Isse Poora Karein|Kaam Ho Gaya!/ });
  await expect(toggle).toBeVisible();

  // mark as done
  await toggle.click();
  await expect(page.getByText('Kaam Ho Gaya!')).toBeVisible();

  // reload and ensure task & done state persisted
  await page.reload();
  await expect(page.getByPlaceholder('आज का सबसे जरूरी काम...')).toHaveValue('Buy milk');
  await expect(page.getByText('Kaam Ho Gaya!')).toBeVisible();
});
