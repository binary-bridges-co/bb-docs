import { expect, test } from '@playwright/test';

test('hreflang alternates point at the same page in each locale', async ({ page }) => {
  await page.goto('/sign/signing/');
  const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
    links.map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')]),
  );
  expect(alternates).toContainEqual(['es-CO', 'https://docs.binarybridges.co/sign/signing/']);
  expect(alternates).toContainEqual(['en', 'https://docs.binarybridges.co/en/sign/signing/']);
  expect(alternates).toContainEqual(['x-default', 'https://docs.binarybridges.co/sign/signing/']);
});

test('the language switcher keeps the current page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/sign/signing/');
  // Starlight renders the switcher twice (header and mobile menu); the header one is visible at this width.
  const select = page.locator('header starlight-lang-select select');
  await expect(select).toBeVisible();
  const options = await select.locator('option').evaluateAll((els) => els.map((el) => el.getAttribute('value')));
  expect(options).toContain('/en/sign/signing/');
  await select.selectOption('/en/sign/signing/');
  await expect(page).toHaveURL(/\/en\/sign\/signing\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('the sidebar is translated per locale', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/sign/');
  await expect(page.locator('#starlight__sidebar').getByText('Firmar un documento', { exact: true })).toBeVisible();
  await page.goto('/en/sign/');
  await expect(page.locator('#starlight__sidebar').getByText('Signing a document', { exact: true })).toBeVisible();
});

test('the English hub uses English copy', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('h1')).toContainText('Documentation for Binary Bridges products');
  await expect(page.locator('[data-product="sign"]')).toContainText('Open the documentation');
});
