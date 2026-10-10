import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { LEGAL_VERSION } from '../../src/config/content-schema';

const DOCS = join(process.cwd(), 'src', 'content', 'docs');

/** Legal pages per product; the terms are the one that mirrors a canonical bb-sign file. */
const LEGAL_PAGES = ['sign/legal/terms'] as const;

const read = (localeDir: string, slug: string): string => {
  for (const ext of ['md', 'mdx']) {
    try {
      return readFileSync(join(DOCS, localeDir, `${slug}.${ext}`), 'utf8');
    } catch {
      // try the next extension
    }
  }
  throw new Error(`missing ${localeDir}/${slug}`);
};

const versionOf = (text: string): string => text.match(/^legalVersion:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? '';

describe('legal pages', () => {
  for (const slug of LEGAL_PAGES) {
    test(`${slug} carries the same legal version in both locales and the pending-review header`, () => {
      const es = read('', slug);
      const en = read('en', slug);
      const esVersion = versionOf(es);
      expect(esVersion).toMatch(LEGAL_VERSION);
      expect(versionOf(en)).toBe(esVersion);
      expect(es).toContain('<LegalHeader');
      expect(en).toContain('<LegalHeader');
      expect(es).toMatch(/source:\s*docs\/legal\//);
    });
  }

  test('the Spanish terms keep the canonical clauses verbatim', () => {
    const es = read('', 'sign/legal/terms');
    for (const sentence of [
      'No es firma digital en los términos del artículo 28 de la Ley 527 de 1999.',
      'La falta de un certificado propio no impide enviar sobres',
      'bb-sign guarda el archivo del certificado y su contraseña cifrados',
    ]) {
      expect(es).toContain(sentence);
    }
  });
});
