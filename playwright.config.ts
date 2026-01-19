import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npx http-server ./dist -p 8080',
    port: 8080,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
