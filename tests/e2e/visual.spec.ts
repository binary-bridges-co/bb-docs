import { expect, test } from '@playwright/test';
import { useTheme } from './helpers';

// Human-reviewed baselines: structural tests do not catch visual regressions
// (bb-sign learned this the hard way). Update with
// `npx playwright test visual --update-snapshots` and LOOK at the diff.
const WIDTHS = [320, 768, 1024, 1440] as const;

const PAGES = [
  ['hub', '/'],
  ['sign', '/sign/'],
  ['signing', '/sign/signing/'],
  ['api', '/sign/api/operations/createenvelope/'],
] as const;

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of WIDTHS) {
    for (const [name, path] of PAGES) {
      test(`${name} ${width}px ${colorScheme}`, async ({ page }) => {
        await useTheme(page, colorScheme);
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`${name}-${width}-${colorScheme}.png`, {
          fullPage: true,
          mask: [page.locator('.bb-footer__legal'), page.locator('.sl-markdown-content .last-updated, footer time')],
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
}
