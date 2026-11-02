import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PRODUCTS } from '../../src/config/products';
import { LEGAL_LINK_MAP, LEGAL_MIRRORS, LegalMirrorError, renderLegalPage, transformLegalMarkdown } from '../../scripts/legal-mirror.mjs';

const SYNC = join(process.cwd(), 'src', 'content', 'sync');
const DOCS = join(process.cwd(), 'src', 'content', 'docs');
const PUBLIC_SYNC = join(process.cwd(), 'public', 'sync');
const SCRIPT = join(process.cwd(), 'scripts', 'sync-product.mjs');

/** One synced file: where it came from, at which release, and what was rewritten in it. */
interface ManifestEntry {
  readonly source: string;
  readonly sha256: string;
  readonly ref: string;
  readonly commit: string;
  readonly commitDate: string;
  readonly uncommitted?: true;
  readonly rewrites?: readonly string[];
}

interface Manifest {
  readonly repo: string;
  readonly files: Readonly<Record<string, ManifestEntry>>;
}

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/**
 * The synced files are the only content bb-docs does not author. The manifest
 * says where each one came from, and these tests make sure the copy on disk
 * is exactly what the manifest describes.
 */
describe('synced product files', () => {
  for (const product of PRODUCTS.filter((p) => p.sync.openapi)) {
    const dir = join(SYNC, product.id);
    const manifest = JSON.parse(readFileSync(join(dir, `${product.id}.json`), 'utf8')) as Manifest;

    test(`${product.id}: manifest names the repo, and each file its release and commit`, () => {
      expect(manifest.repo).toBe(product.repo);
      expect(Object.keys(manifest).sort()).toEqual(['files', 'repo']);
      for (const [name, entry] of Object.entries(manifest.files)) {
        expect(entry.ref, name).toMatch(/^[A-Za-z0-9._/-]+$/);
        expect(entry.commit, name).toMatch(/^[0-9a-f]{40}$/);
        // The commit date, not the wall clock: the same commit always syncs to the same bytes.
        expect(entry.commitDate, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry, name).not.toHaveProperty('syncedAt');
        // A release sync never records uncommitted changes.
        expect(entry.uncommitted, name).toBeUndefined();
      }
    });

    test(`${product.id}: the contract and the vectors stay at their release; the terms come from v0.42.0 (plan D13)`, () => {
      expect(manifest.files['openapi.json']?.ref).toBe('v0.38.0');
      expect(manifest.files['webhook-signature-vectors.json']?.ref).toBe('v0.38.0');
      expect(manifest.files['legal/terminos-y-condiciones.md']?.ref).toBe('v0.42.0');
    });

    test(`${product.id}: the manifest lists the contract and every extra file of the registry`, () => {
      const sources = Object.values(manifest.files).map((f) => f.source).sort();
      expect(sources).toEqual([product.sync.openapi, ...(product.sync.extra ?? [])].sort());
    });

    test(`${product.id}: legal texts are pages, never published as downloads`, () => {
      const legal = Object.keys(manifest.files).filter((name) => name.startsWith('legal/'));
      expect(legal.length).toBe(LEGAL_MIRRORS.length);
      for (const name of legal) expect(existsSync(join(PUBLIC_SYNC, product.id, name)), name).toBe(false);
    });

    for (const mirror of LEGAL_MIRRORS) {
      test(`${product.id}: ${mirror.page}.md is exactly what the generator makes of ${mirror.synced}`, () => {
        expect(manifest.files[mirror.synced]?.source).toBe(mirror.source);
        const synced = readFileSync(join(dir, mirror.synced), 'utf8');
        const generated = readFileSync(join(DOCS, `${mirror.page}.md`), 'utf8');
        expect(generated).toBe(renderLegalPage(synced, mirror, product.id));
      });
    }

    test(`${product.id}: every manifest file exists and its hash matches`, () => {
      for (const [name, meta] of Object.entries(manifest.files)) {
        const file = join(dir, name);
        expect(existsSync(file), file).toBe(true);
        expect(sha256(readFileSync(file))).toBe(meta.sha256);
      }
    });

    test(`${product.id}: the OpenAPI copy points at the production API and nothing else was rewritten`, () => {
      const spec = JSON.parse(readFileSync(join(dir, 'openapi.json'), 'utf8')) as { servers?: { url: string }[] };
      expect(spec.servers?.[0]?.url).toBe('https://sign-api.binarybridges.co');
      // The rewrite lives in the contract's own entry, so a partial sync of another file never drops it.
      expect(manifest.files['openapi.json']?.rewrites).toEqual(['servers[0].url']);
      for (const [name, entry] of Object.entries(manifest.files)) if (name !== 'openapi.json') expect(entry.rewrites, name).toBeUndefined();
      expect(manifest.files['openapi.json']?.source).toBe(product.sync.openapi);
    });
  }
});

