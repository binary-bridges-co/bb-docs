import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { KEY_PATHS, useTheme } from './helpers';

for (const colorScheme of ['light', 'dark'] as const) {
  for (const path of KEY_PATHS) {
    test(`${path} has no axe violations (${colorScheme})`, async ({ page }) => {
      await useTheme(page, colorScheme);
      await page.goto(path);
      // Expressive Code makes overflowing code blocks keyboard-focusable (tabindex + role) from a
      // script after load. Wait for that exact condition rather than a delay, so axe never races it.
      // If the script stopped doing it, this times out and the test fails, which is the point.
      await page.waitForFunction(() =>
        [...document.querySelectorAll('pre')].every((pre) => pre.scrollWidth <= pre.clientWidth || pre.hasAttribute('tabindex')),
      );
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });
  }
}

test('keyboard: the skip link is the first stop and jumps to main', async ({ page, browserName }) => {
  await page.goto('/sign/');
  // Safari's Tab skips links unless "Press Tab to highlight each item" is on; Option+Tab always reaches them.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const skip = page.locator('a[href="#_top"], .skip-link, a.sl-skip-link').first();
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#_top$/);
});
