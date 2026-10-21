# Plan: bring the bb-sign documentation up to bb-sign v0.34 (and remove the legal-review banner)

## Summary

The bb-sign documentation was verified against bb-sign `d1badc5` (2026-10-07). bb-sign `main` is now
`df6a2a6` (v0.34.0 legal validity + v0.34.1), 36 commits later, and bb-sign#276 (in flight) publishes the
terms as Versión 4 without the "Pendiente de revisión jurídica" banner. Four independent audits compared every
page (es and en), every fact and the synced files with bb-sign `main` and bb-infrastructure `main` `5a8468f`
(production). Their reports, with `file:line` proof for every row, are the detailed task source:

- `.claude/PRPs/research/sync-sign-v0-34/1-concepts-reference-facts.md` (fact sheet, not-shipped list, concepts, reference)
- `.claude/PRPs/research/sync-sign-v0-34/2-sending-signing.md` (sending, signing, getting started)
- `.claude/PRPs/research/sync-sign-v0-34/3-admin-legal.md` (admin, legal, banner)
- `.claude/PRPs/research/sync-sign-v0-34/4-developers-api.md` (developers, SDK pages, OpenAPI/vectors sync)

Totals: about 20 statements false today (WRONG), the rest OUTDATED or MISSING; 14 wrong facts, ~40 new facts;
5 "not shipped" items now shipped; the published terms page is not a faithful copy (reworded intro, a
different clause 2.5, a clause 3.4 that exists in no version).

## User story

As a customer, signer or developer reading docs.binarybridges.co, I want every page to describe what bb-sign
does in production today, so that I can rely on it (and on the terms it shows) without checking the app.

## Metadata

| | |
|---|---|
| Complexity | Large (content across ~51 page pairs, fact sheet, tests, sync script) |
| Source | Owner request 2026-10-20 ("validate bb-docs against the latest changes; update any discrepancy; deploy manually"; "remove any message 'Pendiente de revisión jurídica'") |
| Depends on | bb-sign#276 merged (terms Versión 4 without the banner) before the final sync |
| Branch | `docs/sync-sign-v0-34` |
| Deploy | Manual (Actions minutes exhausted until 2026-11-04): build the image locally (linux/amd64), push `ghcr.io/binary-bridges-co/bb-docs:main-<UTC yyyymmddThhmmss>-<sha>`, Flux image automation or a bb-infrastructure PR bumps `apps/docs/deployment.yaml` |

## Acceptance criteria

1. Every WRONG and OUTDATED row in the four reports is fixed in both locales, or recorded in the report as
   rejected with a reason (e.g. a row that is itself wrong on re-check).
2. Every MISSING row for a feature live in production is covered; features on `main` but inactive in
   production (agreement pinning, Glacier archiving) are described as such or not at all (decisions D2, D4).
