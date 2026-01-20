const { test, expect } = require('@playwright/test');

test.describe('Admin flow', () => {
  const baseURL = 'http://localhost:8081';
  const adminToken = process.env.DMM_ADMIN_TOKEN || 'dev-admin-token';

  test('create post via admin UI and verify public list', async ({ page }) => {
    // ensure the admin token is available in localStorage before the page loads
    await page.addInitScript({ content: `localStorage.setItem('dmm_admin_token', '${adminToken}');` });
    await page.goto(baseURL + '/admin.html');
    // fill post
    const slug = 'e2e-' + Date.now();
    await page.fill('#title', 'E2E Test Post');
    await page.fill('#slug', slug);
    await page.fill('#content', 'This is a test post created during E2E.');
    await page.check('#published');
    await page.click('#save');
    // wait for saved message in the output element
    await expect(page.locator('#out')).toHaveText(/Saved:/, { timeout: 10000 });
    // verify public posts endpoint
    const posts = await page.request.get(baseURL + '/api/posts');
    const json = await posts.json();
    const found = json.find(p => p.slug === slug);
    expect(found).toBeTruthy();
  });
});
