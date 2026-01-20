const { test, expect } = require('@playwright/test');

test.describe('Admin flow', () => {
  const baseURL = 'http://127.0.0.1:8081';
  const adminToken = process.env.DMM_ADMIN_TOKEN || 'dev-admin-token';

  test('create post via API and verify public list', async ({ request }) => {
    const slug = 'e2e-' + Date.now();
    const res = await request.post(baseURL + '/api/posts', {
      data: { title: 'E2E Test Post', slug, content: 'This is a test post created during E2E.', published: true },
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.slug).toBe(slug);

    // verify public posts endpoint
    const postsRes = await request.get(baseURL + '/api/posts');
    expect(postsRes.ok()).toBeTruthy();
    const posts = await postsRes.json();
    const found = posts.find(p => p.slug === slug);
    expect(found).toBeTruthy();
  });
});
