import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PRODUCTS } from '../../src/config/products';

const PAGES = [
  { path: '/', lang: 'es-CO' },
  { path: '/en/', lang: 'en' },
  { path: '/sign/', lang: 'es-CO' },
  { path: '/en/sign/', lang: 'en' },
  { path: '/sign/signing/', lang: 'es-CO' },
  { path: '/sign/legal/terms/', lang: 'es-CO' },
  { path: '/en/sign/legal/terms/', lang: 'en' },
  { path: '/sign/api/', lang: 'es-CO' },
] as const;

for (const { path, lang } of PAGES) {
  test.describe(`page ${path}`, () => {
    test('renders one h1 and declares its language', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
    });

    test('has no horizontal overflow at 320px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test('the hub lists exactly the registered products, in both locales', async ({ page }) => {
  for (const path of ['/', '/en/']) {
    await page.goto(path);
    const ids = await page.locator('[data-hub-products] [data-product]').evaluateAll((els) => els.map((el) => el.getAttribute('data-product')));
    expect(ids).toEqual(PRODUCTS.map((p) => p.id));
  }
});

test('a product page shows its topic in the sidebar and the audience badge', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/sign/admin/');
  await expect(page.locator('#starlight__sidebar').getByText('bb-sign', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.bb-audience')).toHaveText('Administradores');
});

test('the API reference lists every operation in the synced contract', async ({ page }) => {
  const spec = JSON.parse(readFileSync('src/content/sync/sign/openapi.json', 'utf8')) as { paths: Record<string, Record<string, unknown>> };
  const operations = Object.values(spec.paths).reduce((n, methods) => n + Object.keys(methods).length, 0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/sign/api/');
  const links = page.locator('#starlight__sidebar a[href^="/sign/api/operations/"]');
  expect(await links.count()).toBe(operations);
});

test('the footer carries the legal name and a link to the product', async ({ page }) => {
  await page.goto('/sign/');
  await expect(page.locator('.bb-footer__legal')).toContainText('Binary Bridges S.A.S.');
  await expect(page.locator('.bb-footer__links a[href="https://sign.binarybridges.co"]')).toBeVisible();
});

test('content stays visible without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/sign/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.sl-markdown-content')).toBeVisible();
  await context.close();
});

test('unknown paths serve the branded 404', async ({ page }) => {
  const response = await page.goto('/no-existe');
  expect(response?.status()).toBe(404);
  await expect(page.getByText('Este puente no llega a ninguna parte')).toBeVisible();
});
