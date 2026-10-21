import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { LEGAL_VERSION } from '../../src/config/content-schema';
import { legalHeaderFor } from '../../src/lib/legal';
import { LEGAL_MIRRORS } from '../../scripts/legal-mirror.mjs';

const ROOT = process.cwd();
const DOCS = join(ROOT, 'src', 'content', 'docs');
const DIST = join(ROOT, 'dist');

const read = (localeDir: string, slug: string): string => {
  for (const ext of ['md', 'mdx']) {
    const file = join(DOCS, localeDir, `${slug}.${ext}`);
    if (existsSync(file)) return readFileSync(file, 'utf8');
  }
  throw new Error(`missing ${localeDir}/${slug}`);
};

const frontmatterValue = (text: string, key: string): string | undefined =>
  text.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm'))?.[1];

const body = (text: string): string => text.replace(/^---\n[\s\S]*?\n---\n/, '');

/**
 * The structure a translation must keep: numbered section headings (`## 1.`), clause markers at the start of a
 * paragraph (`**2.4**`, `**3.1 Plazo fijo.**`), the history items (`- Versión 4 (2026-10-20)`), the number of
 * headings of each level, and every code block byte for byte.
 */
function structure(text: string) {
  const b = body(text);
  return {
    sections: [...b.matchAll(/^## (\d+)\./gm)].map((m) => m[1]),
    clauses: [...b.matchAll(/^\*\*(\d+\.\d+)\b/gm)].map((m) => m[1]),
    history: [...b.matchAll(/^- Versi[oó]n (\d+) \((\d{4}-\d{2}-\d{2})\)/gm)].map((m) => `${m[1]} ${m[2]}`),
    headings: { h2: (b.match(/^## /gm) ?? []).length, h3: (b.match(/^### /gm) ?? []).length },
    code: [...b.matchAll(/```[\s\S]*?```/g)].map((m) => m[0]),
  };
}

// Built from parts so the phrase never appears in this repository's sources (acceptance criterion 6).
const BANNER = [new RegExp(['pendiente', 'de', 'revisi[oó]n', 'jur[ií]dica'].join('\\s+'), 'i'), new RegExp(['pending', 'legal', 'review'].join('\\s+'), 'i')];

function walk(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full, keep);
    return keep(name) ? [full] : [];
  });
}

describe('legal header (src/lib/legal.ts)', () => {
  test('only a legal page gets a header', () => {
    expect(legalHeaderFor({}, 'es')).toBeNull();
    expect(legalHeaderFor({ legalVersion: 'Versión 4 · 2026-10-20' }, 'en')).toBeNull();
  });

  test('a versioned text shows its version, and the English one also says Spanish prevails', () => {
    expect(legalHeaderFor({ legal: true, legalVersion: 'Versión 4 · 2026-10-20' }, 'es')).toEqual({ version: 'Versión 4 · 2026-10-20', prevails: false });
    expect(legalHeaderFor({ legal: true, legalVersion: 'Versión 4 · 2026-10-20' }, 'en')).toEqual({ version: 'Versión 4 · 2026-10-20', prevails: true });
  });

  test('a guide has no version: nothing in Spanish, only the prevails note in English', () => {
    expect(legalHeaderFor({ legal: true }, 'es')).toBeNull();
    expect(legalHeaderFor({ legal: true }, 'en')).toEqual({ prevails: true });
  });
});

describe('legal mirrors', () => {
  for (const mirror of LEGAL_MIRRORS) {
    test(`${mirror.page}: both locales are legal pages from the same source, with the same version`, () => {
      const es = read('', mirror.page);
      const en = read('en', mirror.page);
      for (const text of [es, en]) {
        expect(frontmatterValue(text, 'legal')).toBe('true');
        expect(frontmatterValue(text, 'source')).toBe(mirror.source);
      }
      const version = frontmatterValue(es, 'legalVersion');
      expect(frontmatterValue(en, 'legalVersion')).toBe(version);
      if (mirror.versioned) expect(version).toMatch(LEGAL_VERSION);
      else expect(version).toBeUndefined();
      // The version is shown once, by the header: never again as a line in the body.
      expect(body(es)).not.toMatch(/^\*\*Versi[oó]n \d+\*\*/m);
      expect(body(en)).not.toMatch(/^\*\*Versi[oó]n \d+\*\*/m);
      // No page imports the header; the PageTitle override renders it.
      expect(en).not.toContain('LegalHeader');
    });

    test(`${mirror.page}: the English translation keeps every section, clause, history item and code block`, () => {
      const es = structure(read('', mirror.page));
      const en = structure(read('en', mirror.page));
      expect(en).toEqual(es);
    });
  }

  test('the terms carry the clauses of Versión 4, including 2.4 and section 3, and nothing invented', () => {
    const { clauses, history, sections } = structure(read('', 'sign/legal/terms'));
    expect(sections).toEqual(['1', '2', '3']);
    expect(clauses).toEqual(['1.1', '1.2', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '3.1', '3.2', '3.3']);
    expect(history).toEqual(['1 2026-10-07', '2 2026-10-19', '3 2026-10-19', '4 2026-10-20']);
  });

  test('the legal-review banner appears nowhere in the site, its rules or its tests', () => {
    const files = [
      ...walk(join(ROOT, 'src'), () => true),
      ...walk(join(ROOT, 'tests'), (name) => /\.(ts|js|mjs|json)$/.test(name)),
      ...walk(join(ROOT, 'scripts'), () => true),
      join(ROOT, 'CLAUDE.md'),
      join(ROOT, 'README.md'),
    ];
    const offending = files.filter((file) => BANNER.some((re) => re.test(readFileSync(file, 'utf8'))));
    expect(offending).toEqual([]);
  });
});

/**
 * The built pages, so the header is checked where the reader sees it. `npm run build` runs before the unit
 * tests in `npm run verify` and in CI (pipeline.yml); run it first when running `npm test` alone.
 */
describe('legal pages as built', () => {
  const html = (route: string): string => {
    const file = join(DIST, route, 'index.html');
    if (!existsSync(file)) throw new Error(`${file} is missing: run \`npm run build\` before the unit tests`);
    return readFileSync(file, 'utf8');
  };
  const headers = (page: string): string[] => [...page.matchAll(/<div class="bb-legal-header"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[0]);

  for (const mirror of LEGAL_MIRRORS) {
    test(`${mirror.page}: the header shows exactly what the frontmatter says, once`, () => {
      const version = frontmatterValue(read('', mirror.page), 'legalVersion');
      const es = headers(html(mirror.page));
      const en = headers(html(`en/${mirror.page}`));
      if (version) {
        expect(es).toHaveLength(1);
        expect(es[0]).toContain(`data-legal-version="${version}"`);
        expect(es[0]).toContain(`<strong>${version}</strong>`);
      } else {
        expect(es).toHaveLength(0);
      }
      expect(en).toHaveLength(1);
      expect(en[0]).toContain('The Spanish version prevails.');
      if (version) expect(en[0]).toContain(`<strong>${version}</strong>`);
    });
  }

  test('no built page carries the legal-review banner', () => {
    const pages = walk(DIST, (name) => name.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(0);
    const offending = pages.filter((file) => BANNER.some((re) => re.test(readFileSync(file, 'utf8'))));
    expect(offending).toEqual([]);
  });
});
