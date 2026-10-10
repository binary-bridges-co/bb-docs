import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  // Visual baselines are rendered by Chromium only: font rasterisation differs
  // per engine, and one baseline set is what a human actually reviews.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /visual\.spec/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /visual\.spec/ },
  ],
  webServer: {
    // --ignore-lock: Astro 7 refuses to start when its lock file says a preview
    // is already running (even a stale one), which made local runs flaky.
    command: `npx astro preview --port ${PORT} --ignore-lock`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
