import { expect, test } from '@playwright/test';

/**
 * Pagefind runs only on the built site (astro preview), which is what the
 * Playwright web server starts. The index is built by Starlight at build time.
 * The open button is disabled until Starlight's search script has loaded.
 */
for (const { path, term } of [
  { path: '/sign/', term: 'webhook' },
  { path: '/en/sign/', term: 'webhook' },
  { path: '/sign/', term: 'OTP' },
] as const) {
  test(`search for "${term}" from ${path} returns results`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const open = page.locator('site-search button[data-open-modal]');
    await expect(open).toBeEnabled();
    await open.click();
    const input = page.locator('#starlight__search input.pagefind-ui__search-input');
    await expect(input).toBeVisible();
    await input.fill(term);
    const results = page.locator('#starlight__search .pagefind-ui__result');
    await expect(results.first()).toBeVisible({ timeout: 15000 });
    expect(await results.count()).toBeGreaterThan(0);
  });
}
