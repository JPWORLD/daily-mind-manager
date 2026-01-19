import { test, expect } from '@playwright/test';

test('home page shows app header', async ({ page }) => {
  await page.goto('/');
  // dismiss onboarding if present (Maybe Later / English buttons)
  const getStarted = page.getByRole('button', { name: /Get Started|Maybe Later|English|Hindi/ });
  if (await getStarted.count() > 0) await getStarted.click();

  await expect(page.getByRole('heading', { name: 'Mind Manager' })).toBeVisible();
});
