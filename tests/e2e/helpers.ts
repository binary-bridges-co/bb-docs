import type { Page } from '@playwright/test';

export type ColorScheme = 'light' | 'dark';

/**
 * Starlight picks the theme from localStorage before first paint; the stored
 * value wins over `prefers-color-scheme`. Set both so the emulated scheme and
 * the toggle agree, and reduce motion so screenshots are stable.
 */
export async function useTheme(page: Page, colorScheme: ColorScheme): Promise<void> {
  await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
  await page.addInitScript((scheme: ColorScheme) => {
    try {
      localStorage.setItem('starlight-theme', scheme);
    } catch {
      // Private mode or blocked storage: Starlight falls back to the media query.
    }
  }, colorScheme);
}

/** Pages exercised by the axe, visual and smoke suites. Extend as sections land. */
export const KEY_PATHS = [
  '/',
  '/en/',
  '/sign/',
  '/en/sign/',
  '/sign/signing/',
  '/en/sign/signing/',
  '/sign/admin/own-certificate/',
  '/sign/legal/terms/',
  '/sign/developers/webhooks/',
  '/sign/api/',
  '/sign/api/operations/createenvelope/',
  '/404.html',
] as const;
