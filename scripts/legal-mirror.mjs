/**
 * The legal mirror generator (plan sync-sign-v0-34, decision D3).
 *
 * bb-sign's legal texts are canonical in its repository. `sync-product.mjs` copies them into
 * `src/content/sync/sign/legal/` and calls `renderLegalPage` to write the Spanish pages under
 * `src/content/docs/sign/legal/`. The generator applies exactly three mechanical transforms and
 * nothing else:
 *
 *   (a) it drops the H1 (the page title comes from frontmatter, and is the H1 text);
 *   (b) it drops the `**Versión N** · YYYY-MM-DD` line and puts `Versión N · YYYY-MM-DD` into the
 *       frontmatter `legalVersion` (the PageTitle override renders it once);
 *   (c) it rewrites app-relative link targets through LEGAL_LINK_MAP, and fails on any other
 *       app-relative target.
 *
 * Every other byte stays identical. `tests/unit/sync.test.ts` re-applies these transforms to the
 * synced source and asserts byte equality with the generated page, so a hand edit is caught.
 *
 * Plain ESM with no dependencies: the sync script (Node) and the unit tests (Vitest) both import it.
 */

/** App routes in bb-sign's frontend and the docs pages that mirror them. Nothing else may be app-relative. */
export const LEGAL_LINK_MAP = Object.freeze({
  '/legal/terminos': '/sign/legal/terms',
  '/guias/certificado-propio': '/sign/legal/own-certificate-guide',
  '/guias/conservacion-y-restauracion': '/sign/legal/retention-guide',
});

/**
 * The three mirrored texts. `synced` is the path under `src/content/sync/<product>/`, `source` the path
 * in the product repo, `page` the docs slug of the generated Spanish page (its English twin is
 * `en/<page>`, a hand translation). `versioned` texts must carry the version line.
 */
export const LEGAL_MIRRORS = Object.freeze([
  Object.freeze({
    synced: 'legal/terminos-y-condiciones.md',
    source: 'docs/legal/terminos-y-condiciones.md',
    page: 'sign/legal/terms',
    versioned: true,
    description: 'Términos vigentes del servicio bb-sign: naturaleza del servicio, certificado de sello y conservación de documentos y evidencias.',
  }),
  Object.freeze({
    synced: 'legal/certificado-propio.md',
    source: 'docs/guias/certificado-propio.md',
    page: 'sign/legal/own-certificate-guide',
    versioned: false,
    description: 'Guía que acompaña los términos de bb-sign: qué certificado comprar, cómo exportarlo con su cadena, subirlo, renovarlo y comprobar un PDF sellado.',
  }),
  Object.freeze({
    synced: 'legal/conservacion-y-restauracion.md',
    source: 'docs/guias/conservacion-y-restauracion.md',
    page: 'sign/legal/retention-guide',
    versioned: false,
    description: 'Guía que acompaña la sección 3 de los términos: el plazo de conservación, las fechas, cómo restaurar un archivo y cómo guardar cada sobre.',
  }),
]);

const H1 = /^# (.+)$/;
const VERSION_LINE = /^\*\*Versión (\d+)\*\* · (\d{4}-\d{2}-\d{2})$/;
const VERSION_LIKE = /^\*\*Versi[oó]n\b/;
const INLINE_LINK_TARGET = /\]\((\/[^)\s]*)\)/g;
// App-relative targets the inline-link rewrite does not handle: reference definitions and raw HTML.
const OTHER_APP_RELATIVE = [/^\[[^\]]+\]:\s*\//m, /href\s*=\s*["']\//i, /src\s*=\s*["']\//i];

export class LegalMirrorError extends Error {}

/** Drops `lines[index]` and the blank line after it, if any. */
function dropLine(lines, index) {
  const count = lines[index + 1] === '' ? 2 : 1;
  return [...lines.slice(0, index), ...lines.slice(index + count)];
}

/**
 * Applies the three transforms to one synced Markdown file.
 * @param {string} markdown the synced file, byte for byte
 * @param {{ synced: string, versioned: boolean }} mirror
 * @returns {{ title: string, legalVersion: string | undefined, body: string }}
 */
export function transformLegalMarkdown(markdown, mirror) {
  let lines = markdown.split('\n');

  // (a) The H1 must be the first line.
  const h1 = lines[0]?.match(H1);
  if (!h1) throw new LegalMirrorError(`${mirror.synced}: the first line is not an H1`);
  const title = h1[1];
  lines = dropLine(lines, 0);

  // (b) At most one version line, strictly formed; a malformed one (for example with a banner after it) fails.
  let legalVersion;
  const versionIndexes = lines.flatMap((line, i) => (VERSION_LIKE.test(line) ? [i] : []));
  if (versionIndexes.length > 1) throw new LegalMirrorError(`${mirror.synced}: more than one version line`);
  if (versionIndexes.length === 1) {
    const index = versionIndexes[0];
    const match = lines[index].match(VERSION_LINE);
    if (!match) throw new LegalMirrorError(`${mirror.synced}: malformed version line "${lines[index]}"`);
    legalVersion = `Versión ${match[1]} · ${match[2]}`;
    lines = dropLine(lines, index);
  }
  if (mirror.versioned && !legalVersion) throw new LegalMirrorError(`${mirror.synced}: the version line is missing`);

  // (c) App-relative links: rewrite through the map, fail on anything else.
  let body = lines.join('\n');
  for (const pattern of OTHER_APP_RELATIVE) {
    if (pattern.test(body)) throw new LegalMirrorError(`${mirror.synced}: app-relative target outside an inline link (${pattern})`);
  }
  body = body.replace(INLINE_LINK_TARGET, (_link, target) => {
    const mapped = LEGAL_LINK_MAP[target];
    if (!mapped) throw new LegalMirrorError(`${mirror.synced}: no docs route for the app-relative link "${target}"`);
    return `](${mapped})`;
  });

  return { title, legalVersion, body };
}

/**
 * The full generated page: frontmatter (opening with the GENERATED notice as a YAML comment, so no renderer
 * emits it) and the transformed body.
 * @param {string} markdown the synced file
 * @param {{ synced: string, source: string, page: string, versioned: boolean, description: string }} mirror
 * @param {string} product the product id (frontmatter `product`)
 */
export function renderLegalPage(markdown, mirror, product) {
  const { title, legalVersion, body } = transformLegalMarkdown(markdown, mirror);
  const frontmatter = [
    '---',
    `# GENERATED by scripts/sync-product.mjs from ${product}:${mirror.source}. Do not edit: change the text in the product repository and re-sync.`,
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(mirror.description)}`,
    `product: ${product}`,
    'audience: legal',
    `source: ${mirror.source}`,
    'legal: true',
    ...(legalVersion ? [`legalVersion: ${JSON.stringify(legalVersion)}`] : []),
    '---',
  ];
  return `${frontmatter.join('\n')}\n\n${body}`;
}
