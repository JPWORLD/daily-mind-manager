import { test, expect } from '@playwright/test';

// Ensure the app is served on http://localhost:8080
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';

test('theme toggle updates accent classes', async ({ page }) => {
  // avoid onboarding or modal overlays by seeding localStorage before load
  await page.addInitScript({ content: "localStorage.setItem('dmm_seen_onboarding','1'); localStorage.setItem('dmm_username','Tester');" });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // wait for app shell to load
  await page.waitForSelector('header', { timeout: 30000 });
  // find the Today-like tab by finding the first two buttons inside the first flex container in main
  const dailyTab = page.locator('main').locator('div').filter({ has: page.locator('button') }).first().locator('button').first();
  await expect(dailyTab).toBeVisible();
  const before = await dailyTab.getAttribute('class');

  // click the explicit theme toggle (contains the moon/sun emoji) for reliability
  const themeBtn = page.locator('header button:has-text("🌓")');
  await expect(themeBtn).toBeVisible({ timeout: 5000 });
  await themeBtn.click();
  await page.waitForTimeout(250);
  const after = await dailyTab.getAttribute('class');
  expect(after).not.toBe(before);
});
