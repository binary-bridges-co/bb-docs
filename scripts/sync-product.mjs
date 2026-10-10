#!/usr/bin/env node
/**
 * Copies the files that stay canonical in a product repository into
 * `src/content/sync/<product>/`, and records where they came from.
 *
 *   node scripts/sync-product.mjs sign                 # clone binary-bridges-co/bb-sign at main
 *   node scripts/sync-product.mjs sign v0.4.0          # at a tag or branch
 *   node scripts/sync-product.mjs sign --from ../bb-sign   # from a local checkout
 *
 * A remote clone needs PRODUCT_REPO_TOKEN (a read-only token for the repo).
 *
 * The copy is written to a temp directory and renamed into place, so a failed
 * sync leaves the previous files intact. Exits 1 and lists every missing file
 * rather than publishing a partial set. The only edit made to any file is the
 * OpenAPI `servers[0].url`, rewritten to the production API, and the manifest
 * says so.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SYNC_DIR = join(ROOT, 'src', 'content', 'sync');
const REF_PATTERN = /^[A-Za-z0-9._/-]{1,80}$/;

/** Per-product sync sources. Mirrors `src/config/products.ts` (which is TypeScript and not importable here). */
const PRODUCTS = {
  sign: {
    repo: 'binary-bridges-co/bb-sign',
    apiUrl: 'https://sign-api.binarybridges.co',
    files: {
      'openapi.json': 'docs/api/openapi.json',
      'webhook-signature-vectors.json': 'docs/api/webhook-signature-vectors.json',
    },
  },
};

function fail(message) {
  console.error(`sync-product: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const [productId, ...rest] = argv;
  if (!productId || !(productId in PRODUCTS)) {
    fail(`unknown product "${productId ?? ''}". Valid ids: ${Object.keys(PRODUCTS).join(', ')}`);
  }
  let ref = 'main';
  let from;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--from') {
      from = rest[i + 1];
      i += 1;
    } else {
      ref = rest[i];
    }
  }
  if (!REF_PATTERN.test(ref)) fail(`ref "${ref}" must match ${REF_PATTERN}`);
  if (from !== undefined && !existsSync(from)) fail(`--from path does not exist: ${from}`);
  return { productId, ref, from };
}

function checkout(product, ref, from, scratch) {
  if (from) {
    const commit = execFileSync('git', ['-C', from, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    return { dir: resolve(from), commit, ref: `local:${basename(resolve(from))}` };
  }
  const token = process.env.PRODUCT_REPO_TOKEN;
  if (!token) fail('PRODUCT_REPO_TOKEN is not set and no --from path was given');
  const dir = join(scratch, 'repo');
  const url = `https://x-access-token:${token}@github.com/${product.repo}.git`;
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', ref, '--filter=blob:none', '--sparse', url, dir], { stdio: 'pipe' });
  const paths = [...new Set(Object.values(product.files).map((p) => dirname(p)))];
  execFileSync('git', ['-C', dir, 'sparse-checkout', 'set', ...paths], { stdio: 'pipe' });
  const commit = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  return { dir, commit, ref };
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function rewriteServers(json, apiUrl) {
  const spec = JSON.parse(json);
  const rewrites = [];
  if (Array.isArray(spec.servers) && spec.servers[0]) {
    spec.servers[0] = { url: apiUrl, description: 'Production' };
    rewrites.push('servers[0].url');
  }
  return { text: `${JSON.stringify(spec, null, 2)}\n`, rewrites };
}

function main() {
  const { productId, ref, from } = parseArgs(process.argv.slice(2));
  const product = PRODUCTS[productId];
  const scratch = mkdtempSync(join(tmpdir(), 'bb-docs-sync-'));
  try {
    const source = checkout(product, ref, from, scratch);
    const missing = Object.values(product.files).filter((p) => !existsSync(join(source.dir, p)));
    if (missing.length > 0) fail(`missing in ${product.repo}@${source.ref}:\n  ${missing.join('\n  ')}`);

    const staged = join(scratch, 'staged');
    mkdirSync(staged, { recursive: true });
    const files = {};
    let rewrites = [];
    for (const [target, sourcePath] of Object.entries(product.files)) {
      let bytes = readFileSync(join(source.dir, sourcePath));
      if (target === 'openapi.json') {
        const result = rewriteServers(bytes.toString('utf8'), product.apiUrl);
        bytes = Buffer.from(result.text);
        rewrites = result.rewrites;
      }
      writeFileSync(join(staged, target), bytes);
      files[target] = { source: sourcePath, sha256: sha256(bytes) };
    }

    const manifest = {
      repo: product.repo,
      ref: source.ref,
      commit: source.commit,
      syncedAt: new Date().toISOString().slice(0, 10),
      rewrites,
      files,
    };
    writeFileSync(join(staged, `${productId}.json`), `${JSON.stringify(manifest, null, 2)}\n`);

    mkdirSync(SYNC_DIR, { recursive: true });
    const target = join(SYNC_DIR, productId);
    const previous = join(SYNC_DIR, `${productId}.tmp`);
    if (existsSync(target)) renameSync(target, previous);
    try {
      cpSync(staged, target, { recursive: true });
    } catch (error) {
      if (existsSync(previous)) renameSync(previous, target);
      throw error;
    }
    rmSync(previous, { recursive: true, force: true });
    console.log(`sync-product: ${productId} synced from ${product.repo}@${source.ref} (${source.commit.slice(0, 12)})`);
    for (const [name, meta] of Object.entries(files)) console.log(`  ${name}  ${meta.sha256.slice(0, 12)}  <- ${meta.source}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main();
