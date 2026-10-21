---
plan: .claude/PRPs/plans/sync-sign-v0-34.plan.md
source: bb-sign df6a2a6 (main) + bb-sign#276 worktree remove-legal-review-banner; bb-infrastructure 5a8468f
issue: owner request 2026-10-20
status: APPROVED
reviewer: independent plan reviewer (code-reviewer subagent)
reviewed: 2026-10-20
---

## Verdict

REJECTED. The audits are largely right: every WRONG row I re-checked against code holds (list under Findings, row 12). The
plan's direction is sound, but three decisions are not yet implementable or safe as written. (1) D3 renders bb-sign Markdown
verbatim without saying what happens to its root-relative links (`/legal/terminos`, `/guias/...`), which do not exist on the
docs site, or to the H1 and "Versión 4" lines that duplicate the page title and `LegalHeader`. (2) D7 files the
"QR verification fails for archived envelopes" defect but never says whether the docs warn about it; as written, the
verify page would keep telling readers to scan a QR that returns "Firma no válida" for any envelope older than about 30 days.
(3) D4 omits agreements while every org member sees an "Acuerdos" tab, and the permission facts (F4/F5) list
`agreement:*` anyway. Revise and re-review. The MEDIUM items should be fixed in the same revision.

## Findings

| # | Severity | Finding | Required change |
|---|---|---|---|
| 1 | HIGH | D3: the three synced files contain root-relative links: `terminos-y-condiciones.md:19` `/guias/certificado-propio`, `:33` `/guias/conservacion-y-restauracion`; `certificado-propio.md:3` and `conservacion-y-restauracion.md:3` `/legal/terminos`. On the docs site the pages are `/sign/legal/...`, so these 404, and `starlight-links-validator` (only `/sync/**` and `/sign/api/**` excluded, `astro.config.mjs`) fails the build or, if someone excludes them, ships dead links. The plan is silent. It is also silent on the body H1 ("# Términos y condiciones...") and the "**Versión 4** · 2026-10-20" line, which would duplicate the page title and `LegalHeader`; on the render mechanism (`src/content/sync` is not a collection; an imported `.md` component gives no Starlight TOC or heading anchors, a new glob-loader collection does); and on the "files not published as downloads" requirement versus the current `publish` list. | Specify the mechanism (glob-loader collection + `render()` for headings/TOC, or an imported `.md` plus an explicit TOC decision). Specify link handling that leaves the text byte-identical: a rewrite map applied at render time (`/legal/terminos` -> `/sign/legal/terms`, `/guias/certificado-propio` -> `/sign/legal/own-certificate-guide`, `/guias/conservacion-y-restauracion` -> `/sign/legal/retention-guide`, plus `/en/...` for English) in a rehype plugin scoped to these files; the link validator must still cover them. State how the H1 and version line are shown once (LegalHeader reads the version from the synced file). Add tests: every internal link in the three files resolves to a built page; the frontmatter `legalVersion` equals the version line in the synced file. |
| 2 | HIGH | D7/D2: QR verification of archived envelopes is a real defect. `VerifySignatureSealUseCase.kt:40` looks up `signerRepo.findByEnvelopeIdAndSealHashStartingWith` (live table only) and returns "Signature not found or invalid hash" otherwise; the reaper moves envelopes to `archived_signers` at about day 30 (`JpaSignedDocumentRegistry.kt:14`). The file-upload path does read the archive. D2 says archived envelopes "stay downloadable", so the same signed PDFs, after day 30, show "Firma no válida" by QR. The plan lists this in D7 as "file an issue, docs describe current behaviour" but no task or acceptance criterion makes `signing/verify-a-document` (or the QR caveats in `concepts/signature-and-seal`) say so. | Add an explicit task and acceptance criterion: the verify page states that a QR scan can report an invalid signature for envelopes archived after about 30 days and sends the reader to "Comprobar un archivo" (upload) instead; the claim is sourced in the fact sheet; a note to remove it when the bb-sign issue ships. File the issue before deploy and record its number. |
| 3 | HIGH | D4 is internally inconsistent. Settings shows an "Acuerdos" tab to anyone with `agreement:read`, which `org_member` and all four roles hold (`PermissionCatalog.kt:59,67,71`; `Settings.tsx:32-36`). Its intro says "La autorización de tratamiento de datos personales que aceptan los firmantes... Cada sobre conserva la versión vigente en el momento de enviarlo" (`es/settings.json` agreements.intro), which is false in production (`AGREEMENTS_PIN_AT_SEND=false`, `edge-api.yaml:64`). The plan adds `agreement:*` rows to the permission facts and docs (F4, F5, report 3 rows) but documents no feature behind them. An admin can publish a text believing signers accept it. "No admin/agreements page" leaves readers who meet the tab with nothing, and the docs permissions table with unexplained rows. | Keep "no agreements feature page" if desired, but add a short, sourced statement in `admin/permissions` and `reference/limits-and-defaults` (or a stub in `admin/`): the Acuerdos tab and organization identity exist; signers are not asked to accept agreement texts in production today; do not rely on them as consent. Describe `agreement:read`/`manage` rows with that qualifier. Keep NOT_SHIPPED "signer acceptance of agreement texts" and add a test that no page claims acceptance. |
| 4 | MEDIUM | "Files disjoint within a phase" is false. Sidebar entries live in one file, `src/config/products.ts` (`sidebar:` at line 85 and following), and `tests/unit/products.test.ts` fails if a sidebar slug has no page. Implementers A, B and C each add a new page (evidence-certificate, retention-and-restore, sign-in-security); Phase 1 adds two legal pages. Facts additions in Phase 2 ("add a fact... coordinated by the lead") also touch `sign.ts`, which Phase 1 owns. | Assign all sidebar edits (all five new slugs, both locales, final order) and all anticipated fact additions to Phase 1, or make `products.ts`/`sign.ts` lead-only with a merge order. Create the new page stubs in Phase 1 so `products.test.ts` is green between phases. |
| 5 | MEDIUM | D1's "live" claim rests on a runbook read dated 2026-10-16 (`documents-lifecycle-guard.md:8-17`), four days old, by a coordinator, not re-read by the auditors. I confirmed the runbook says exactly one 365-day expiration rule and no Glacier rule, and that H1 blocks a Glacier transition without the `bbsign-archivable` tag, so the conclusion is plausible. But report 3 rows 65 and 127 cite `bb-sign-aws.yml:439-443` as proof of "no Glacier"; that is the declared template (`aws/bb-sign-aws.yml:284-295`, STANDARD_IA 30 d and GLACIER 90 d), the opposite evidence. An implementer following those rows will cite the wrong file. The runbook also says restore (P2-P4) is "not live yet" while `edge-api.yaml:72-75` sets restore settings; D1's "can be restored on request" needs the P3 deployment state stated. | Cite the runbook with its date in the facts ("as of 2026-10-16"), re-run or ask for `get-bucket-lifecycle-configuration` before deploy, correct the two row citations, and word the retention pages conditionally (as D1 mostly does). State in the fact sheet that restore is deployed in v0.34.0 and idle. |
| 6 | MEDIUM | Deploy path. `automation/docs/image-policy.yaml` accepts `^main-(\d{8})T(\d{6})-[a-f0-9]+$` ordered numerically, so the plan's `main-<UTC yyyymmddThhmmss>-<sha>` tag is valid, and the README matches (Flux opens a PR; a human merges). Gaps: (a) the plan does not order push versus merge; an image pushed from the unmerged branch with a `main-` tag is picked up by the 5-minute ImageRepository scan and becomes a bump PR for content that is not on `main`; a later CI build after 2026-11-04 would also move the same timestamp order. (b) Acceptance criterion 8 ("deployed") depends on a human merging a bb-infrastructure PR; the plan says "Flux image automation or a bb-infrastructure PR" without choosing. (c) No mention of a GHCR write token, the `latest`/`<sha>` tags the pipeline normally pushes, or confirming the rollback tag `main-20261010T223716-8ef6ae3...` exists in GHCR. | Define the order: merge the docs PR (CLAUDE.md step 6), build from the merged `main` commit, tag with that commit's sha, push, then merge the Flux bump PR; list the required token; verify the rollback tag exists; split criterion 8 into "image pushed" and "bump merged and verified". |
| 7 | MEDIUM | OTP binding is overstated. Reports say "a code works only on the signing link it was requested from". `VerifyOtpUseCase.kt:56` compares `challenge.signerId != expectedSignerId`: the binding is to the signer, not the link. Equivalent only because one token is minted per signer. | Reword to "a code works only for the signer it was issued to"; do not add the link claim to the facts. |
| 8 | MEDIUM | D3 test spec for the English twin says "numbered clause headings match". The clauses are not headings; only `## 1.`, `## 2.`, `## 3.` and `## Historial` are. Clauses are bold paragraph markers (`**2.1**`...`**3.3**`), so a heading test would not catch an invented clause 3.4, the exact defect this change fixes. | Test that the sequence of `**N.N**` markers and `##` headings in the English page equals the Spanish source's, and that the English page contains the version line text. |
| 9 | LOW | D5 puts the evidence certificate at `concepts/evidence-certificate`; report 2 proposes `sending/evidence-certificate` (or a signing subsection) and there is already `concepts/evidence-and-audit`. | Decide one location, state why, and cross-link from sending/signing/verify pages. |
| 10 | LOW | Regenerating the OpenAPI reference renames/adds operations (e.g. `GET /verify` renamed to "Verify a signature seal"). Generated `/sign/api/**` pages are excluded from the link validator, so any hand-written deep link into them breaks silently. The plan does not check this, nor that `llms.txt` and the Pagefind index still build (the Pagefind empty-entry guard exists, commit 82e6829). | After the sync, grep the docs for `/sign/api/` deep links and compare against the regenerated routes; add that to Validation. |
| 11 | LOW | Dependency on bb-sign#276 is stated, but its merge state could not be confirmed here (`gh` failed). The #276 diff touches only the terms (Versión 4, 3 lines changed), the conservation guide and two e2e specs. | Record the bb-sign commit that contains #276 in the plan before the sync; if #276 merges after the sync, re-sync and re-hash. |
| 12 | INFO | Spot-check results (auditors right): F1/S2 chain embedded (`PdfSealer.kt:224-233`, whole chain in `JcaCertStore`); F3 eight webhook events (`WebhookEventType.kt`); F4/F5 `agreement:read` for all roles, `agreement:manage` admin-only (`PermissionCatalog.kt:59,67,71`); A3 contributors read the audit trail (`WorkspaceRoleBundles.kt:29-33`, AUDITOR set included in CONTRIBUTOR); audit read throttle 20/min (`InMemoryAuditReadThrottle.kt:22`); verify-file 10/min in prod (`edge-api.yaml:58`); archived envelope signer link serves the signed copy, no expiry check, live or archived (`GetSignedCopyUseCase.kt`, `SignedCopyGate.kt`); archived envelopes downloadable (`JpaSignedDocumentRegistry` reads archived rows); completion email 2 h (`application.yml:193` degraded-after PT2H; the email template carries the three certificate lines in `CompletionEmails.kt`); QR on archived envelopes fails (finding 2). Not accepted as written: OTP "bound to the link" (finding 7). Java rows 5.1/5.2/10.1 are consistent with the generated `TypeEnum`; the plan's D6 (compile the snippets) is the right control. | None. |

