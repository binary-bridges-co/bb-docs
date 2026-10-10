import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

/**
 * The deploy contract with bb-infrastructure: `apps/docs/` there targets port
 * 3000 and probes `/healthz`, and Flux's ImagePolicy orders on the
 * `main-<timestamp>-<sha>` tag. Change any of these only together with the
 * infrastructure, on purpose.
 */
const nginx = readFileSync('nginx.conf', 'utf8');
const dockerfile = readFileSync('Dockerfile', 'utf8');
const pipeline = readFileSync('.github/workflows/pipeline.yml', 'utf8');
const headers = readFileSync('security-headers.conf', 'utf8');

describe('deploy contract', () => {
  test('nginx, the image and the probes agree on port 3000 and /healthz', () => {
    expect(nginx).toMatch(/^\s+listen 3000;/m);
    expect(nginx).toMatch(/location = \/healthz/);
    expect(dockerfile).toMatch(/^EXPOSE 3000$/m);
    expect(dockerfile).toContain('http://127.0.0.1:3000/healthz');
  });

  test('the image is unprivileged nginx built from the verified build', () => {
    expect(dockerfile).toMatch(/^FROM nginxinc\/nginx-unprivileged:/m);
    expect(dockerfile).toContain('RUN npm run build');
    expect(dockerfile).toContain('RUN nginx -t');
    expect(dockerfile).not.toMatch(/EMAILJS/);
  });

  test('CI pushes the Flux-sortable tag for ghcr.io/binary-bridges-co/bb-docs', () => {
    expect(pipeline).toContain('ghcr.io/binary-bridges-co/bb-docs:main-${{ steps.ts.outputs.value }}-${{ github.sha }}');
    expect(pipeline).toContain('format-local:%Y%m%dT%H%M%S');
    expect(pipeline).toContain('npm run build');
    expect(pipeline).toContain('npm run test:coverage');
  });

  test('security headers are complete and the CSP has no unsafe script source', () => {
    for (const name of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      expect(headers, name).toContain(`add_header ${name}`);
    }
    const csp = headers.match(/Content-Security-Policy "([^"]+)"/)?.[1] ?? '';
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
