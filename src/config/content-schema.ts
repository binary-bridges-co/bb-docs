/**
 * Constants shared by the content schema (`src/content.config.ts`) and the
 * unit tests. They live here, outside the Astro virtual-module graph, so
 * Vitest can import them.
 */
export const PRODUCT_IDS = ['sign'] as const;
export const AUDIENCES = ['admin', 'user', 'signer', 'developer', 'legal', 'all'] as const;

/** "Versión 1 · 2026-10-07" — the header every legal text carries (LV contract D-17). */
export const LEGAL_VERSION = /^Versión \d+ · \d{4}-\d{2}-\d{2}$/;

/** Search engines cut descriptions around 155-160 characters; the limits are a little looser. */
export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 170;
