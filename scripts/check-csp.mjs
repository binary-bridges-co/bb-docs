#!/usr/bin/env node
/**
 * Fails when the built HTML contains an inline <script> whose sha256 is not
 * whitelisted in security-headers.conf — i.e. when the CSP would block it in
 * production. Run after `astro build`.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const POLICY = readFileSync('security-headers.conf', 'utf8');
// Inline, executable scripts only: JSON-LD (type="application/ld+json") is a
// data block the browser never executes, so CSP does not apply to it.
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;

const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith('.html') ? [path] : [];
  });

const missing = htmlFiles(DIST).flatMap((file) =>
  Array.from(readFileSync(file, 'utf8').matchAll(INLINE_SCRIPT), ([, body]) => {
    const hash = `sha256-${createHash('sha256').update(body).digest('base64')}`;
    return POLICY.includes(`'${hash}'`) ? [] : [`${file}: ${hash}`];
  }).flat(),
);

if (missing.length > 0) {
  console.error('Inline scripts not allowed by the CSP in security-headers.conf:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('CSP: every inline script is whitelisted.');
