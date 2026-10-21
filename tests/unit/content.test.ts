import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';
import { AUDIENCES, DESCRIPTION_MAX, DESCRIPTION_MIN, PRODUCT_IDS } from '../../src/config/content-schema';
import { LEGAL_MIRRORS } from '../../scripts/legal-mirror.mjs';

const DOCS = join(process.cwd(), 'src', 'content', 'docs');

/** Pages that exist in one locale only, on purpose. Generated API pages never live here. */
const FALLBACK_ALLOW_LIST: readonly string[] = [];

const EMOJI = /\p{Extended_Pictographic}/u;
// Typed arrows count too: bb-sign bans them in copy — icons are drawn, not typed.
const TYPED_ARROWS = /[←-⇿]/u;

/**
 * Numbers that must come from the fact sheet, never be typed in prose. The
 * regexes match the literal with its usual unit in either language; a value
 * rendered by <Fact> is JSX, not prose, so it does not match.
 */
const FACT_DENYLIST: readonly RegExp[] = [
  /\b365\s*(d[ií]as|days)\b/i,
  /\b90\s*(d[ií]as|days)\b/i,
  /\b30\s*(d[ií]as|days)\b/i,
  /\b72\s*(h|horas|hours)\b/i,
  /\b900\s*(s|segundos|seconds)\b/i,
  /\b15\s*(min|minutos|minutes)\b/i,
  /\b300\s*(s|segundos|seconds)\b/i,
  /\b50\s*MB\b/,
  /\b500\s*MB\b/,
  /\b5\s*MB\b/,
  /\b2048\s*bits\b/i,
  /\b48\s*(h|horas|hours)\b/i,
  // Added with bb-sign v0.34 (report 1 §2): restore window, stamp hold and the 7-day notice; restore time;
  // verify-by-file and audit rates; the evidence wait; the restore purge.
  /\b7\s*(d[ií]as|days)\b/i,
  /\b3\s*(a|-)\s*5\s*(h|horas|hours)\b/i,
  /\b10\s*(por minuto|per minute)\b/i,
  /\b20\s*(por minuto|per minute)\b/i,
  /\b2\s*(h|horas|hours)\b/i,
  /\b400\s*(d[ií]as|days)\b/i,
];

/**
 * The legal mirrors (plan D3): the Spanish pages are generated verbatim from bb-sign and the English ones
 * translate them faithfully, so their numbers are the legal text's own, not prose to source from the fact
 * sheet. `tests/unit/legal.test.ts` and `sync.test.ts` guard them instead.
 */
const LEGAL_MIRROR_PATHS: readonly string[] = LEGAL_MIRRORS.map((m) => m.page);
/** Generated pages are byte-faithful to the source, which may type an arrow ("Configuración → Certificado"). */
const isGeneratedMirror = (page: Page): boolean => page.localeDir === '' && LEGAL_MIRROR_PATHS.includes(page.path);

interface Page {
  readonly file: string;
  readonly localeDir: '' | 'en';
  readonly path: string;
  readonly frontmatter: Record<string, string>;
  readonly body: string;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.mdx?$/.test(name) ? [full] : [];
  });
}

function parse(file: string): Page {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const frontmatter: Record<string, string> = {};
  for (const line of (match?.[1] ?? '').split('\n')) {
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (kv) frontmatter[kv[1] as string] = (kv[2] as string).replace(/^["']|["']$/g, '');
  }
  const rel = relative(DOCS, file).replace(/\.mdx?$/, '');
  const localeDir = rel.startsWith('en/') ? 'en' : '';
  return { file, localeDir, path: localeDir ? rel.slice(3) : rel, frontmatter, body: match?.[2] ?? '' };
}

/** Prose only: strip frontmatter imports, JSX tags, code fences and inline code. */
function prose(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^import .*$/gm, '');
}

const pages = walk(DOCS).map(parse);
const productPages = pages.filter((p) => p.path !== 'index');

describe('documentation pages', () => {
  test('every product page declares its product, and it equals its folder', () => {
    for (const page of productPages) {
      const folder = page.path.split('/')[0] ?? '';
      expect(page.frontmatter.product, page.file).toBe(folder);
      expect(PRODUCT_IDS).toContain(folder);
    }
  });

  test('every product page declares an audience', () => {
    for (const page of productPages) {
      expect(AUDIENCES, page.file).toContain(page.frontmatter.audience);
    }
  });

  test('descriptions fit what search engines display', () => {
    for (const page of pages) {
      const description = page.frontmatter.description ?? '';
      expect(description.length, `${page.file}: "${description}"`).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(description.length, page.file).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  test('both locales have the same pages, except the documented fallbacks', () => {
    const es = new Set(pages.filter((p) => p.localeDir === '').map((p) => p.path));
    const en = new Set(pages.filter((p) => p.localeDir === 'en').map((p) => p.path));
    const onlyEs = [...es].filter((p) => !en.has(p) && !FALLBACK_ALLOW_LIST.includes(p));
    const onlyEn = [...en].filter((p) => !es.has(p));
    expect(onlyEs, 'pages missing in English').toEqual([]);
    expect(onlyEn, 'pages missing in Spanish').toEqual([]);
  });

  test('no emoji or typed arrows anywhere, code included', () => {
    const offending = pages
      .filter((p) => EMOJI.test(p.body) || (!isGeneratedMirror(p) && TYPED_ARROWS.test(p.body)) || EMOJI.test(p.frontmatter.title ?? ''))
      .map((p) => p.file);
    expect(offending).toEqual([]);
  });

  test('facts are imported from the fact sheet, not typed in prose', () => {
    const offending = productPages.filter((p) => !LEGAL_MIRROR_PATHS.includes(p.path)).flatMap((p) => {
      const text = prose(p.body);
      return FACT_DENYLIST.filter((re) => re.test(text)).map((re) => `${relative(process.cwd(), p.file)}: ${re}`);
    });
    expect(offending).toEqual([]);
  });

  test('a page never links to another product by relative path', () => {
    for (const page of productPages) {
      const product = page.frontmatter.product;
      const links = [...page.body.matchAll(/\]\((\/(?:en\/)?([a-z-]+)\/[^)]*)\)/g)].map((m) => m[2]);
      const foreign = links.filter((id) => PRODUCT_IDS.includes(id as never) && id !== product);
      expect(foreign, page.file).toEqual([]);
    }
  });

  test('internal links use the page locale prefix', () => {
    for (const page of productPages) {
      const links = [...page.body.matchAll(/\]\((\/[^)#]*)\)/g)].map((m) => m[1] ?? '');
      const generatedApi = (href: string) => /^\/sign\/api\//.test(href);
      const wrong = links.filter((href) => !generatedApi(href) && (page.localeDir === 'en') !== href.startsWith('/en/'));
      expect(wrong, page.file).toEqual([]);
    }
  });

  test('the denylist exemptions cover exactly the legal mirrors, in both locales', () => {
    const mirrors = productPages.filter((p) => LEGAL_MIRROR_PATHS.includes(p.path));
    expect(mirrors).toHaveLength(LEGAL_MIRROR_PATHS.length * 2);
    for (const page of mirrors) expect(page.frontmatter.legal, page.file).toBe('true');
    expect(productPages.filter((p) => p.frontmatter.legal === 'true').map((p) => p.path).sort()).toEqual(
      [...LEGAL_MIRROR_PATHS, ...LEGAL_MIRROR_PATHS].sort(),
    );
  });
});
