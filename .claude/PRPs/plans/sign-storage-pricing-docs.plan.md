# Plan: dedicated storage and retention, pricing, and the guides moved from the app (issue #14)

> **Public repository.** This plan, the pages it produces, the fact sources, the tests and the scripts are public.
> They contain no cloud-vendor or vendor-product names, no storage-class identifiers, no storage names or naming
> patterns, no infrastructure, access-control or alerting details, no production configuration paths, **no paths
> into the private product repository**, and no references to the product repository's issues, plans, runbooks or
> decision labels. Facts cite product behaviour at a release, production configuration by read date, or an owner
> decision (the public-source rule, P1).

## Summary

Sign `v0.42.0` (live in production with dedicated storage switched on; production configuration read 2026-11-01)
gives every organization its own isolated storage with a **retention policy per organization**: 365 days in the
standard configuration, changeable from 90 days to 10 years, with cheaper storage tiers as files age. Organization
admins see the policy in **Configuración > Almacenamiento** and request a change; Binary Bridges approves, adjusts or
rejects it. Files created before the organization's dedicated storage keep the 365-day rule. The terms of service are
now **Versión 6** (§3: the period agreed in the customer's contract, 365 days unless agreed otherwise, at most 10
years; new §3.4).

bb-docs still says the opposite: a fixed period, the same for every organization, not configurable (17 Spanish pages
plus their English twins); it lists per-organization retention as not shipped, describes the old platform storage
page, and mirrors the two in-app guides that the app is about to delete. The synced API contract, published as a
download and as the API reference, also states a fixed 365-day retention and carries two bare product issue
references; the app's vendor-name removal work rewrites those descriptions.

The work ships as **three PRs**:

- **PR A, `fix/public-fact-sources`** (first, small, waits on nothing): fact sources stop being rendered; every fact
  source, page frontmatter, test, script comment and README/CLAUDE.md line follows P1; a build check guards the public
  tree and every build output, with one dated, hash-pinned exemption for the current contract (D12). Phase A.
- **PR B, `docs/sign-storage-pricing`** (this branch, rebased on PR A): the Storage and retention page, the Pricing
  page, the guides merged and redirected, the sweep, the terms re-synced at `v0.42.0` **without touching the synced
  contract or vectors** (D13), and the English terms. Phase B.