## Checklist

- [ ] Every acceptance criterion in the issue maps to at least one task (criterion 5 lacks a link-handling task; criterion 2 lacks the QR caveat)
- [x] No task exceeds the issue's scope
- [x] Research findings cite real `file:line`, and those lines say what the plan claims (exceptions: report 3 rows 65 and 127, finding 5; OTP "link", finding 7)
- [ ] Validation commands are runnable (the banner grep is fine; add link-resolution, version-equality and API deep-link checks)
- [x] Security-sensitive surfaces (auth, PII, uploads, quotas) called out and handled (CSP is unaffected by build-time Markdown; no new inline script)
- [ ] Rollback is described and plausible (the rollback tag is not verified; push/merge ordering missing)
- [ ] Phase split has no file conflicts (sidebar `products.ts` and `sign.ts`, finding 4)


---

## Round 2 — author's revision (2026-10-21)

Plan revised for H1 (D3 generator with three documented transforms, link map, TOC via generated content), H2 (D9 QR caveat), H3 (D4 one sourced inactive-for-signers sentence), M4 (all shared files, facts and stubs in Phase 1), M5 (live lifecycle re-read 2026-10-21T00:02Z, template rows re-sourced), M6 (Deploy ordering section), M7 (D10), M8 (bold clause numbers + headings + history test). LOW: commit recorded (Phase 1 step 0), /sign/api deep links checked (Phase 2 D). Evidence-certificate page stays under concepts/ (it serves senders and signers). Awaiting re-review.