describe('sync-product.mjs input validation', () => {
  const run = (...args: string[]) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

  test('rejects an unknown product and lists the valid ids', () => {
    const result = run('foo');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Valid ids: sign');
  });

  test('rejects a ref that is not a plain git ref', () => {
    const result = run('sign', 'x; rm -rf /');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must match');
  });

  test('rejects a --from path that does not exist', () => {
    const result = run('sign', '--from', '/nonexistent/bb-sign');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not exist');
  });

  test('rejects an --only name that is not a synced file', () => {
    const result = run('sign', '--only', 'legal/certificado-propio.md', '--from', process.cwd());
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--only names no synced file');
  });

  test('refuses a remote clone without a token', () => {
    const result = spawnSync('node', [SCRIPT, 'sign'], { encoding: 'utf8', env: { ...process.env, PRODUCT_REPO_TOKEN: '' } });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PRODUCT_REPO_TOKEN');
  });
});

/**
 * A partial sync (plan B7) runs against a temp copy of this repository's synced files and a throwaway product repo
 * that holds only the terms. Every file it was not asked to copy must stay byte-identical.
 */
describe('sync-product.mjs --only', () => {
  test('copies only the named file, keeps every other file and manifest entry, and regenerates the page', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'bb-docs-sync-test-'));
    try {
      const root = join(scratch, 'docs');
      const repo = join(scratch, 'product');
      cpSync(join(SYNC, 'sign'), join(root, 'src', 'content', 'sync', 'sign'), { recursive: true });
      cpSync(join(PUBLIC_SYNC, 'sign'), join(root, 'public', 'sync', 'sign'), { recursive: true });
      mkdirSync(join(root, 'src', 'content', 'docs', 'sign', 'legal'), { recursive: true });
      const terms = readFileSync(join(SYNC, 'sign', 'legal', 'terminos-y-condiciones.md'), 'utf8');
      const changed = `${terms}\nUn párrafo nuevo.\n`;
      mkdirSync(join(repo, 'docs', 'legal'), { recursive: true });
      writeFileSync(join(repo, 'docs', 'legal', 'terminos-y-condiciones.md'), changed);
      const git = (...args: string[]) => execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { stdio: 'pipe' });
      git('init', '-q');
      git('add', '.');
      git('commit', '-q', '-m', 'terms');

      const before = JSON.parse(readFileSync(join(SYNC, 'sign', 'sign.json'), 'utf8')) as Manifest;
      const result = spawnSync('node', [SCRIPT, 'sign', '--from', repo, '--only', 'legal/terminos-y-condiciones.md'], {
        encoding: 'utf8',
        env: { ...process.env, BB_DOCS_SYNC_ROOT: root },
      });
      expect(result.status, result.stderr).toBe(0);

      const out = join(root, 'src', 'content', 'sync', 'sign');
      const after = JSON.parse(readFileSync(join(out, 'sign.json'), 'utf8')) as Manifest;
      for (const name of ['openapi.json', 'webhook-signature-vectors.json']) {
        expect(readFileSync(join(out, name)).equals(readFileSync(join(SYNC, 'sign', name))), name).toBe(true);
        expect(readFileSync(join(root, 'public', 'sync', 'sign', name)).equals(readFileSync(join(PUBLIC_SYNC, 'sign', name))), name).toBe(true);
        expect(after.files[name], name).toEqual(before.files[name]);
      }
      expect(readFileSync(join(out, 'legal', 'terminos-y-condiciones.md'), 'utf8')).toBe(changed);
      expect(after.files['legal/terminos-y-condiciones.md']?.ref).toMatch(/^local:/);
      expect(after.files['legal/terminos-y-condiciones.md']?.sha256).toBe(sha256(Buffer.from(changed)));
      expect(after.files['openapi.json']?.rewrites).toEqual(['servers[0].url']);
      const mirror = LEGAL_MIRRORS[0];
      expect(readFileSync(join(root, 'src', 'content', 'docs', `${mirror.page}.md`), 'utf8')).toBe(renderLegalPage(changed, mirror, 'sign'));
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

describe('legal mirror transforms (plan D3)', () => {
  const terms = { synced: 'legal/t.md', versioned: true };
  const guide = { synced: 'legal/g.md', versioned: false };
  const source = [
    '# Términos',
    '',
    '**Versión 4** · 2026-10-20',
    '',
    'Ver la [guía](/guias/certificado-propio) y [otra](/guias/conservacion-y-restauracion), o [los términos](/legal/terminos).',
    '',
    '**3.1 Plazo fijo.** Un [enlace externo](https://example.com/x) no cambia.',
    '',
  ].join('\n');

  test('(a) drops the H1 and uses it as the title; (b) moves the version line into legalVersion', () => {
    const result = transformLegalMarkdown(source, terms);
    expect(result.title).toBe('Términos');
    expect(result.legalVersion).toBe('Versión 4 · 2026-10-20');
    expect(result.body.startsWith('Ver la [guía]')).toBe(true);
    expect(result.body).not.toContain('**Versión 4**');
  });

  test('(c) rewrites exactly the mapped app links and leaves every other byte alone', () => {
    const { body } = transformLegalMarkdown(source, terms);
    expect(body).toContain(`[guía](${LEGAL_LINK_MAP['/guias/certificado-propio']})`);
    expect(body).toContain(`[otra](${LEGAL_LINK_MAP['/guias/conservacion-y-restauracion']})`);
    expect(body).toContain(`[los términos](${LEGAL_LINK_MAP['/legal/terminos']})`);
    expect(body).toContain('[enlace externo](https://example.com/x)');
    const undo = Object.entries(LEGAL_LINK_MAP).reduce((text, [app, docs]) => text.split(`](${docs})`).join(`](${app})`), body);
    expect(undo).toBe(source.split('\n').slice(4).join('\n'));
  });

  test('the in-app guide routes point at the bb-docs pages the app links to (plan D1, D4)', () => {
    expect(LEGAL_LINK_MAP['/guias/certificado-propio']).toBe('/sign/admin/own-certificate');
    expect(LEGAL_LINK_MAP['/guias/conservacion-y-restauracion']).toBe('/sign/sending/retention-and-restore');
  });

  test('a guide without a version line has no legalVersion', () => {
    expect(transformLegalMarkdown('# Guía\n\nTexto.\n', guide)).toEqual({ title: 'Guía', legalVersion: undefined, body: 'Texto.\n' });
  });

  test('refuses an unknown app-relative link, a raw or reference link, a malformed or missing version, and no H1', () => {
    const fails = (text: string, mirror = guide) => () => transformLegalMarkdown(text, mirror);
    expect(fails('# T\n\n[x](/otra/ruta)\n')).toThrow(LegalMirrorError);
    expect(fails('# T\n\n[x](/legal/terminos#2)\n')).toThrow(/no docs route/);
    expect(fails('# T\n\n<a href="/legal/terminos">x</a>\n')).toThrow(/outside an inline link/);
    expect(fails('# T\n\n[x]: /legal/terminos\n')).toThrow(/outside an inline link/);
    expect(fails('# T\n\n**Versión 3** · 2026-10-19 · **Aviso.**\n')).toThrow(/malformed version line/);
    expect(fails('# T\n\nTexto.\n', terms)).toThrow(/version line is missing/);
    expect(fails('Texto sin título.\n')).toThrow(/not an H1/);
  });

  test('the rendered page carries the frontmatter and the GENERATED notice', () => {
    const page = renderLegalPage(source, { ...terms, source: 'docs/legal/t.md', page: 'sign/legal/t', description: 'Una descripción.' }, 'sign');
    expect(page.startsWith('---\n# GENERATED by scripts/sync-product.mjs from sign:docs/legal/t.md. Do not edit')).toBe(true);
    expect(page).toContain('\ntitle: "Términos"\ndescription: "Una descripción."\nproduct: sign\naudience: legal\nsource: docs/legal/t.md\nlegal: true\nlegalVersion: "Versión 4 · 2026-10-20"\n---\n\nVer la [guía]');
  });
});
