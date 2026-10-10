import { defineConfig, devices } from '@playwright/test';

/**
 * Read-only checks against the deployed site:
 *   npm run test:prod                       # https://docs.binarybridges.co
 *   PROD_URL=http://localhost:3300 npm run test:prod
 * Visual baselines are local-only (fonts differ per machine).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testIgnore: [/visual\.spec/],
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PROD_URL ?? 'https://docs.binarybridges.co',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
