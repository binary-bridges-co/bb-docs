/**
 * What the header of a mirrored legal page shows (plan decision D3, R2-2). The Starlight
 * `PageTitle` override calls this with the page's frontmatter; no page imports the header itself,
 * so it renders exactly once.
 *
 *   - A page without `legal: true` has no header.
 *   - A versioned text shows its `legalVersion` ("Versión 4 · 2026-10-20") in both locales.
 *   - An English page (a translation) also says the Spanish version prevails.
 *   - A Spanish text without a version (the guides) has nothing to show, so no header.
 */
export type LegalLocale = 'es' | 'en';

export interface LegalFrontmatter {
  readonly legal?: boolean;
  readonly legalVersion?: string;
}

export interface LegalHeaderModel {
  readonly version?: string;
  readonly prevails: boolean;
}

export function legalHeaderFor(data: LegalFrontmatter, locale: LegalLocale): LegalHeaderModel | null {
  if (data.legal !== true) return null;
  const prevails = locale === 'en';
  if (!data.legalVersion && !prevails) return null;
  return data.legalVersion ? { version: data.legalVersion, prevails } : { prevails };
}
