# Report: dedicated storage and retention, pricing, and the guides moved from the app (issue #14, PR B)

Plan: `.claude/PRPs/plans/sign-storage-pricing-docs.plan.md` (review round 3 APPROVED, then amended once during
implementation, see Deviations). Branch `docs/sign-storage-pricing`. Not pushed.

## Predicted vs actual

| | Predicted (plan) | Actual |
|---|---|---|
| Order | PR A first, PR B rebased on it | PR A not implemented yet; PR B built on `5ee7007` (plan amendment) |
| Content files | about 45, both locales | 52 page files changed or added, 4 deleted (the mirror pages) |
| Fact modules | 3 | 2 new (`sign-pricing.ts`, `sign-storage.ts`), `sign.ts` and `sign-integrations.ts` changed |
| Components and libraries | 1 component, 1 library | `Price.astro`, `src/lib/price.ts`; `ProductCard.astro` gains the Pricing link |
| Sync | terms only, contract and vectors byte-identical | as planned: terms at `v0.42.0`, contract and vectors still `v0.38.0` |
| Visual baselines | `hub-*` change | `hub-*`, `sign-*` and `signing-1024-*` change: the new "Precios" sidebar entry moves the sidebar |

## Tasks completed

| Task | Commit |
|---|---|
| Plan amendment (PR B before PR A) | `1710bdc` |
| B1 pricing facts, `formatCop`, `<Price>`, unit tests | `8cb1c2b` |
| B2 `STORAGE_NOT_READY` fact and errors page rows | `a92b401` |
| B3 `ORG_STORAGE`, `configurable` true, permission, audit events, not-shipped list | `b42ed71` |
| B4 content denylist | `725eb36` |
| B5 Storage and retention page | `3ce4f9b` |
| B6 Pricing page, registry slug, hub link, links from four pages | `dcf02bc` |
| B7 terms-only sync at `v0.42.0` (`--only`, per-file manifest, rewrites in the contract entry) | `d390ba3` |
| B8 English terms at Versión 6 | `77d5f26` |
| B9 guides merged into their D1 pages; mirror pages and sidebar entries removed | `ae8a68b` |
| B10 redirects for the four old URLs | `1135414` |
| B11 sweep, both locales; old retention facts removed with no alias | `ccfee13` |
| B12 smoke tests, redirect tests, hub link test, baselines | `4fc6a3f` |
| B13 this report | (this commit) |

Final `npm run verify` on the branch tip: exit 0 (build, 89 unit tests, 227 Playwright tests).

## Published URLs

New: `/sign/pricing/`, `/en/sign/pricing/`.

The pages the app links to (D1), unchanged paths:

- `/sign/admin/own-certificate/` and `/en/sign/admin/own-certificate/`
- `/sign/sending/retention-and-restore/` and `/en/sign/sending/retention-and-restore/`

Rewritten at the same path: `/sign/admin/storage/` and `/en/sign/admin/storage/` (sidebar label "Almacenamiento y
conservación" / "Storage and retention").

Redirects (no script, not in the sitemap): `/sign/legal/own-certificate-guide/` and its `/en/` twin go to the
own-certificate pages; `/sign/legal/retention-guide/` and its `/en/` twin go to the retention-and-restore pages.

## Deviations from the plan

1. **PR B before PR A** (amended in the plan, `1710bdc`). Everything PR B adds follows P1; what PR A changes in
   existing files (`Fact.astro`'s `data-source`, existing sources and headers, existing `source:` frontmatter,
   the generator's `source:` field, README and CLAUDE.md) is left for PR A. `grep -rl data-source dist` and
   `grep -rl '^source:' src/content/docs` still find files, as expected until PR A.
2. **A4 does not exist yet**, so `npm run check:public` was not run. The equivalent check was run by hand over the
   lines this branch adds outside `.claude/` (vendor and vendor-product names, tier identifiers, the storage
   container word, product issue references, infrastructure paths, the production-manifest shorthand,
   private-repository code paths, bare `(#nn)` references, IP addresses): no match. The lines this branch adds
   under `.claude/` since the approved plan contain none either; the approved plan and review files themselves
   name the deploy tooling, which A4 will judge when PR A lands.
3. **B3 and B11.** The old retention facts are removed in B11, with their last uses, so every commit builds.
4. **Commit greenness.** B7 leaves the English-terms structure test red until B8; every other commit builds.
5. **Visual baselines.** Besides `hub-*`, the `sign-*` and `signing-1024-*` baselines were re-recorded (the sidebar
   entry). The other baselines were left as they were.
6. **Small additions the plan implies.** `document-settings:manage` also goes into `ORG_API_NEVER` (Sign
   v0.42.0 never grants it to an API key), with item 7 on the permissions page. The glossary defines "storage
   tier". `admin/index` points at Settings > Storage. The Spanish terms description in the generator names
   "Sign", like the English one.
7. **App strings that still say 365 days.** At `v0.42.0` the app's "file deleted" messages (envelope page,
   signing page, `DOCUMENT_DELETED`) name 365 days whatever the organization's period. The pages quote them as
   they are and say the message names the standard configuration's period. Worth fixing app-side.

## Verification

- `npm run build`: exit 0, all internal links valid, CSP check passes. A `WEBHOOKS` unused-import warning was
  already there on `main`.
- `npx vitest run --coverage`: 89 tests passed; coverage 100 % lines, 94.73 % branches.
- `npx playwright test` (Chromium, Firefox, WebKit): 227 passed.
- Validation block: the fixed-period phrase checks on sources return nothing; the tag-stripped HTML and the
  `llms*.txt` checks return 0; prices render as `$ 1.000` (es) and `COP 1,000` (en); the four redirects point
  at their D1 paths; 0 redirect pages in the sitemap; the contract, the vectors and `public/sync` have no diff
  against `origin/main`; the manifest shows `openapi.json v0.38.0`, `webhook-signature-vectors.json v0.38.0`,
  `legal/terminos-y-condiciones.md v0.42.0`.
- Pricing and Storage were looked at at 375px (light and dark) and 1440px.

## Not verified, or left for later

- `npm run check:public`, and every PR A item, until PR A lands and this branch is rebased on it.
- The owner still has to review the English terms §3. A terms Versión 7 with absolute docs links is expected
  app-side; when it is published, the sync passes those links through unchanged (D4) and the English terms
  follow.
- Deploy steps (PR, merge, deployment, `verify:deploy`, live checks of the D1 URLs and redirects) and the
  hand-off to the app side.
- Tier names (D6) wait for a Sign release that ships them; the API reference keeps stating a fixed period
  until PR C.
