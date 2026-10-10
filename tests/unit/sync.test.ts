import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PRODUCTS } from '../../src/config/products';

const SYNC = join(process.cwd(), 'src', 'content', 'sync');
const SCRIPT = join(process.cwd(), 'scripts', 'sync-product.mjs');

interface Manifest {
  readonly repo: string;
  readonly ref: string;
  readonly commit: string;
  readonly syncedAt: string;
  readonly rewrites: readonly string[];
  readonly files: Readonly<Record<string, { readonly source: string; readonly sha256: string }>>;
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

    test(`${product.id}: manifest names the repo and a commit`, () => {
      expect(manifest.repo).toBe(product.repo);
      expect(manifest.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(manifest.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

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
      expect(manifest.rewrites).toEqual(['servers[0].url']);
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

  test('refuses a remote clone without a token', () => {
    const result = spawnSync('node', [SCRIPT, 'sign'], { encoding: 'utf8', env: { ...process.env, PRODUCT_REPO_TOKEN: '' } });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PRODUCT_REPO_TOKEN');
  });
});
