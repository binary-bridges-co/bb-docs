# bb-docs

The documentation hub for the Binary Bridges products — [docs.binarybridges.co](https://docs.binarybridges.co).
A static [Astro](https://astro.build) + [Starlight](https://starlight.astro.build) site, served by
unprivileged nginx, deployed by bb-infrastructure.

**Every product has its own section and nothing is shared between them.** A product is a URL prefix
(`/sign/`), a content folder, a sidebar topic and a card on the hub. The registry in
`src/config/products.ts` is the only place a product is declared; a unit test fails when any of the
other pieces is missing or exists without an entry.

| Section | Spanish | English |
|---|---|---|
| Hub (one card per product) | `/` | `/en/` |
| bb-sign | `/sign/…` | `/en/sign/…` |
| bb-sign API reference (generated) | `/sign/api/…` | same pages |

Slugs are English in both languages. Spanish is the root locale; an untranslated English page shows
the Spanish text with a notice.

## Develop

```bash
nvm use            # Node 22 (see .nvmrc; Astro needs >= 22.12)
npm install
npm run dev        # http://localhost:4321
```

| Command | What it does |
|---|---|
| `npm run build` | `astro check` (types) → static build into `dist/` (links validated, search index built) → CSP hash check |
| `npm test` / `npm run test:coverage` | Vitest unit tests (80% threshold on `src/config`, `src/content/facts`, `src/lib`) |
| `npm run test:e2e` | Playwright: smoke, i18n, search, axe (light + dark), visual — Chromium, Firefox, WebKit. Run `npm run build` first |
| `npm run verify` | All of the above |
| `npm run sync:sign -- --from ../bb-sign` | Copy bb-sign's OpenAPI contract and webhook test vectors from a local checkout (see Sync) |
| `npm run verify:deploy -- <url>` | Post-deploy checks against a running site |

## Add a product

1. Add an entry to `PRODUCTS` in `src/config/products.ts`: id, name, taglines, app URL, repo, the
   files to sync, and the sidebar (groups of pages with labels in both languages).
2. Create `src/content/docs/<id>/index.mdx` and `src/content/docs/en/<id>/index.mdx`.
3. Add the id to `PRODUCT_IDS` in `src/config/content-schema.ts`.
4. Run `npm test`. `tests/unit/products.test.ts` lists exactly what is still missing.

The hub, the topic switcher, the schema and the sitemap follow the registry; nothing else to wire.

## Write a page

Pages are `.mdx` under the product folder (Spanish) and the same path under `en/` (English). The
frontmatter is validated (`src/content.config.ts`):

```yaml
---
title: Firmar y descargar
description: Qué pasa al dibujar o escribir la firma, qué se registra y cómo obtener la copia firmada. # 50–170 chars
product: sign          # must equal the folder
audience: signer       # admin | user | signer | developer | legal | all — shown as a badge
source: docs/api/webhooks.md   # optional: the product-repo file this page was derived from
---
```

Rules, enforced by `tests/unit/content.test.ts` where a test can:

- **No fact without a source.** Numbers, limits and defaults come from `src/content/facts/<product>.ts`,
  where each value carries the `file:line` in the product repo it was read from. Prose imports the
  value; it never types the number.
- **Only what is shipped.** A feature is documented when it is on the product's `main`. Binding policy
  that the code does not enforce yet (bb-sign's fixed retention) is written as *terms*, never as "the
  system does".
- **Both locales, key for key.** Every page exists in Spanish and English except the generated API
  reference. Code blocks are identical in both.
- **No emojis and no typed arrows**, anywhere. Status is never colour alone.
- **Brass (`--bb-seal`) means evidence**: use the `bb-seal` aside class only on seal and verification
  content.
- Legal pages carry `legalVersion: "Versión N · YYYY-MM-DD"` and the "Pendiente de revisión jurídica"
  banner until counsel approves the text.

Code samples in several languages use Starlight tabs with a shared key, so the reader's choice follows
them across pages:

```mdx
import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs syncKey="lang">
  <TabItem label="curl">…</TabItem>
  <TabItem label="JavaScript">…</TabItem>
  <TabItem label="Java">…</TabItem>
</Tabs>
```

## Sync from a product repo

Two kinds of file stay canonical in the product repo and are only *copied* here: the OpenAPI contract
(it is generated from code) and the webhook signature test vectors (both SDKs and the server are tested
against them). `scripts/sync-product.mjs` copies them into `src/content/sync/<id>/`, rewrites the
OpenAPI `servers[0].url` to the production API, and writes `<id>.json` with the source commit and a
SHA-256 per file. `tests/unit/sync.test.ts` checks the files on disk match the manifest.

```bash
npm run sync:sign -- --from ../bb-sign          # local checkout
PRODUCT_REPO_TOKEN=… npm run sync:sign -- v0.4.0  # a tag or branch of binary-bridges-co/bb-sign
```

The copy is staged in a temp directory and moved into place atomically; a failed sync changes nothing.
Commit the result.

## Brand

Tokens in `src/styles/tokens.css` are copied from bb-homepage, which ported them from bb-sign. Keep the
three in sync. `src/styles/starlight-theme.css` maps them onto Starlight's `--sl-*` variables for both
themes. The mark is the homepage's `Logo.astro`; favicons and OG images are copied from there.

## Deploy

`push` to `main` runs `.github/workflows/pipeline.yml`: **verify** (build, unit tests with coverage,
Playwright on three browsers; visual snapshots are macOS baselines and excluded on Linux), then
**build-and-push-image** to `ghcr.io/binary-bridges-co/bb-docs:{latest,<sha>,main-<timestamp>-<sha>}`.
Pull requests run **verify** only.

Deployment is owned by bb-infrastructure: `apps/docs/` pins the image tag and Flux image automation
opens a PR for each new `main-…` tag. The container is `nginxinc/nginx-unprivileged` on port 3000 with
`/healthz`; `tests/unit/deploy-contract.test.ts` guards that contract. DNS for `docs.binarybridges.co`
is managed by hand at Namecheap.

Local check of the image:

```bash
docker build -t bb-docs . && docker run --rm -d -p 3300:3000 --name bb-docs bb-docs
bash scripts/verify-deploy.sh http://localhost:3300
docker rm -f bb-docs
```

### Content Security Policy

Starlight emits a handful of inline scripts (theme, search, sidebar). Their SHA-256 hashes are listed
in `security-headers.conf`; `npm run check:csp` (part of `npm run build`) fails when the built HTML
contains an inline script that is not listed, and prints the hash to add.