## Verdict (round 2)

reviewed: 2026-10-20 (round 1 findings are kept above; the frontmatter status is now APPROVED)

APPROVED, with two MEDIUM plan-text corrections to make before Phase 1 starts (R2-1, R2-2). No CRITICAL or HIGH finding remains.
The round 1 HIGH items are resolved: H1 by the D3 generator, H2 by D9, H3 by D4. Checked against ground truth:

- **Link map is complete.** In the #276 worktree the three synced files contain exactly four Markdown links:
  `/guias/certificado-propio` and `/guias/conservacion-y-restauracion` (terms), and `/legal/terminos` (both guides). There are no raw
  `<a>` tags, reference-style links, anchors, images, relative `.md` links or absolute URLs. All three targets are in the D3 map, and
  "fail on any other app-relative target" is the right guard. The only braces are in a JSON code block, so `.md` output is safe.
- **The generator must run on the #276 content only.** On bb-sign `main` (df6a2a6) the terms line is
  `**Versión 3** · 2026-10-19 · **Pendiente de revisión jurídica.**` and both guides open with the banner. Transform (b) as a strict
  `^\*\*Versión N\*\* · date$` match fails there, which is correct. Keep it strict; the site-wide banner grep is the backstop.
- **Deploy ordering matches bb-infrastructure.** `automation/docs/image-policy.yaml` accepts `main-<8 digits>T<6 digits>-<hex>`; a full
  40-char merge sha matches and the timestamp is newer than the running `main-20261010T223716-8ef6ae37...`, which is the tag at
  `apps/docs/deployment.yaml:21`, so the rollback tag exists. `automation/docs/image-automation.yaml` pushes to `flux/docs-updates`
  (`chore(docs): bump image`) and `image-update-prs.yml` opens the PR. `auto-merge.yml` is limited to `flux/homepage-updates`, so the docs
  bump needs a human merge, as the plan says. Merging before building avoids Flux picking up an unmerged image.