3. `src/content/facts/sign.ts` is re-verified against bb-sign `df6a2a6`(+#276) and bb-infrastructure `5a8468f`:
   values, sources, new facts; header re-dated; `facts.test.ts` and `content.test.ts` updated (no test
   deleted to go green; each inverted assertion asserts the new truth).
4. Synced OpenAPI and webhook vectors come from bb-sign `main` after #276, manifest updated.
5. The Spanish terms and both guides are rendered **verbatim** from synced copies of bb-sign's Markdown, so
   they cannot drift again; English pages are translations with the same version and clause numbering.
6. The phrase "Pendiente de revisión jurídica" / "Pending legal review" appears nowhere in the site, its rules
   (CLAUDE.md, README) or tests.
7. `npm run verify` green; changed pages checked in both themes and at 375 px.
8. Deployed to docs.binarybridges.co and checked with `npm run verify:deploy -- https://docs.binarybridges.co`
   and in Chrome.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Production behaviour wins over declared templates** (re-read live 2026-10-21T00:02Z: `aws s3api get-bucket-lifecycle-configuration --bucket production-bbsign-documents` → one rule, `Expiration 365`, no transitions; re-read again right before deploy). Rows citing `bb-sign-aws.yml:439-443` as proof of "no Glacier" are re-sourced to the live read: the template declares the opposite. Retention pages say: files are kept 365 days (live S3 expiration); nothing is moved to archive storage today; when a copy is archived, it can be restored on request. No "after 90 days" as current behaviour. | Live lifecycle has one 365-day expiration rule and no IA/Glacier rule (`bb-infrastructure/docs/runbooks/documents-lifecycle-guard.md:8-17`). |
| D2 | **Envelope "archived" status ≠ file archiving.** Keep the two apart everywhere: the envelope moves to Archived after the archive threshold and stays downloadable (signer link included) until retention ends. | Report 2 rows on archived-envelopes, download, sign-and-download, troubleshooting; bb-sign#122/#214 P0. |
| D3 | **Legal texts become synced files, and the Spanish pages are generated from them.** `scripts/sync-product.mjs` copies `docs/legal/terminos-y-condiciones.md`, `docs/guias/certificado-propio.md`, `docs/guias/conservacion-y-restauracion.md` into `src/content/sync/sign/legal/` (SHA-256 in the manifest, covered by `sync.test.ts`) and then **generates** `src/content/docs/sign/legal/{terms,own-certificate-guide,retention-guide}.md` (a `GENERATED — do not edit` comment, frontmatter with title and `legalVersion`). Generated pages are ordinary Starlight content, so they get the table of contents, search and the link validator. The generator applies exactly three documented, mechanical transforms and nothing else: (a) drops the H1 (the page title comes from frontmatter); (b) drops the `**Versión N** · date` line and puts `Versión N · date` into `legalVersion` (rendered once by `LegalHeader`); (c) rewrites app-relative link targets through a fixed map — `/legal/terminos` → `/sign/legal/terms`, `/guias/certificado-propio` → `/sign/legal/own-certificate-guide`, `/guias/conservacion-y-restauracion` → `/sign/legal/retention-guide` — failing the sync on any other app-relative target. Link text and every other byte stay identical; a unit test re-applies the transforms to the synced source and asserts equality with the generated page. English pages remain hand translations with the same `legalVersion`; a test extracts from both the `## N.` section headings **and** the bold clause numbers (`**N.N**`) and the history `Versión N` items and asserts the sets are equal (this is what would have caught the invented 3.4). | Report 3 §1: the hand-copied terms drifted and invented a clause. Review round 1 H1, M8. |
| D4 | **Agreements: documented as inactive for signers, not as a feature.** Every org member holds `agreement:read` and sees the Settings "Acuerdos" tab, whose own intro says signers accept the text. That is not true in production (`AGREEMENTS_PIN_AT_SEND=false`, `bb-infrastructure/apps/bb-sign/edge-api.yaml:64,68`). So: the `agreement:read`/`agreement:manage` permission rows are documented; `admin/permissions` (and the Settings overview in `admin/index`) gets one sourced sentence, both locales: the Acuerdos tab lets admins publish texts, which are not yet shown to signers nor attached to envelopes. NOT_SHIPPED gains "signer acceptance of agreement texts". No `admin/agreements` page. The misleading tab intro is a bb-sign issue (D7). | Only what works in production is a feature; readers meet the tab, so silence would mislead. Review round 1 H3. |
| D9 | **QR caveat** (cite the bb-sign issue number in the fact source; the issue is filed before deploy, R2-5). `signing/verify-a-document` (both locales) states that scanning the QR of an envelope that has moved to Archivados currently shows "Firma no válida", and that checking the downloaded file with "Comprobar un archivo" gives the right answer. Sourced to `VerifySignatureSealUseCase` (live signers only) and the archive threshold fact; removed when the bb-sign fix (D7 issue) ships. Also the troubleshooting row. | The defect is real (review round 1 spot-check); the docs must not send readers into it. Review round 1 H2. |
| D10 | **OTP wording**: a code is bound to the signer it was issued for (`challenge.signerId != expectedSignerId`), not to a link. | Review round 1 M7. |
| D5 | **New pages** (es + en): `concepts/evidence-certificate`, `sending/retention-and-restore` (replacing the archive-access claims in `sending/archived-envelopes`), `admin/sign-in-security` (admin MFA), `legal/own-certificate-guide` and `legal/retention-guide` (verbatim mirrors, D3). Verify-by-file is added to `signing/verify-a-document`, not a new page. No new developer page: endpoints come from the regenerated OpenAPI reference; webhooks/errors/auth pages are updated. | Reports 1-4 "new pages proposed", trimmed to what is live. |
| D6 | **Java snippets are fixed to compile against the SDK on `main`**, verified by compiling them (or removed if they cannot be). | Report 4: they do not compile today. |
| D7 | **Product defects found by the audit are filed as bb-sign issues, not documented around**: QR verification of archived envelopes, the never-shown "SHA-256 of the signed PDF" line, the audit-trail hint omitting contributors, SDK gaps (`verifyDocumentFile`, missing evidence/workspace/agreement methods, `Retry-After`), the `GET /verify` OpenAPI description. Each is verified first; docs describe current behaviour. | bb-docs rule: no fact without a source; fixes belong at the source. |
| D8 | **Banner removal** in bb-docs: `LegalHeader.astro` keeps version + date (and the English "Spanish prevails" note) only; the Aside in both `electronic-vs-digital-signature.mdx`; CLAUDE.md §3 and README rule rewritten to "mirrored verbatim with their version header"; `legal.test.ts` asserts the header shows the version and that the phrase is absent site-wide. | Owner decision 2026-10-20. |

## Tasks (phased; files disjoint within a phase)

### Phase 1 — foundation (one implementer, sequential; owns every shared file)

0. Record the exact bb-sign commit synced from (the `main` commit that contains #276) in the report and the manifest.

1. `src/content/facts/sign.ts`: apply report 1 §1a (F1-F14), §1b (moved sources), §1c (new facts), §2
   (NOT_SHIPPED: remove NS1-NS5, narrow NS2 to "general API rate limits", add "signer acceptance of agreement
   texts"); report 3/4 fact rows (permissions, webhook events, error codes, rate limits). Re-date the header.
2. `tests/unit/facts.test.ts`, `tests/unit/content.test.ts`: invert/rewrite the five now-false assertions
   (report 1 §2 "Test denylists"); add the new `FACT_DENYLIST` literals.
3. `scripts/sync-product.mjs` (+ `src/config/products.ts` if it mirrors the list): add the three legal files
   (not published as downloads); update `tests/unit/sync.test.ts`. Run the sync from the bb-sign `main`
   commit that contains #276 (a clean detached worktree, never the stale base checkout), commit the result.
4. Legal rendering (D3): the generator writes Spanish `legal/terms.md`, `legal/own-certificate-guide.md`,
   `legal/retention-guide.md`; **delete** the hand-written `sign/legal/terms.mdx` (slug collision). The version
   header is rendered by a Starlight `PageTitle` override from frontmatter, not imported by pages (R2-2):
   frontmatter `legal: true` marks a legal page; the override renders `LegalHeader` with `legalVersion` when
   present (the terms: `Versión 4 · 2026-10-20`) and, on English pages, the "Spanish prevails" note. The guides
   carry no version (their source has none) and show only that note in English. Remove the `<LegalHeader>` import
   from every MDX page so it renders once. English twins of the three are hand translations with matching
   `legalVersion` and clause markers. `tests/unit/legal.test.ts` per D3/D8: asserts `legal: true` pages render
   the header (built HTML), the English clause-marker test matches markers like `**3.1 Plazo fijo.**`
   (`/\*\*(\d+\.\d+)\b/`) plus `## N.` headings and history items (R2-3). Banner removal per D8 incl.
   CLAUDE.md and README.
5. **All shared files are finished in Phase 1**: every fact any Phase 2 page needs (from the four reports) is
   added to `sign.ts` now; every new page is created as a stub (both locales, frontmatter, one-line body) and
   registered in the sidebar in `src/config/products.ts`, so `products.test.ts` passes before Phase 2 starts.
   Phase 2 implementers do not edit `sign.ts`, `products.ts`, tests or sync files; a missing fact is reported
   back to the lead, who adds it.

### Phase 2 — pages (four implementers in parallel, each owns one set of files, both locales)

- A: `concepts/*`, `reference/*` (report 1 §3), new `concepts/evidence-certificate`.
- B: `sending/*`, `signing/*`, `getting-started/*`, `sign/index.mdx` (report 2), new `sending/retention-and-restore`.
- C: `admin/*`, `legal/retention.mdx`, `legal/electronic-vs-digital-signature.mdx` content rows (report 3),
  new `admin/sign-in-security`.
- D: `developers/*`, `sdks/*` (report 4), Java snippets (D6). Hand-written links into the generated
  `/sign/api/**` reference are checked against the regenerated build output (the link validator skips them).

Each implementer: numbers only through the fact sheet (add a fact in Phase 1 style if one is missing, coordinated
by the lead), sidebar entries for new pages, both locales key for key, no item of NOT_SHIPPED described as
available, troubleshooting rows say what happened and what to do.

### Phase 3 — close

5. `npm run verify`; manual look at changed/new pages in both themes and at 375 px (Claude in Chrome).
6. Independent review of the diff against the four reports and this plan.
7. File the D7 bb-sign issues (after verifying each defect).
8. Report `.claude/PRPs/reports/sync-sign-v0-34-report.md`.

## Deploy (ordering)

1. Merge the bb-docs PR (manual, Actions minutes exhausted: lift the required check, merge, restore it, as for
   bb-sign/bb-infrastructure). Never push an image built from an unmerged branch: Flux image automation would
   pick it up.
2. From a clean detached worktree at the merge commit: `docker buildx build --platform linux/amd64` the
   Dockerfile, run `scripts/verify-deploy.sh` against it locally, then tag
   `ghcr.io/binary-bridges-co/bb-docs:main-<UTC yyyymmddThhmmss>-<full merge sha>` (matches
   `bb-infrastructure/automation/docs/image-policy.yaml` filterTags) and push with
   `gh auth token | docker login ghcr.io -u edward-montoya --password-stdin`; `docker logout ghcr.io` after.
3. Flux image automation commits the bump of `apps/docs/deployment.yaml` to branch `flux/docs-updates` per
   `bb-infrastructure/docs/runbooks/image-automation.md`. The "Image update PRs" workflow that normally opens the
   PR runs on Actions (no minutes): open the PR from `flux/docs-updates` by hand, then merge it manually (same lift/restore), reconcile Flux,
   watch the rollout (`kubectl -n docs rollout status deploy/docs`).
4. Rollback: pin `main-20261010T223716-8ef6ae370e6dcdf45e43a7cd3ea308d8021f522c` (the image running now, so it
   exists in GHCR) in `apps/docs/deployment.yaml`.

## Validation

```bash
npm run sync:sign -- --from <clean bb-sign main worktree>     # then: git diff --stat src/content/sync
npm run verify                                               # build (types, links, CSP), unit, Playwright
grep -rniE "pendiente de revisi|pending legal review" src CLAUDE.md README.md tests   # → nothing
```

Deploy validation: `bash scripts/verify-deploy.sh http://localhost:3300` on the built image, then
`npm run verify:deploy -- https://docs.binarybridges.co` and a Chrome check of `/sign/legal/terms`, a new page,
and one updated page per section after the rollout.

## Risks and rollback

- **Legal text accuracy**: generating the Spanish pages from synced files removes hand-copy drift; the English translation is the
  remaining risk, mitigated by the version/heading test and a side-by-side read.
- **Over-claiming**: D1/D2/D4 and the NOT_SHIPPED list; Phase 3 review checks every new claim has a fact source.
- **Volume**: four parallel implementers on disjoint file sets; fact additions centralized in Phase 1.
- **Deploy**: a bad image is rolled back by pinning the previous tag
  (`main-20261010T223716-8ef6ae3…`) in `apps/docs/deployment.yaml`; nothing else depends on bb-docs.
