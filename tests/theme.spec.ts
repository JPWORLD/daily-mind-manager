import { test, expect } from '@playwright/test';

// Ensure the app is served on http://localhost:8080
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';

test('theme toggle updates accent classes', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // wait for app shell to load
  await page.waitForSelector('header', { timeout: 30000 });
  // find the Today-like tab by finding the first two buttons inside the first flex container in main
  const dailyTab = page.locator('main').locator('div').filter({ has: page.locator('button') }).first().locator('button').first();
  await expect(dailyTab).toBeVisible();
  const before = await dailyTab.getAttribute('class');

  // attempt to find a theme toggle by trying header buttons until dailyTab class changes
  const buttons = await page.locator('header button').all();
  let changed = false;
  for (let i = 0; i < Math.min(buttons.length, 12); i++) {
    try {
      await buttons[i].click();
      await page.waitForTimeout(250);
      const after = await dailyTab.getAttribute('class');
      if (after !== before) { changed = true; break; }
    } catch (e) {
      // ignore and continue
    }
  }
  expect(changed).toBeTruthy();
});