- **D4, D9, D10, M4, M5.** D4 sentence placement (`admin/permissions` and the Settings overview in `admin/index`, both locales) covers where
  readers meet the tab. D9 puts the QR caveat on `verify-a-document` and the troubleshooting row, sourced to the live-signers-only lookup.
  D10 matches `VerifyOtpUseCase.kt:56`. Phase 1 step 5 now owns every shared file. The live lifecycle re-read is recorded in D1.

### Remaining findings

| # | Severity | Finding | Required change |
|---|---|---|---|
| R2-1 | MEDIUM | Phase 1 step 4 still describes the superseded design: "`legal/terms.mdx`... render the synced Markdown verbatim (a small component using the existing Markdown pipeline)". D5 and Risks also say "verbatim mirrors / rendering from synced files". An implementer following step 4 builds something other than D3. The existing `src/content/docs/sign/legal/terms.mdx` must be deleted, or a generated `terms.md` collides on the slug. | Rewrite step 4 to the D3 generator: the sync script generates `terms.md`, `own-certificate-guide.md`, `retention-guide.md`; delete `terms.mdx`; English twins stay `.mdx`. Align D5 and Risks wording. |
| R2-2 | MEDIUM | Where the version header renders is unspecified. A generated `.md` cannot import `LegalHeader.astro` (today `terms.mdx` imports it, and `legal.test.ts` asserts `<LegalHeader` in the page source). D3(b) says the version is "rendered once by `LegalHeader`" without saying how. Also the two guides carry no `**Versión N**` line (only the terms do), so transform (b) has nothing to extract for them and their `legalVersion` is undefined. | Choose one: generate `.mdx` with the `LegalHeader` import (the three files are MDX-safe today), or render the header from `legalVersion` in the `PageTitle` override. State what the guides show (no header, or the terms version) and make `legal.test.ts` assert exactly that, with no duplicate version on the terms page. |
| R2-3 | LOW | The English clause test must match markers like `**3.1 Plazo fijo.**` (number followed by a title inside the bold), not only `**N.N**`. | Match `^\*\*(\d+\.\d+)\b` per paragraph. |
| R2-4 | LOW | Deploy step 3 should name the branch and workflow (`flux/docs-updates`, "Image update PRs"); `image-automation.md` has no docs row. | Add them to the step. |
| R2-5 | LOW | Phase 3 step 7 files the D7 issues after the pages are written, but D9's caveat is removed "when the issue ships". | File the QR issue before deploy and cite its number in the D9 fact source. |

### Checklist (round 2)

- [x] Every acceptance criterion maps to a task (criterion 5 via the D3 generator; QR caveat via D9)
- [x] No task exceeds scope
- [x] Research findings cite real `file:line`; link map and deploy facts re-verified
- [x] Validation commands runnable (add link-resolution and version-equality checks per D3 tests)
- [x] Security-sensitive surfaces handled (no new inline script; build-time Markdown only)
- [x] Rollback plausible (tag verified at `apps/docs/deployment.yaml:21`)
- [x] Phase split free of shared-file conflicts after Phase 1 step 5
- [ ] Plan text consistent (R2-1, R2-2 to be fixed before Phase 1 starts)
