# Implementation Report: bb-docs, the Binary Bridges documentation hub, starting with bb-sign

## Summary

Built `bb-docs` from an empty repository into a bilingual (es root, `/en/`) Astro 7 + Starlight 0.42
documentation hub with one sidebar topic per product, driven by a single product registry, on the
same toolchain, tokens, container and GHCR pipeline as bb-homepage. bb-sign is fully documented in
both languages: overview, 7 concept pages, 2 getting-started pages, 6 signer pages, 7 sender pages,
11 admin pages (including the own-certificate guide with purchase recommendations), 8 developer pages,
2 SDK pages, 3 legal pages (terms, scope and retention, electronic vs digital signature) and 4
reference pages, plus the generated API reference from the synced OpenAPI contract. Every number in
prose comes from a sourced fact sheet. Cross-repo deploy changes are staged on local branches in
bb-infrastructure and bb-homepage.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | XL | XL |
| Confidence | 7/10 | 8/10 (the stack choice held; the content volume was the work) |
| Files | ~60 source + ~90 content + 6 infra + 1 homepage | 98 source/config/test (incl. 32 visual baselines), 104 content pages, 10 infra files, 1 homepage file |
| Pages built | ~125 | 125 |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| A1 | Scaffold Astro + Starlight | Complete | Starlight 0.42.6 on Astro 7.3.8; all plugin peers verified |
| A2 | Site config, product registry, content schema | Complete | `contentSlug()` added: `x/index.mdx` is entry `x` |
| A3 | Brand | Complete | Greys adjusted after axe contrast failures on TOC links; `--sl-color-red/green/orange` mapped to tokens |
| A4 | Hub page and footer override | Complete | Also a `PageTitle` override for the audience badge |
| A5 | Sync script and first sync | Complete | Also publishes copies to `public/sync/<id>/` |
| A6 | Container, nginx, CSP, pipeline | Complete | Seven inline-script hashes (Starlight + OpenAPI plugin + Tabs); `wasm-unsafe-eval` for Pagefind |
| A7 | Unit tests for the skeleton | Complete | plus `sync.test.ts` for the script's validation |
| A8 | E2E skeleton | Complete | Theme set through `localStorage` so axe measures the toggled theme |
| A9 | README and CLAUDE.md | Complete | |
| B1 | Fact sheet | Complete | `src/content/facts/sign.ts`, 100% covered |
| B2 | Overview and concepts | Complete | 8 pages x 2 |
| B3 | Getting started and sending | Complete | 9 pages x 2 |
| B4 | The signer's path | Complete | 6 pages x 2 |
| C1 | Admin pages | Complete | 10 pages x 2 |
| C2 | Developer and SDK pages | Complete | 10 pages x 2, migrated with the listed corrections |
| D1 | Terms, retention, electronic vs digital | Complete | Terms verbatim from the bb-sign Versión 1 draft; three paraphrases reverted in review |
| D2 | Own-certificate guide with purchase recommendations | Complete | ONAC list (7) and AATL list (5), dated 2026-10-07 |
| D3 | Reference pages | Complete | 4 pages x 2 |
| E1 | bb-infrastructure manifests | Prepared, not merged | Branch `feat/docs-app` in `bb-infrastructure-worktrees/docs-app`; kustomize builds clean |
| E2 | DNS and go-live | Not done | User action: Namecheap A record; needs E1 merged and the first image pushed |
| E3 | bb-homepage flag | Prepared, not merged | Branch `feat/docs-live` in `bb-homepage-worktrees/docs-live` |
| E4 | Follow-up issues in bb-sign | Not filed | Listed below |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static analysis | Pass | `astro check`: 0 errors on 34 files |
| Unit tests | Pass | 39 tests, 6 files; coverage 100% lines/functions/statements, 80% branches on `src/config`, `src/content/facts` |
| Build | Pass | 125 pages, links validated (`/sync/**` and the injected `/sign/api/**` excluded), CSP check green |
| E2E | Pass | 162 tests on Chromium, Firefox, WebKit (smoke, a11y light + dark, i18n, search); 32 visual baselines on Chromium |
| Container | Pass | `scripts/verify-deploy.sh http://localhost:3300`: all checks passed |
| Edge cases | Pass | Sync rejects unknown product, unsafe ref, missing path, missing token; registry test lists missing pieces; CSP fails on an unlisted inline script |

## Files Changed

bb-docs: 202 tracked files on `feat/bb-docs-sign-documentation` (3 commits before this report).
Notable: `astro.config.mjs`, `src/config/{site,products,content-schema}.ts`, `src/content.config.ts`,
`src/content/facts/sign.ts`, `src/components/{overrides,hub,facts,legal,brand}/*`, `src/styles/*`,
`scripts/{sync-product,check-csp}.mjs`, `scripts/verify-deploy.sh`, `Dockerfile`, `nginx.conf`,
`security-headers.conf`, `.github/workflows/pipeline.yml`, `tests/unit/*` (6), `tests/e2e/*` (6 +
snapshots), `src/content/docs/**` (104 pages), `README.md`, `CLAUDE.md`.