- **PR C, `chore/sync-sign-contract`** (after the app's vendor-name removal work is in a Sign release): re-syncs the
  cleaned contract, removes the D12 exemption, and checks the API reference with no exclusion. Phase C.

## User story

As a prospective or current customer, I want to read how Sign keeps my documents and what it costs, so that I can
choose the right retention and plan for it. As an organization admin, I want the guides I open from the app to live
at one stable documentation URL, so that the link never breaks.

## Metadata

| | |
|---|---|
| Complexity | Large. PR A: component, all fact modules, about 26 page frontmatters, tests, a script, README, CLAUDE.md, two pages. PR B: about 45 content files in both locales, 3 fact modules, 1 component, 1 lib, the sync script, redirects, 5 tests. PR C: sync output, exemption removal, validation |
| Source | bb-docs issue #14 and its owner answers of 2026-11-01; Sign `v0.42.0` behaviour; Sign terms Versión 6 |
| Dependencies | bb-docs `main` `5ee7007`. PR B rebases on PR A after it merges. The app removes its in-app guides only after PR B is deployed (AC3). PR C waits for a Sign release that contains the app's vendor-name removal work |
| Branches | PR A: `fix/public-fact-sources` in `.claude/worktrees/public-fact-sources`. PR B: `docs/sign-storage-pricing` in `.claude/worktrees/sign-storage-pricing-docs`. PR C: `chore/sync-sign-contract` in `.claude/worktrees/sync-sign-contract`. Each from fresh `origin/main` |
| Out of scope | The signer-resend API reference (its own task); renaming "bb-sign" to "Sign" across the site (separate follow-up, owner 2026-11-01); quoting tier names before the app ships them (D6) |

## Acceptance criteria (restated from issue #14, with the owner answers)

1. **Storage and retention** (`sign/admin/storage`, es + en): dedicated storage per organization, isolated from other
   customers and encrypted; **evidence certificates and their audit trail locked against deletion until the end of
   their period; documents and signed PDFs versioned, not locked** (D10); the standard configuration (365 days, then
   deleted; after 30 days files move to a cheaper tier that stays immediately available); per-organization changes
   from 90 days to 10 years plus cheaper tiers as files age, requested by the organization admin and approved,
   adjusted or rejected by Binary Bridges; a shorter period shows Binary Bridges' reviewer what would be deleted
   before it is confirmed; availability in the app's own words ("Acceso inmediato" / "Requiere restaurar, listo en
   horas"), up to about 12 hours for the deepest tier; evidence certificates always immediate; the "storage is being
   prepared" state; files from before dedicated storage keep the 365-day rule; the evidence certificate states each
   file's period. The API reference stops stating a fixed period when PR C lands (D12, D13).
2. **Pricing** (new, es + en): COP per envelope plus IVA, **every created envelope counts** (drafts and cancelled
   included, as the quota counts them). Standard configuration $1.000 + IVA; 10-year retention $1.200 + IVA (Binary
   Bridges manages the storage tiers); over 100.000 envelopes per month, volume discounts down to $400 + IVA; other
   configurations and volumes: contact soporte@binarybridges.co. No minimums or setup fees are mentioned.
3. **Guides moved**: "Certificado propio" and "Conservación y restauración" are merged into the bb-docs pages they
   overlap, at the stable URLs in D1; the old docs URLs redirect; the pages ship before the app drops its copies.
4. **No internal details** in any page, any build output (HTML text and attributes, `llms*.txt`, the published
   contract and vectors, the API reference, sitemaps), any fact source, page frontmatter, test, script, README,
   CLAUDE.md, public asset, or new or changed file under `.claude/PRPs/`. Guarded by the check in Task A4. The only
   tolerated exception is D12, dated and pinned, until PR C.
5. `npm run verify` green (types, link check, CSP, public-content check, content schema, unit tests with coverage,
   Playwright); each PR deployed through Flux's image PR.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Final URLs of the moved guides.** Certificado propio: `https://docs.binarybridges.co/sign/admin/own-certificate/` (English `/en/sign/admin/own-certificate/`). Conservación y restauración: `https://docs.binarybridges.co/sign/sending/retention-and-restore/` (English `/en/sign/sending/retention-and-restore/`). Page-level links, no `#anchors`. | Both pages already cover their guide. The app links in the user's locale: Spanish without prefix, English with `/en`. |
| D2 | The mirrors `sign/legal/own-certificate-guide` and `sign/legal/retention-guide` (es generated, en hand-written) are deleted; their four URLs redirect to D1 with Astro `redirects`. | The app deletes its guide files, so a sync that copies them would fail. Astro's redirect pages carry no script (CSP unaffected) and work in `astro preview`. |
| D3 | bb-docs owns the guide content from now on. The sync copies the OpenAPI contract, the webhook vectors and the terms only. | The guides are product documentation; the terms stay mirrored verbatim. |
| D4 | `LEGAL_LINK_MAP` keeps the two in-app guide routes, mapped to the D1 pages, so terms Versión 6 (links at 2.3 and 3.3) mirrors cleanly. When the app publishes absolute docs links (an expected terms Versión 7), they pass through unchanged; no fourth transform. | Keeps the three-transform rule (CLAUDE.md §3). |
| D5 | Pricing lives at `sign/pricing` (`/sign/pricing/`, `/en/sign/pricing/`), second in "Empezar" / "Start here"; linked from the hub card (optional `pricing` slug in the product registry), `sign/index`, `sign/admin/storage`, `sign/concepts/quotas` and `sign/admin/quota-and-usage`. Audience `all`. | One product, one pricing page; the hub stays registry-driven. |
| D6 | **Tiers by availability, in the app's words.** The pages quote the two availability labels verbatim ("Acceso inmediato" / "Requiere restaurar, listo en horas"; en "Instant access" / "Needs a restore, ready in hours") and state "up to about 12 hours" for the deepest tier as a fact, not as a label. The owner-approved tier names (Estándar, Acceso poco frecuente, Automático según el uso, Archivo con acceso inmediato, Archivo (se restaura en horas), Archivo a largo plazo (se restaura en hasta 12 horas); en Standard, Infrequent access, Automatic, by usage, Archive, instant access, Archive (restore in hours), Long-term archive (restore in up to 12 hours)) are added in a follow-up once a Sign release ships them. | Only what is in a Sign release is documented. The availability labels are vendor-free today and do not change. |
| D7 | COP by locale with `Intl.NumberFormat(locale, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`: Spanish "$ 1.000 + IVA", English "COP 1,000 + VAT (IVA)". English says once: "Prices are in Colombian pesos (COP) per envelope and exclude VAT (IVA)." | Unambiguous abroad, native at home; numbers stay in the fact sheet. |
| D8 | Fact sources are audit data, not reader content: `Fact.astro` stops rendering them. | They belong in the fact modules. |
| D9 | The old platform storage page (in the app until its app-side removal) is not described; the Storage page documents Configuración > Almacenamiento only. bb-docs never documented the shared lifecycle API (no such path in the synced contract, no page link), so only the old page's description and its three facts go. | The page never applied to production retention and is being removed. |
| D10 | **Deletion protection is split.** Evidence certificates and their audit trail are locked against deletion until the end of their period (the period in force when issued). Documents and signed PDFs are versioned, not locked: they are kept for the organization's period and then deleted, and only a shorter period applied by Binary Bridges, after its reviewer sees what would be deleted, removes them earlier. No general "protected against early deletion" sentence. | The product locks evidence only. |
| D11 | **Pricing facts cite an owner decision**: "owner decision 2026-11-01 in issue #14". Written into CLAUDE.md §0 by PR A as one of the three P1 source forms. | Prices are a business decision. |
| D12 | **One dated exemption for the current contract, until PR C.** The contract synced today (SHA-256 `a2afe0f674b4712fe7316c2d686db733ea9a001365c15bd2fb10406b326755a6`, Sign `v0.38.0`) contains two bare product issue references and states a fixed 365-day retention. A4 exempts exactly these outputs from exactly two rules (bare issue references, fixed-period phrases): `src/content/sync/sign/openapi.json`, `public/sync/sign/openapi.json`, `dist/sync/sign/openapi.json`, and `dist/sign/api/**` (pages rendered from that contract). The exemption lives in `scripts/public-terms-exemptions.json` with `since: 2026-11-01`, `reason`, `sha256`, `rules`, `paths` and `removedBy: "PR C, after the app's vendor-name removal work ships"`. It applies **only while every listed source copy (`src/content/sync/sign/openapi.json` and `public/sync/sign/openapi.json`) hashes to the recorded value**, and the built copy `dist/sync/sign/openapi.json` is byte-identical to the public one (the `dist/sign/api/**` pages are derived from the `src` copy). Any other contract, or a hand edit to any copy, makes the check fail until the entry is removed or the contract is clean. The test pins an allow-list: the entry may carry at most these two rules and only these four paths; adding a rule or a path fails the test and needs a plan change (R3-1). Every build prints "exemption active since 2026-11-01: synced API contract (bare issue references, fixed period), removed by PR C", and PR A's description names it for the owner. Every other rule (vendor names, identifiers, storage words, infrastructure paths, `prod:` shorthand) still applies to these files. | The owner's resolution is to fix the descriptions at the source and re-sync (PR C). Holding the whole site until then is worse than a pinned, visible, time-boxed exception that cannot silently cover a different file. |
| D13 | **PR B does not re-sync the contract or the vectors.** It syncs the terms only (`--only legal/terminos-y-condiciones.md`, Task B7); `src/content/sync/sign/openapi.json`, `webhook-signature-vectors.json` and `public/sync/sign/*` stay byte-identical, so the D12 hash keeps matching. The `v0.42.0` contract is never synced: it carries the same references. `STORAGE_NOT_READY` is documented on the errors page from the fact sheet (B2); the API reference shows it after PR C. | The owner wants the cleaned contract synced once, at the release that cleans it. |

### P1. The public-source rule (CLAUDE.md §0 and README, applied by PR A to every public file)

A fact source takes one of three forms, and nothing else:

1. **Product behaviour at a release**: "Sign v0.42.0 behaviour: <what was observed, in product terms>", for example
   "Sign v0.42.0 behaviour: the Storage tab refuses a reason under 10 characters".
2. **Production configuration**: "production configuration, read 2026-11-01: <setting in product terms>".
3. **Owner decision**: "owner decision 2026-11-01 in issue #14: <what was decided>".

Never, in any public file: a path, file name, line number, class, function or setting key of the private product
repository; its issue, plan, report, review, runbook or design-document names; decision labels; infrastructure paths,
commands or storage names. The reviewer of each plan verifies sources against the product privately.

**One narrow exception, needed for the sync to work:** the locations of the three published artifacts the sync
copies (the API contract, the webhook signature vectors and the terms of service) may appear in the sync
configuration (`src/config/products.ts`, `scripts/sync-product.mjs`, `scripts/legal-mirror.mjs`) and the sync
manifest (`sign.json`). They are the published documents themselves, not code. No page carries a `source:`
frontmatter field or a source path in its header: the legal generator writes neither (R3-3), and PR A regenerates the
mirrored pages from the already-synced texts so the generated pages match the generator byte for byte.

## Research findings

Sign `v0.42.0` behaviour, checked privately against the product at that release; production configuration read
2026-11-01. Public bb-docs files are cited with `path:line` (this repository).

### R1. Retention policy per organization

| Fact | Value | Source form |
|---|---|---|
| Standard period | 365 days | production configuration, read 2026-11-01; Sign v0.42.0 behaviour (default of a new organization) |
| Standard tiers | one change after 30 days to a cheaper tier that stays immediately available | production configuration, read 2026-11-01 (name no tier) |
| Shortest period | 90 days | Sign v0.42.0 behaviour (the Storage editor refuses fewer, to protect envelopes still being signed) |
| Longest period | 3650 days (10 years) | Sign v0.42.0 behaviour; terms Versión 6 §3.1 |
| Tiers | at most 5, each later and cheaper, with minimum stays | Sign v0.42.0 behaviour (the editor's validation messages) |
| What can need a restore | only completed originals and signed PDFs; drafts never; evidence never tiered | Sign v0.42.0 behaviour (the editor's hint: "Los certificados de evidencia siempre quedan disponibles al instante") |
| Availability labels | "Acceso inmediato" / "Requiere restaurar, listo en horas" (en "Instant access" / "Needs a restore, ready in hours") | Sign v0.42.0 behaviour (app text) |
| Deepest tier | restore up to 12 hours | Sign v0.42.0 behaviour (app text; the number only) |
| A restore gives up after | 48 h (existing `RESTORE.timeoutHours`) | 48 h > 12 h, so the deepest tier is restorable |
| Restored copy available | 7 days | production configuration, read 2026-11-01; terms Versión 6 §3.2 |

### R2. Requesting a change (organization admin)

- Configuración, tab **Almacenamiento** (en "Storage"), shown to holders of `document-settings:manage`, which are
  `platform_admin` and `org_admin` (Sign v0.42.0 behaviour; the permission name is public API vocabulary).
- The tab shows the current policy read-only, a timeline, the version history, **Solicitar un cambio** with a reason
  of 10 to 1000 characters, one pending request at a time, **Retirar**, and the last decision with Binary Bridges'
  note.
- While the storage is being prepared the tab says "Su almacenamiento se está preparando. Las nuevas cargas empiezan
  cuando esté listo." (en "Your storage is being prepared. New uploads start once it is ready."). Uploads then answer
  `503 STORAGE_NOT_READY` with `Retry-After` 60 seconds and nothing is stored, on the document upload and the
  envelope document upload operations.
- Binary Bridges approves as requested, adjusts and approves (note required when the request changed) or rejects
  (note required).
- Shortening: only Binary Bridges' dialog shortens. It shows Binary Bridges' reviewer how many documents would be
  deleted (within about 2 days), the evidence kept until its date, and the documents of envelopes still waiting for
  signatures, and requires the organization's name. The page does not promise that the organization is notified
  (owner, 2026-11-01).
- Do not quote the tab's introduction or the platform card texts: they are being reworded app-side.

### R3. Protection, legacy files, certificate, audit

- Evidence: each certificate copy and its audit trail is stored with a deletion lock until issue plus the period in
  force (Sign v0.42.0 behaviour).
- Documents and signed PDFs: versioned storage, no lock (Sign v0.42.0 behaviour).
- Legacy files keep 365 days; the tab shows the date ("Los archivos creados antes del {fecha} … 365 días").
- The certificate prints each file's period, as one period or one per line when they differ (Sign v0.42.0 behaviour;
  terms Versión 6 §3.4).
- Archive dates stay hidden on the envelope page and the API (production configuration, read 2026-11-01).
- Audit: four organization-storage events (storage provisioned, policy changed, policy requested, request decided)
  are recorded on the organization's audit trail (Sign v0.42.0 behaviour). They are added to `AUDIT_EVENT_TYPES` and
  `admin/audit-trail` (both locales).

### R4. Terms Versión 6

Versión 6 · 2026-10-31: §3.1-3.4 and the history. bb-docs mirrors Versión 4. Versión 5 renamed the service ("Sign por
Binary Bridges"); Versión 6 rewrote §3.1-3.3 and added §3.4. Links in the text: `/guias/certificado-propio` (2.3)
and `/guias/conservacion-y-restauracion` (3.3). A Versión 7 with absolute docs links is expected app-side.

### R5. The synced contract (read for this revision)

The contract synced today (`src/content/sync/sign/openapi.json`, Sign `v0.38.0`) and the one at `v0.42.0` both carry,
in field descriptions: two bare product issue references in parentheses (`src/content/sync/sign/openapi.json:574`
and a signed-documents failure field), "Fixed 365-day retention" (`:574`), "past its 365 days" (`:1721` and one more)
and "From day 90 … may be in archive storage" (`:2559`). It is published at `/sync/sign/openapi.json` and rendered
into `/sign/api/`. The app's vendor-name removal work rewrites these descriptions (owner, 2026-11-01): PR C syncs the
result. `v0.42.0` also adds `STORAGE_NOT_READY` on the two upload operations; no storage or lifecycle path; no vendor
term.

### R6. The guides against the target pages

| Guide section | Already in | To add |
|---|---|---|
| Certificado propio §1-7 | `sign/admin/own-certificate` (superset) | Diff check; replace the closing LinkCard to the deleted guide with one to terms §2; drop `source:` |
| Conservación §1 (dates) | `sign/sending/retention-and-restore` | Certificates issued before the current version keep their sealed dates (may differ by one day); an archive date may never come true, the real state is checked before each download |
| §2 (restore: app, API, signer) | same page; `developers/webhooks`, `developers/errors` | API request (`kind` `SIGNED`/`ORIGINAL`), responses `202` (`alreadyInProgress`), `200`, `410 DOCUMENT_DELETED`, `429 RESTORE_LIMIT_REACHED`, `503 ARCHIVAL_STORAGE_UNAVAILABLE`, the `availability` values: link where they exist, add what is missing |
| §3 (notice) | same page | `document.restored` summary, link to `developers/webhooks` |
| §4 (copy each envelope automatically) | partly `developers/webhooks` | Section **"Guardar cada sobre en sus sistemas"**: five steps, `shasum -a 256` (identical code block in both locales), the `PREPARING` note |
| §5 (responsibilities) | `legal/retention` | Rewrite with the organization's period |

### R7. Sweep list (built from fact uses, not phrases)

Every page that uses `RETENTION_POLICY.retentionDays`, `EVIDENCE.retentionDays` or `RETENTION_IMPLEMENTED` today
(Spanish; each English twin too): `index`, `admin/audit-trail`, `admin/storage`, `concepts/documents`,
`concepts/evidence-and-audit`, `concepts/evidence-certificate`, `developers/envelope-walkthrough`,
`developers/webhook-signature-spec`, `developers/webhooks`, `legal/retention`, `sending/archived-envelopes`,
`sending/documents`, `sending/download-signed-documents`, `sending/retention-and-restore`,
`signing/receiving-the-email`, `signing/sign-and-download`, `signing/troubleshooting`; plus `admin/own-certificate`
(LinkCard) and `admin/permissions` (new permission). The facts are renamed **without aliases** (B3), so the build lists
every use and each one is rewritten for meaning: "the period your organization has" for organization pages, "the
period set by the organization that sent the document" for signer pages, 365 days only where the standard
configuration or legacy files are meant. App strings that carry a number are re-read at `v0.42.0` and quoted as they
are.

### R8. Fact sheet, frontmatter and tests (all public)

- `NOT_SHIPPED`: remove `per-organisation retention`; `billing or self-service plans` stays.
- `RETENTION_POLICY.configurable = false`, `RETENTION_IMPLEMENTED`, the shared-storage constant in `sign.ts:54-55`
  and their tests (`tests/unit/facts.test.ts:78-99,299`) describe the old fixed rule and the old page: replaced in PR B.
- Every fact source in `src/content/facts/*.ts` and the module headers (`sign.ts:1-50` defines path shorthands;
  `sign-integrations.ts:8` defines the `prod` shorthand as a production manifest path): rewritten to P1 in PR A.
- Tests that pin internal sources or references: `facts.test.ts:84` (comment), `:87`, `:89-90`, `:109`
  (`VERIFY_QR_ARCHIVED_ISSUE`, a fact whose value is a product issue reference, rendered nowhere: removed), `:179`,
  `:219`, `:235-237` (asserts a production-manifest line reference in three rate-limit sources), `:312`, `:316`, and
  `tests/unit/content.test.ts:42`. All change in PR A.
- Page frontmatter: 26 pages carry `source:` with a product-repository path (`grep -rl '^source:' src/content/docs`):
  removed in PR A, except the generated Spanish terms page (P1 exception). `content.test.ts` asserts it.
- The "every fact cites a source" walk (`facts.test.ts:59-62`) gets `ORG_STORAGE` and `PRICING`, and checks that each
  source starts with one of the three P1 forms.
- `content.test.ts` `FACT_DENYLIST` covers 365/90/30/7 days; it needs the prices, the threshold, 3650 days, 10 years
  and 12 hours.

### R9. Site mechanics

- Sidebar and hub come from `src/config/products.ts`; `products.test.ts` checks every slug.
- Frontmatter: `product`, `audience`, `description` 50-170 characters.
- `starlight-links-validator` fails on broken links; `scripts/check-csp.mjs` on an unlisted inline script.
- Build outputs that reach the public: every `dist/**/*.html` (the API reference under `dist/sign/api/` included),
  `dist/llms.txt`, `dist/llms-full.txt`, `dist/llms-small.txt` (when present), `dist/sync/**` (contract and vectors),
  `dist/sitemap-*.xml`, `dist/robots.txt`.
- Deploy: push to `main` runs `.github/workflows/pipeline.yml` (verify, then image `main-<timestamp>-<sha>`); Flux
  opens or updates "chore(docs): bump image to main-…" in the infrastructure repository (branch
  `flux/docs-updates`); a human merges it. bb-docs is public, so its Actions run.
- Visual baselines (macOS, Chromium) include the hub; the pricing link changes the `hub-*` snapshots.

## Phase A: PR A, `fix/public-fact-sources` (ships first)

Worktree `.claude/worktrees/public-fact-sources` from fresh `origin/main`. Covered by this plan's review (the
reviewer confirmed no separate review file is needed). The PR description states that the owner adopted P1 as the
reading of issue #14 AC4 for fact sources (2026-11-01), and names the D12 exemption.

- **A1. `Fact.astro`** drops the `data-source` attribute (D8).
- **A2. CLAUDE.md §0 and §1, README**: replace "cited `file:line`" with P1 and D11; §1's table describes what each
  repository is canonical for without listing paths (the P1 exception paths stay only in the README's sync section);
  remove the guide paths; "(buckets, lifecycle rules, domains)" becomes "(what is deployed, retention, domains)".
- **A3. Fact modules** (`sign.ts`, `sign-integrations.ts`, `sign-signing-order.ts`): every source rewritten to P1;
  headers lose the path shorthands; `VERIFY_QR_ARCHIVED_ISSUE` removed and its caveat comment reworded. Page
  frontmatter `source:` removed (R8). Tests in R8 updated: neutral sources asserted (for example the three rate-limit
  sources say "production configuration, read …: one replica"), comments and test names lose product issue
  references.
- **A4. Public-content check** `scripts/check-public-terms.mjs`, run by `npm run build` after `check-csp.mjs`, and
  alone as `npm run check:public`:
  - **Scope:** every text file in `dist` (`.html` text and attributes, `dist/sign/api/**` included, `.txt`, `.json`,
    `.xml`); `src/**`; `tests/**`; `scripts/**`; `public/**` (text files); `README.md`; `CLAUDE.md`; and the files under
    `.claude/PRPs/` that are new or changed against `origin/main` (`git diff --name-only origin/main...HEAD`).
  - **Rules everywhere:** the vendor and vendor-product names already public in issue #14 AC4; the vendor's
    storage-class identifiers in their identifier spellings, word-bounded so the plain words "standard" or "archive"
    never match; product issue references in the `bb-sign#<n>`, `binary-bridges-co/bb-sign#<n>` and
    `bb-sign/issues/<n>` forms; infrastructure paths (`bb-infrastructure/` followed by a path segment); the production
    manifest shorthand `\bprod:\d`; private-repository code paths (a path segment ending in `.kt`, `.java`, `.tsx`
    outside this repository's own files, or the product's module folder names followed by `/src/`).
  - **Rules for synced and built files** (`src/content/sync/**`, `public/sync/**`, `dist/**`): bare issue references
    `\(#\d{2,}\)` (does not match "PKCS#12" or "(#)"); fixed-period phrases ("Fixed 365-day retention", "past its 365
    days", "plazo fijo", "fixed period", "same for every organization", "igual para todas las organizaciones"); and,
    in published output and page sources, the generic word for the vendor's storage container.
  - **D12 exemption**, read from `scripts/public-terms-exemptions.json`: applied only to the listed paths and rules,
    and only while every listed source copy (`src/content/sync/sign/openapi.json`, `public/sync/sign/openapi.json`)
    hashes to the recorded value and `dist/sync/sign/openapi.json`, when present, is byte-identical to the public copy;
    prints the "exemption active" line on every run; a hash mismatch fails with "the synced contract changed: remove
    or update the exemption" (R3-1).
  - **Exact names** (storage names, prefixes, hosts): never in the repository. Read from `PUBLIC_TERMS_EXTRA` (a CI
    secret, newline-separated) or a git-ignored `.public-terms.local`; when neither exists the script prints
    "extra terms: skipped" and does not fail. `.gitignore` gains the file.
  - **Self-exemption:** the script, its exemption file and its own test only.
  - **Test** `tests/unit/public-terms.test.ts`: the matcher is a pure function taking the term list; fixtures use
    placeholders injected as the list (`PLACEHOLDER_TERM`), never real names. Cases: attribute match; `.txt`/`.json`/
    `.xml` match; word-bounding ("standard configuration" passes); "PKCS#12" passes and a parenthesised hash with three digits fails in a synced
    file; the `prod` shorthand followed by a digit fails (both built from fragments in the test); the exemption applies with the matching hash and fails with another; the extra list from
    the environment; the skip message; a hand-edited public copy fails; a `dist` copy that differs from the public one
    fails; the shipped exemption file carries at most the two D12 rules and only the four D12 paths (allow-list, R3-1).
  - Prints file, line and term; exits 1 on any match.
- **A4b. llms outputs (R3-4).** On the first build, check whether `dist/llms*.txt` include the generated API pages.
  If they do, exclude the API pages from `starlight-llms-txt` (its `exclude` option) rather than widening D12.
- **A4c. Generated legal pages (R3-3).** `renderLegalPage` stops writing the `source:` field and the source path in
  the GENERATED comment; the three mirrored pages are regenerated from the synced texts already in the repository
  (same commit, no network sync), so `sync.test.ts`'s byte-equality check holds.
- **A5. Current page text**: `admin/storage` (es + en) loses its description of the old platform page and the tier
  names in it (D9), so the check passes; the rest of the page waits for PR B.
- **A6.** Report `.claude/PRPs/reports/public-fact-sources-report.md`. `npm run verify` green. PR, merge, Flux image
  PR merged, `npm run verify:deploy -- https://docs.binarybridges.co`; then
  `curl -s https://docs.binarybridges.co/sign/admin/storage/ | grep -c data-source` prints `0`.

## Phase B: PR B, `docs/sign-storage-pricing` (after PR A merges)

Rebase this branch on `origin/main` first. **The synced contract and vectors are not touched (D13).**

### Pages

| Page (both locales) | URL | Sidebar | Change |
|---|---|---|---|
| `sign/pricing` | `/sign/pricing/` | Empezar / Start here, 2nd: "Precios" / "Pricing" | **New** |
| `sign/admin/storage` | `/sign/admin/storage/` | Administrar: "Almacenamiento y conservación" / "Storage and retention" | **Rewrite** |
| `sign/admin/own-certificate` | `/sign/admin/own-certificate/` (D1) | unchanged | Merge check, LinkCard |
| `sign/sending/retention-and-restore` | `/sign/sending/retention-and-restore/` (D1) | unchanged | Merge (R6), period per organization |
| `sign/legal/own-certificate-guide` | redirect to `/sign/admin/own-certificate/` | removed | **Delete** (+ en) |
| `sign/legal/retention-guide` | redirect to `/sign/sending/retention-and-restore/` | removed | **Delete** (+ en) |
| `sign/legal/terms` | unchanged | unchanged | Terms re-sync Versión 6; English translation, title and description |
| `sign/developers/errors` | unchanged | unchanged | `STORAGE_NOT_READY` row |
| `sign/admin/audit-trail` | unchanged | unchanged | Four storage events; evidence deleted at the end of the organization's period |
| R7 pages | unchanged | unchanged | Meaning-level rewrite |

### Storage page outline (es; en mirrors it)

1. Lead: each organization's files are kept in storage dedicated to it, isolated from other customers and encrypted.
   **Quién / Dónde**: organization admins, Configuración > Almacenamiento.
2. **La configuración estándar**: <Fact> 365 días per file (original from upload, signed PDF from completion,
   certificate from issue), then deleted for good; after <Fact> 30 días files move to a cheaper tier that keeps
   "Acceso inmediato".
3. **Cambiar la configuración**: from <Fact> 90 días to <Fact> 10 años, and cheaper tiers as files age. The admin
   requests (reason, one pending, **Retirar**); Binary Bridges approves, adjusts with a note, or rejects with a note;
   the decision and the versions show in the tab. LinkCard to Pricing.
4. **Disponibilidad**: two rows quoting "Acceso inmediato" and "Requiere restaurar, listo en horas" (up to about
   <Fact> 12 horas in the deepest tier); evidence certificate and audit trail always immediate; only completed
   originals and signed PDFs ever need a restore, drafts never. Link to retention-and-restore.
5. **Qué protege cada archivo** (D10).
6. **Acortar el plazo**: Binary Bridges' reviewer sees how many files would be deleted (including documents of
   envelopes still being signed) before applying it; files older than the new period are deleted within about
   <Fact> 2 días and cannot be recovered; evidence stays until its date.
7. **Mientras se prepara el almacenamiento**: the quoted preparing string; uploads wait (link to the error row).
8. **Archivos anteriores al almacenamiento dedicado**: <Fact> 365 días; the tab shows the date.
9. **El certificado de evidencia indica el plazo** of each file.
10. **Fechas de cada sobre** (kept) and **Guarde sus copias dentro del plazo** (period-neutral).

### Pricing page outline (es; en mirrors it)

- Lead: per envelope, in COP, plus IVA; the price depends on how long files are kept.
- Table: standard configuration (<Fact> 365 días) `<Price>` 1.000 + IVA por sobre; 10-year retention `<Price>` 1.200
  + IVA por sobre, Binary Bridges manages the storage tiers; more than <Fact> 100.000 sobres al mes: volume discounts
  down to `<Price>` 400 + IVA por sobre, contact soporte; other configurations: contact soporte.
- "Cada sobre creado cuenta, también los borradores y los cancelados, igual que en la cuota" (link `concepts/quotas`).
- Contact: `CONTACT_EMAIL` from `src/config/site.ts`. No minimums, fees, checkout or self-service wording.

### Tasks

- **B1. Pricing facts and formatter.** `src/content/facts/sign-pricing.ts` (`PRICING`: `standardPerEnvelopeCop`
  1000, `tenYearPerEnvelopeCop` 1200, `volumeThresholdEnvelopesPerMonth` 100000, `volumeFloorPerEnvelopeCop` 400,
  `billedUnit` 'every created envelope, drafts and cancelled included', `tenYearTiersManagedByBinaryBridges` true;
  sources per D11), re-exported from `sign.ts`. `src/lib/price.ts` (`formatCop`) with unit tests;
  `src/components/facts/Price.astro`. `facts.test.ts`: floor < standard < ten-year; `PRICING` in the walk.
- **B2. Error fact.** `ERROR_CODES` gains `STORAGE_NOT_READY` (503, `Retry-After` 60 s, nothing stored, retry after
  the header), source "Sign v0.42.0 behaviour: …"; errors page row in both locales (what happened and what to do).
- **B3. Retention facts.** `src/content/facts/sign-storage.ts` (`ORG_STORAGE`), re-exported: `defaultRetentionDays`
  365, `defaultCheaperTierAfterDays` 30, `defaultAllImmediate` true, `minRetentionDays` 90, `maxRetentionDays` 3650,
  `maxRetentionYears` 10, `maxTiers` 5, `deepestRestoreMaxHours` 12, `legacyRetentionDays` 365,
  `shortenDeletionDays` 2, `requestReasonMin` 10, `requestReasonMax` 1000, `onePendingRequest` true,
  `managePermission` 'document-settings:manage', `evidenceLocked` true, `documentsVersionedNotLocked` true,
  `evidenceAlwaysImmediate` true, `onlyCompletedFilesNeedRestore` true, `certificateStatesPeriod` true,
  `archiveDatesVisible` false, `preparingBlocksUploads` true; sources per P1. Remove `RETENTION_POLICY.retentionDays`,
  `EVIDENCE.retentionDays` and `RETENTION_IMPLEMENTED` with **no alias**; `configurable` true; `restoreOnRequest`
  reworded. `NOT_SHIPPED`, `ORG_PERMISSIONS`, `AUDIT_EVENT_TYPES` per R3/R8. `facts.test.ts`: min < default < max;
  max 3650; legacy = default; restore timeout ≥ deepest restore; `ORG_STORAGE` in the walk; `NOT_SHIPPED` still
  contains billing.
- **B4. Content denylist** in `content.test.ts`: `1.000`/`1,000`, `1.200`/`1,200` and `400` next to COP, IVA or
  VAT; `100.000`/`100,000`; `3.650`/`3650`; `10 (años|years)`; `12 (h|horas|hours)`.
- **B5. Storage page** to the outline; sidebar label; description.
- **B6. Pricing page** to the outline; `products.ts` sidebar entry and `pricing: 'sign/pricing'`; `ProductCard.astro`
  third link "Precios" / "Pricing"; `products.test.ts`: the pricing slug exists in both locales; links from
  `sign/index`, `concepts/quotas`, `admin/quota-and-usage`.
- **B7. Terms-only sync at `v0.42.0` (D13).**
  - Remove both guides from `sync.extra`, from `sync-product.mjs` and from `LEGAL_MIRRORS`; repoint `LEGAL_LINK_MAP`
    (D4).
  - Add `--only <synced name>` to `sync-product.mjs`: copies the named files only and leaves every other synced file
    byte-identical. The manifest moves `ref`, `commit` and `commitDate` from the top level into each file entry, so a
    partial sync records the release each file came from (openapi and vectors keep `v0.38.0`; the terms get
    `v0.42.0`). The top-level `rewrites` moves into the contract's per-file entry (`files["openapi.json"].rewrites`),
    so a terms-only sync never empties it (R3-2). `sync.test.ts` reads per-file entries, asserts the contract entry's
    `rewrites`, and asserts a partial sync changes only the named files.
  - `PRODUCT_REPO_TOKEN=$(gh auth token) npm run sync:sign -- v0.42.0 --only legal/terminos-y-condiciones.md`.
  - Delete the two synced guide files and their manifest entries. Update `legal.test.ts` (one mirror).
- **B8. English terms** `en/sign/legal/terms.mdx`: Versión 5 and 6 translated (service name, §3.1-3.3, new §3.4,
  history), `legalVersion: "Versión 6 · 2026-10-31"`, same numbering, title and description updated for the service
  name, links to `/en/` targets. The owner reviews §3. The report notes the expected Versión 7 re-sync.
- **B9. Merge the guides** (R6); delete the four mirror pages; remove the two Legal sidebar entries; repoint every
  link.
- **B10. Redirects** in `astro.config.mjs` for the four old URLs (D2).
- **B11. Sweep** R7, both locales; `legal/retention` tables rewritten; `admin/audit-trail` events.
- **B12. Tests.** `smoke.spec.ts` PAGES: `/sign/pricing/`, `/en/sign/pricing/`, `/sign/admin/storage/`; each old URL
  ends on its D1 page; the hub card links to pricing in both locales. Re-record and review `hub-*` baselines on macOS.
- **B13. Report** `.claude/PRPs/reports/sign-storage-pricing-docs-report.md` (public: same rules, checked by A4).

### Amendment (implementation, 2026-11-01): PR B implemented before PR A

PR A had not been implemented when PR B was started (its worktree was still at `5ee7007`), and the app is
waiting on the D1 URLs. PR B is therefore implemented on `5ee7007`, not rebased on PR A. What changes:

- Everything PR B **adds** already follows P1: the new fact modules (`sign-pricing.ts`, `sign-storage.ts`), the new
  facts in `sign.ts` and `sign-integrations.ts`, the new and rewritten pages (no `source:` frontmatter on them),
  the tests and the report. The facts test checks the three P1 source forms for `ORG_STORAGE` and `PRICING` only.
- What PR A **changes in existing files** stays for PR A: `Fact.astro`'s `data-source`, the existing fact sources
  and module headers, the existing `source:` frontmatter (including the English terms page, which `legal.test.ts`
  still pins), the generator's `source:` field, README and CLAUDE.md.
- A4 (`check-public-terms.mjs`) does not exist yet. Until PR A lands, PR B runs an equivalent check by hand over its
  own diff (vendor and vendor-product names, storage-class identifiers, product issue references, infrastructure
  paths, the production-manifest shorthand, private-repository code paths) and reports the result. The
  `npm run check:public` lines of the Validation block run after the rebase on PR A.
- Whichever of PR A and PR B merges second rebases on the other and resolves the fact-module conflicts by keeping
  PR A's P1 sources and PR B's values.
- So that every commit builds, B3 adds the new facts and B11 removes `RETENTION_POLICY.retentionDays`,
  `EVIDENCE.retentionDays` and `RETENTION_IMPLEMENTED` in the same commit as their last uses (still with no alias).

## Phase C: PR C, `chore/sync-sign-contract` (after the app's vendor-name removal work ships)

Worktree `.claude/worktrees/sync-sign-contract` from fresh `origin/main`, once a Sign release contains the app's
vendor-name removal work and its contract descriptions carry neither issue references nor a fixed period.

- **C1.** Before syncing, read the release's contract: no bare issue reference, no fixed-period phrase, no vendor
  term. If any remains, stop and report it to the app side; do not sync.
- **C2.** `PRODUCT_REPO_TOKEN=$(gh auth token) npm run sync:sign -- <release>` (full sync: contract, vectors, terms;
  the terms may be Versión 7 with absolute docs links, D4, and then the English terms follow).
- **C3.** Delete the D12 entry from `scripts/public-terms-exemptions.json` (the file stays, empty, with the test that
  an entry must match its hash).
- **C4.** Pages that describe API fields now documented differently in the reference are checked against it.
- **C5.** Validation: `npm run check:public` prints no "exemption active" line; the Validation block below with the
  `dist/sign/api/` exclusion removed returns 0.

## Validation (zsh-safe; expected output stated)

```bash
cd .claude/worktrees/sign-storage-pricing-docs      # PR A: public-fact-sources; PR C: sync-sign-contract
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22
npm ci
npm run verify
#   expect: exit 0 (includes check-csp and check-public-terms)
npm run check:public
#   expect (PR A, PR B): "public terms: 0 matches", "exemption active since 2026-11-01: synced API contract …",
#   and "extra terms: skipped" when no secret or local file. PR C: no "exemption active" line.

# PR B only: the contract and vectors are untouched (D13); expect no output
git diff --name-only origin/main -- src/content/sync/sign/openapi.json src/content/sync/sign/webhook-signature-vectors.json public/sync
node -e "const m=require('./src/content/sync/sign/sign.json');for(const [k,v] of Object.entries(m.files))console.log(k,v.ref)"
#   expect: openapi.json v0.38.0, webhook-signature-vectors.json v0.38.0, legal/terminos-y-condiciones.md v0.42.0

# AC1/AC3, sources (generated Spanish terms excluded): expect no output
grep -rniE "plazo fijo|no se puede configurar|igual para todas las organizaciones|no negociable|fixed period|same for every organization|not configured per organization|own-certificate-guide|retention-guide" \
  src/content/docs --include='*.mdx' --include='*.md' | grep -v 'src/content/docs/sign/legal/terms.md'
grep -rn "own-certificate-guide\|retention-guide" src --include='*.ts' --include='*.mjs' --include='*.astro'
#   expect: no output

# AC1, built site with tags stripped and whitespace collapsed: expect 0 and 0.
# dist/sign/api/ is excluded in PR A and PR B only, because it renders the D12-exempted contract; PR C drops the
# exclusion (remove the -not -path) and expects 0.
find dist -name '*.html' -not -path 'dist/sign/api/*' -exec sed -e 's/<[^>]*>/ /g' {} + | tr -s '[:space:]' ' ' \
  | grep -ciE "plazo fijo|no se puede configurar|igual para todas las organizaciones|fixed period|same for every organization"
cat dist/llms*.txt | tr -s '[:space:]' ' ' | grep -ciE "plazo fijo|fixed period"

# AC2: prices per locale; expect 1 or more for each
LC_ALL=en_US.UTF-8 sed -e 's/<[^>]*>/ /g' dist/sign/pricing/index.html | LC_ALL=en_US.UTF-8 grep -o '\$.\{1,2\}1\.000' | wc -l
LC_ALL=en_US.UTF-8 sed -e 's/<[^>]*>/ /g' dist/en/sign/pricing/index.html | LC_ALL=en_US.UTF-8 grep -o 'COP.\{1,2\}1,000' | wc -l

# AC4: no fact source in any output, no source frontmatter outside the generated terms; expect no output
grep -rl "data-source" dist --include='*.html'
grep -rl '^source:' src/content/docs

# Redirects: expect the D1 path in each, and 0 redirect pages in the sitemap
for p in sign/legal/own-certificate-guide en/sign/legal/own-certificate-guide sign/legal/retention-guide en/sign/legal/retention-guide; do
  grep -o 'url=[^"]*' "dist/$p/index.html"; done
grep -c "legal/.*-guide" dist/sitemap-0.xml
```

Then look at storage, pricing, retention-and-restore and own-certificate in both themes at 375px and 1440px.

## Deploy (each PR)

1. PR to `main` (verify runs on the PR). Merge when green.
2. The push builds `main-<timestamp>-<sha>`; Flux opens or updates "chore(docs): bump image to main-…" in the
   infrastructure repository; a human merges it.
3. `npm run verify:deploy -- https://docs.binarybridges.co` and `npm run test:prod`.
4. PR B only: open the four D1 URLs and the four redirects live, then tell the app side the pages are live with the
   D1 URLs, that tier names follow once a release ships them, and that PR C waits for its contract rewrite. Only then
   may the app remove its copies.
5. Move this plan to `plans/completed/` after PR C, in a follow-up PR (never on `main` directly).

## Risks and rollback

| Risk | Mitigation |
|---|---|
| The app removes its guides before PR B deploys | AC3 order; Deploy step 4 is the hand-off |
| A future sync fails because the guides are gone | B7 removes them from the sync |
| The D12 exemption outlives its reason or covers a different contract | Pinned to the contract hash; printed on every build; PR C removes it; a mismatch fails the build |
| Between PR B and PR C the API reference still states a fixed 365 days next to the new Storage page | Known, dated and visible (D12); the Storage page is the authority; PR C closes it as soon as the app's release ships |
| A partial sync leaves the manifest inconsistent | Per-file `ref`/`commit` in the manifest; `sync.test.ts` covers partial syncs |
| The check flags a legitimate word ("standard configuration", "archive", "PKCS#12") | Word-bounded identifier spellings; the bare-reference pattern needs parentheses and two digits; unit-tested |
| The exact-name check silently never runs | The script prints "skipped" when the list is absent; CI gets the secret |
| Fact sources lose precision without paths | Reviewers verify sources against the product privately; P1 sources name the release and the behaviour |
| Tier wording drifts from the app | D6: availability labels only, names in a follow-up |
| Wrong legal translation | `legal.test.ts` structure check; owner reviews §3 |

Rollback: revert the merge commit of a PR on `main`; Flux's next image PR restores the previous site. Revert in the
order C, B, A (reverting A alone re-exposes sources). After the app drops its guides, keep them as bb-docs pages.

## Owner answers (2026-11-01)

| # | Question | Answer |
|---|---|---|
| O1 | Which envelopes are billed? | Every created envelope, drafts and cancelled included, as the quota counts them |
| O2 | Sales contact | soporte@binarybridges.co |
| O3 | Minimums, setup fees, what "10 years" includes | None stated: do not mention any; other configurations and volumes, contact soporte. The 10-year price is a 10-year retention; Binary Bridges manages the storage tiers |
| O4 | Tier names | Approved (D6); used once a release ships them, availability wording until then |
| O5 | Terms links after the app drops its guide routes | Expected as a terms Versión 7 app-side; bb-docs mirrors what is published (D4) |
| O6 | Is the organization told what a shorter period deletes? | The impact is shown to Binary Bridges' reviewer; no promise that the organization is notified |
| O7 | Rename the site to "Sign" | Separate follow-up |
| O8 | Source citations | No private code paths in any public file; sources cite behaviour at a release, production configuration by date, or an owner decision (P1) |
| O9 | The synced contract's references and fixed period | Rewritten by the app's vendor-name removal work; PR B does not re-sync the contract; PR C syncs the cleaned one |

## Change log (round 1 → revision 2)

| Finding | Change |
|---|---|
| 1 HIGH, deletion protection | D10 splits it: evidence locked until the end of its period, documents versioned and not locked; `ORG_STORAGE.evidenceLocked` and `documentsVersionedNotLocked` replace a general claim; outline item 5; AC1 restated |
| 2 HIGH, internal fact sources | P1 public-source rule, written into CLAUDE.md §0 (A2) and applied to every fact module (A3); the tests that pin internal sources are listed in R8 and changed in PR A; issue-reference and infrastructure-path patterns added to the check (A4) |
| 3 HIGH, check publishes what it hides | A4 keeps exact names out of the repository (CI secret or git-ignored local file, skipped when absent); fixtures are placeholders injected as the list |
| 4 HIGH, unchecked tree | A4 scans every text output in `dist`, `src/`, `tests/`, `scripts/`, `public/`, README, CLAUDE.md, and new or changed files under `.claude/PRPs/`; identifiers word-bounded |
| 5 MEDIUM, plan file references | Production paths, product commit hashes, the product's plan and runbook names and decision labels removed; the branch history rewritten before the first push |
| 6 MEDIUM, tier wording | D6 quotes the two availability labels verbatim; tier names recorded and deferred until a release has them |
| 7 MEDIUM, storage not ready | B2 adds `STORAGE_NOT_READY` to `ERROR_CODES` and the errors page; outline item 7 quotes the preparing string |
| 8 MEDIUM, sweep | R7 rebuilt from fact uses (17 Spanish pages plus twins, `sending/documents` included); B3 renames without aliases |
| 9 MEDIUM, validation | Globs quoted; phrase checks on sources and on tag-stripped HTML; `llms*.txt` and sitemap checks; expected output stated |
| 10 MEDIUM, leak fix order | Phase A is its own first PR, not waiting on pricing |
| 11 LOW, standard tier step | Outline item 2 states the 30-day move to a cheaper tier that stays immediately available |
| 12 LOW, fact-test wiring | `ORG_STORAGE` and `PRICING` in the walk; D11 records the owner-decision source |
| 13 LOW, terms translation | B8 updates the English title and description, uses `/en/` targets, notes the Versión 7 re-sync, keeps the owner review |
| 14 LOW, open item and naming | R3 resolves the audit events (added); the Flux PR title corrected |
| Owner answers | AC2, the pricing outline and B1 follow O1-O3; O4-O7 recorded |

## Change log (round 2 → revision 3)

| Finding | Change |
|---|---|
| R2-1 HIGH, published contract | R5 records what the contract says. D13: PR B syncs the terms only (`--only`, per-file manifest entries) and leaves the contract and vectors byte-identical. New Phase C syncs the cleaned contract after the app's vendor-name removal work ships, and removes the exemption. D12: one dated, hash-pinned, printed exemption for exactly the current contract's outputs and exactly two rules. A4 adds the bare-reference pattern `\(#\d{2,}\)` and fixed-period phrases for synced and built files and scans `dist/sign/api/` and `/sync/**`. The validation's `dist/sign/api/` exclusion is justified by D12 and dropped in PR C. AC1, AC4, Summary, Risks and O9 updated |
| R2-2 LOW, pinned infrastructure source | R8 lists `facts.test.ts:235-237` and the `prod` shorthand in `sign-integrations.ts:8`; A3 rewrites both; A4 adds `\bprod:\d` |
| R2-3 LOW, locale-dependent price check | `LC_ALL=en_US.UTF-8`, `.\{1,2\}` for the no-break space, `grep -o … \| wc -l`, expect 1 or more |
| R2-4 LOW, P1 reading of AC4 (owner decision, stricter) | P1 rewritten: no private-repository paths in any public file; sources cite behaviour at a release, production configuration by date, or an owner decision; one narrow, stated exception for the three published artifacts' locations in the sync configuration, manifest and generated terms header. All product paths removed from this plan's research. PR A removes page `source:` frontmatter, path shorthands in fact headers, and states the owner's adoption of P1 in its description; the facts test checks the three source forms |

## Change log (round 3 → revision 4, folded in before implementation)

| Finding | Change |
|---|---|
| R3-1 MEDIUM, unpinned copies | D12 and A4: both source copies must match the recorded hash and the `dist` copy must equal the public one; the test pins an allow-list of at most the two rules and the four paths |
| R3-2 LOW, rewrites on partial sync | B7: `rewrites` moves into the contract's per-file manifest entry; `sync.test.ts` adapted |
| R3-3 LOW, narrower exception | P1 exception limited to the sync configuration and manifest; A4c: the generator drops `source:` and the header path, pages regenerated from the synced texts in PR A; the AC4 validation expects no `source:` frontmatter at all |
| R3-4 LOW, llms outputs | A4b: check `dist/llms*.txt` on PR A's first build and exclude the API pages from the plugin if they appear, never widening D12 |
