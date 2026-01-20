const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE || 'http://localhost:8080';

test('subscribe to an inspiration stores email in localStorage', async ({ page }) => {
  await page.goto(BASE);
  // avoid onboarding/modal blocking the UI during tests
  await page.evaluate(() => {
    try { localStorage.setItem('dmm_seen_onboarding', '1'); localStorage.setItem('dmm_username', 'Tester'); } catch (e) {}
  });
  await page.reload();

  // navigate to the Inspire tab and wait for a Subscribe button to appear
  await page.click('text=Inspire');
  await page.waitForSelector('text=Subscribe', { timeout: 10000 });

  // handle prompt (enter email) and alert
  page.on('dialog', async (dialog) => {
    try {
      if (dialog.type() === 'prompt') await dialog.accept('test+sub@example.com');
      else await dialog.accept();
    } catch (e) {}
  });

  await page.click('text=Subscribe');

  // verify localStorage has subscribers including the email
  const subs = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('subscribers') || '[]'); } catch(e) { return []; }
  });
  expect(subs).toContain('test+sub@example.com');
});
