import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const BASE = process.env.BASE_URL || 'http://localhost:8081';

test('admin login smoke', async ({ page }) => {
  await page.goto(`${BASE}/admin.html`);
  await page.fill('#username', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('#loginBtn');
  // wait for panel to show
  await page.waitForSelector('#panel', { state: 'visible', timeout: 5000 });
  // ensure token stored
  const token = await page.evaluate(()=> localStorage.getItem('dmm_admin_token'));
  expect(token).toBeTruthy();
});