bb-infrastructure (`feat/docs-app`, local): `apps/docs/{deployment,ingress,kustomization}.yaml`,
`automation/docs/{image-policy,image-automation,kustomization}.yaml`, `apps/kustomization.yaml`,
`automation/kustomization.yaml`, `infrastructure/configs/namespaces.yaml`, `README.md`.

bb-homepage (`feat/docs-live`, local): `src/config/site.ts` (`DOCS_LIVE = true`).

## Deviations from Plan

| What | Why |
|---|---|
| `starlight-openapi` label is a plain string ("API") | The plugin's schema does not accept per-locale labels |
| Sidebar slugs for index pages are `sign`, `sign/signing`, ... | Starlight's collection entry for `x/index.mdx` is `x`; `contentSlug()` maps the registry's file slugs |
| Shared schema constants moved to `src/config/content-schema.ts` | `src/content.config.ts` imports `astro:content`, which Vitest cannot resolve |
| Starlight's `--sl-color-gray-2/3` set to the homepage's `muted` values, `--sl-color-red/green/orange` mapped | axe found TOC links and the OpenAPI "required" marker below 4.5:1 with the first mapping |
| Link validator excludes `/sign/api/**` and `/sync/**` | Generated and static routes are invisible to it |
| axe suite waits for an idle callback | Expressive Code marks overflowing code blocks focusable asynchronously |
| Sync script also copies files to `public/sync/<id>/` | Developer pages link to the webhook vectors and the raw contract |
| Terms page: three paraphrases reverted to the canonical wording | Clause 2.5, the retention start date and a "data processor" sentence had drifted from the LV contract text |
| `StatusFlow` renders `EXPIRED` as "Expirado" | The app's own label; the plan's draft said "Vencido" |

## Issues Encountered

| Issue | Resolution |
|---|---|
| Frontmatter descriptions containing `: ` broke YAML | Quoted in six files; the pattern is documented in README |
| `locals.starlightRoute` throws in the llms.txt renders | `Fact.astro` reads it inside try/catch |
| Three content agents were cut off by a session limit mid-write | Remaining Spanish developer and SDK pages were produced as translations of the finished English twins |
| Playwright 1.64 browsers missing for Firefox and WebKit | Installed; 108 tests then passed |

## Facts the content surfaced that the product team should know

- The envelope "message to signers" is saved but never shown to a signer (`SigningCeremony.tsx` does not render it; no email template uses it).
- No document can be removed from a draft in the app; the wizard offers "Start over" before the envelope exists.
- After the database archive (30 days from creation), neither the signer nor the organization can download from the app.
- The OTP "invalid code" and the "link unavailable" reasons are server strings in English, shown to Spanish signers.
- The certificate upload screen is on the platform-admin-only Organizations page; org admins can call the API but have no UI for it.
- `GET /api/v1/verify` is described in the OpenAPI as checking the CMS signature; it recomputes the stored seal hash.

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `tests/unit/products.test.ts` | 8 | registry, folders, sidebar slugs, topics, OpenAPI entries |
| `tests/unit/content.test.ts` | 8 | product/folder agreement, audience, descriptions, locale parity, emoji/arrows, fact denylist, cross-product links, locale prefixes |
| `tests/unit/facts.test.ts` | 10 | sources present, value relationships, escalation guards, role nesting, transitions |
| `tests/unit/legal.test.ts` | 2 | version header parity, verbatim clauses |
| `tests/unit/sync.test.ts` | 7 | manifest, hashes, rewrite, input validation |
| `tests/unit/deploy-contract.test.ts` | 4 | port, image, tag format, headers |
| `tests/e2e/{smoke,a11y,i18n,search,visual}.spec.ts` | 54 per browser (+32 visual) | hub, h1/lang, overflow, badge, API operation count, footer, no-JS, 404, axe both themes, skip link, hreflang, switcher, search, screenshots |

## Next Steps

- [ ] Push `feat/bb-docs-sign-documentation`, open the PR (`/prp-pr`), let CI push the first `main-<ts>-<sha>` image after merge
- [ ] bb-infrastructure: pin that tag in `apps/docs/deployment.yaml`, add `secrets/ghcr-pull-docs.enc.yaml` (sops) to `secrets/kustomization.yaml`, open the PR from `feat/docs-app`
- [ ] Namecheap: A record `docs` to the VPS; then `bash scripts/verify-deploy.sh https://docs.binarybridges.co` and `npm run test:prod`
- [ ] bb-homepage: open the PR from `feat/docs-live` once the site resolves
- [ ] bb-sign follow-ups: replace `docs/api/*.md` bodies with pointers, fix the `GET /verify` description and the "stored hashed" wording, consider rendering the envelope message to signers, consider a UI for org admins to upload the certificate
- [ ] Re-verify the ONAC and AATL provider lists before the first public deploy and update the date on the page
- [ ] Code review (`/code-review`) of the branch
