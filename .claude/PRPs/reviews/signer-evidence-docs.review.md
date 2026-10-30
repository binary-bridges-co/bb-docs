---
plan: .claude/PRPs/plans/signer-evidence-docs.plan.md
issue: bb-sign#310, bb-sign#311 (release v0.37.1)
status: APPROVED
reviewer: general-purpose (independent reviewer subagent)
reviewed: 2026-10-29
---

## Verdict (round 1)

REJECTED, for one HIGH finding. The plan's product research holds up. Every #310 and #311 claim I checked
against bb-sign `origin/main` e1519854, `v0.37.0` and `v0.37.1` says what the plan says, and so does every
re-pointed fact citation. D2, D3 and D5 are accurate. The sweep is incomplete, though. The product landing page
`sign/index.mdx` and its English twin still say that "the organization and each signer can download" the evidence
certificate. The plan's table does not list either page, and its V4 grep cannot catch them because the phrase
wraps across lines. Two smaller problems sit around that gap. The validation sweeps (V4, V5) cannot return clean
as written: V4 matches correct sentences on several pages, and V5 excludes the in-scope legal pages. And T7 does
not name the visual baselines that will change. Fix finding 1, tighten V4 and V5, and re-review.

## Findings (round 1)

| # | Severity | Finding | Required change |
|---|---|---|---|
| 1 | HIGH | **Missed stale page.** `src/content/docs/sign/index.mdx:33-36`: "se entrega como un [certificado de evidencia] en PDF, que la organización y cada firmante pueden descargar." `src/content/docs/en/sign/index.mdx:34-38`: "...that the organization and each signer can download." This is the bb-sign product landing page (`audience: all`), and it tells signers they get the certificate. It is not in the plan's "places that are now wrong" table or in T6. V4's `cada firmante pueden descargar` / `each signer can download` does not match it because both locales break the line between `cada`/`each` and `firmante`/`signer`. Found with a paragraph-joined sweep of `src/content/docs` (both locales). Apart from the 17 listed pages, no other page claims a signer certificate. | Add `index.mdx` (es, en) to T6 with the same fix as `legal/retention.mdx:26-27` ("que la organización descarga" / "that the organization downloads", or equivalent). This page is also the `sign` visual baseline (`tests/e2e/visual.spec.ts:11`), so add `sign-*` to T7 (see #3). |
| 2 | MEDIUM | **V4 and V5 cannot come back clean.** On the current tree, V4 matches correct lines that the plan does not change: `sign/admin/audit-trail.mdx:96` ("emite su certificado de evidencia", the envelope's), `sign/reference/emails.mdx:30` (org trigger), `sign/sending/archived-envelopes.mdx:53` (member downloads), `sign/sending/retention-and-restore.mdx:64` and `:130` ("## La copia del firmante", the signed copy), and `sign/legal/retention.mdx:251` (Aside "La copia del firmante", the signed copy). So "expect no hit outside the legal mirrors" never holds. V4 is also line-based and misses wrapped phrases (finding 1). V5 runs `grep -v '/legal/'`, which also hides `legal/retention` and `legal/electronic-vs-digital-signature`, both edited by T6. V5 also lacks the phrases that only `dist/` (unwrapped HTML) can catch: `cada firmante pueden descargar`, `each signer can download`, `para cada firmante`, `one for each signer`, `propia copia`, `their own copy`, `certificado del firmante`, `signer.s certificate`, `Preparando tu certificado`, `Preparing your evidence`. | Drop the bare `copia del firmante` and `su certificado de evidencia` from V4, or keep them and list the six allowed hits above. Add a paragraph-joined pass, for example `perl -0777 -ne 'while(/cada\s+firmante\s+pueden\s+descargar\|each\s+signer\s+can\s+download/gi){print "$ARGV\n"}' $(git ls-files 'src/content/docs/*.md*')`. In V5, exclude only the three generated mirrors and their twins (`/legal/terms/`, `/legal/own-certificate-guide/`, `/legal/retention-guide/`), not every `/legal/` page, and use V4's full phrase list. |
| 3 | LOW | **Visual baselines are not named.** `tests/e2e/visual.spec.ts:9-14` takes full-page screenshots of `/`, `/sign/`, `/sign/signing/` and `/sign/api/operations/createenvelope/`. T5 changes `/sign/signing/` (step 5 labels, step 6). Finding 1 changes `/sign/`. The sync removes 2 of the 10 `signing-controller` operations from the API sidebar (`jq` on `src/content/sync/sign/openapi.json`), which can change the `api-*` shots too, although no page text there changes. | In T7, name `signing-*` and `sign-*` as the expected updates, and `api-*` if the sidebar diff shows. Look at each diff image before accepting it. |
| 4 | LOW | **R3 cites one line short.** `edge-api/.../domain/evidence/EvidenceCertificate.kt` on main: the comment is at `:14-17` and `enum class EvidenceVariant { ORGANIZATION }` is at `:18`. The plan cites `:13-17` in R3 and in the `EVIDENCE.variants` row. The fact is being removed, so nothing ships with this line number. | Cite `:14-18` in R3 and in the report. |
| 5 | LOW | **T5 `review-and-identity.mdx:35-36` rewording.** The planned "printed on ... evidence kept by the organization" still invites the signer to compare their fingerprint later against a document they cannot reach. That is the kind of path D1 says bb-docs should not offer. | Drop the "Puede compararla después…" / "You can compare it later…" sentence in both locales, or state only that the fingerprint is recorded in the envelope's evidence, with no invitation to compare. `verify-a-document.mdx:38-39` (`audience: all`, "del sobre") can stay as planned. |
| 6 | LOW | **D5 fallback writes into bb-sign.** A `git worktree add` in bb-sign adds worktree metadata to bb-sign's `.git`, and the brief makes bb-sign read only. The primary route is fine: `scripts/sync-product.mjs:6-10,74-84` takes a ref plus `PRODUCT_REPO_TOKEN`, the README's sync section shows the same form, and bb-docs#8 synced at `v0.37.0` (current `sign.json` has `ref: v0.37.0`). `git diff --name-only v0.37.1 origin/main` in bb-sign lists only `.claude/` paths, so the tag and main give the same synced bytes. | Fallback: `git clone --branch v0.37.1 /Users/edward.montoya/code/binarybridges/bb-sign <scratch dir>` and `--from <scratch dir>`, then delete the clone. bb-sign stays untouched. |
| 7 | LOW | **Numbers and versions through facts.** D4/AC4 say to copy labels from `signing.json`. `uploadHint` "PNG o JPEG, de hasta 10 MB." must keep `<Fact of={SIGNATURE_UPLOAD.maxSourceMb} unit="MB" />`: `tests/unit/content.test.ts` FACT_DENYLIST has `/\b10\s*MB\b/`, and CLAUDE.md §3 forbids typed numbers. AC3 says "completed before v0.37.1" but the new fact is `signerDownloadsUntil: 'v0.37.0'`. | Word the D2 sentence around the fact ("hasta la versión {signerDownloadsUntil}" / "up to version ...") so no version is typed in prose. Use the same wording in both locales. |

### What I checked and found correct

- **#310 research, against bb-sign origin/main.**
  - R1 `docs/api/evidence-certificate.md:8-15` checks out.
  - R2 and R4 `GetEvidenceCertificateUseCase.kt:26-28,30-35,57-62,74-76` check out.
  - R5 `SignedCopyGate.kt:5-11` checks out.
  - R10 `EvidenceCertificateController.kt:37-45` checks out.
  - R12 `messages_{es,en}.properties:5` reads "Copia de la organización" / "Organization copy".
- **R6, against v0.37.0.**
  - `SigningController.kt:333-362` has `getSignerEvidenceCertificate` and `downloadSignerEvidenceCertificate`.
  - `GetEvidenceCertificateUseCase.kt:39-40,78-85` is the signer download.
  - `SignerEvidenceDownload.tsx` was added in #269, so it is in v0.34.0.
- **R7.** The `done.evidence*` keys are removed in both locales. `SignerEvidenceDownload` is removed from `SigningCeremony.tsx`.
- **R8 and R9.**
  - The email template (`envelope-completed.html:43-58`) keeps only the `documentsInPreparation` line and the "Download your signed copy" button.
  - In `CompletionEmails.kt` and `EnvelopeCompletionNoticeListener.kt`, the certificate lines are gone.
  - `application.yml:192-193` sets `PT2H`, clamped to 24 h.
- **R11.** `jq` diff of `docs/api/openapi.json` v0.37.0 to v0.37.1: removing the two paths and the two `SignerEvidence*` schemas leaves the files identical. Nothing else changed.
- **D2 is accurate.** At v0.37.0, `signerDownload` published with `actor = null` and `signerId`. The audit listener at v0.37.0 (`EvidenceAccessAuditListener.kt:75`) files `ActorRef.signer(...)`, so the audit row really names a signer. bb-infrastructure history: edge-api v0.34.0 went live 2026-10-19 (0e76503), FrontendVersion v0.34.0–v0.34.2 on 2026-10-19/20, and 4a5333e on 2026-10-29 moved them to v0.37.1. Signer downloads were live in production in between.
- **D3 is accurate.** The diff of the listener and `CompletionEmails` changes only which lines the email carries. Triggers, dedupe and owner logic are unchanged.
- **D1.** It agrees with the owner's rule. `SignedCopyGate.kt:7` and the use case doc say "for organization members".
- **Production.** bb-infrastructure `origin/main` 38d2910: `edge-api.yaml:29` and `notification-service.yaml:26` run v0.37.1, and `aws/params.json:2` has `FrontendVersion v0.37.1`. The worker still runs v0.37.0. It builds the internal signer variant, which nothing serves, so it stays out of scope.
- **#311 label table.** Every es/en key and value matches `signing.json` lines 76-107 on main. The component ranges check out:
  - `SignatureUpload.tsx:28,31-39,101-110,112-131,133-156,165-181,184-207,209-211,216-225`
  - `signatureUpload.ts:401-404,449-451,453-461`
  - `DrawSignaturePanel.tsx`, `TypedSignaturePanel.tsx` and `SignModeTabs.tsx` at the cited ranges
  - Old EN strings: "Add Your Signature" and "Submit Signature" appear in `en/sign/signing/{index,sign-and-download,troubleshooting}.mdx` and `en/sign/concepts/signature-and-seal.mdx:20`, all covered by T5. "A photo or scan…" appears only in sign-and-download.
- **Fact citations.** Every row of the plan's table checks out on main:
  - `SigningCeremony.tsx:419-432,465-466`; es `signing.json:26,94,106`; `evidence-certificate.md:32,117-119`; `GetEvidenceCertificateUseCase.kt:26-27`; `reference.md:662`; `SigningController.kt:277-290,519-529,531-537,521,525`.
  - Independent check: I grepped `src/content/facts/*.ts` for every file in `git diff --name-only v0.37.0 v0.37.1`. Only one cite in a changed file is missing from the table: `sign.ts:270` → `GetSignedCopyUseCase.kt:27-53`. Those lines did not change (the diff in that file is at about `:103`), so it still holds.
  - The `openapi.json` cites at `sign.ts:407,572` carry no line numbers and still hold (`verifyDocumentFile` is present, there is no `/api/v1/audit` path).
  - `sdk-java/CHANGELOG.md` "Unreleased" (`sign-integrations.ts:207`) still has the enum-tolerance entry.
- **Legal mirrors.** `legal/{terms,own-certificate-guide,retention-guide}` (es and en) contain no signer-certificate claim. `terms.md:38` gives the signer only the restore of their signed copy. No bb-sign issue is needed.
- **Scope.** No task documents the worker's signer copy or `signerCopySha256`. Both locales are covered for every listed page. The `tests/unit/facts.test.ts:272-277` assertion named in T3 is correct.

## Verdict (round 2)

APPROVED. All seven round-1 findings are fixed, and I checked each fix against the files rather than the
revision log. Finding 1: the landing `index.mdx` is now in the research table (es 33-36, en 34-38) and in T6, with
a one-sentence fix that is the same in both locales. Finding 2: I ran the rewritten V4 and V4b myself on the
unchanged tree. V4 finds 75 bad sentences on exactly 35 files: the 17 pages in the table in each locale, plus
`en/sign/concepts/signature-and-seal.mdx`. That includes the wrapped landing-page sentence V4 used to miss. I read
every hit, and none is a correct sentence. The six correct lines that broke round 1's V4 (`audit-trail:96`,
`emails:30`, `archived-envelopes:53`, `retention-and-restore:64,130`, `legal/retention:251`) no longer match. V4b
covers the eight signer pages that still say "su/your certificate". I ran V5's `find | perl` pipeline on HTML
files I made by hand in a scratch folder (no build). It found a sentence split across lines inside `<em>`,
`&#39;` and `&rsquo;` apostrophes, and a bold label. It skipped `/sign/legal/terms/` and a correct
signed-copy sentence. `PAT` also matches nothing in the v0.37.1 OpenAPI text that will become the API reference
pages. The other fixes are in place: R3 and the `variants` row cite `:14-18`; T7 names `sign-*`, `signing-*`,
`api-*` (if the sidebar changes) and says `hub-*` must not change; T5 drops the "compare it later" sentence; D5's
fallback clones the tag into a scratch folder, and the sync script's `REF_PATTERN` (`scripts/sync-product.mjs:40`)
accepts `v0.37.1`; AC3 and D2 are worded around `<Fact of={EVIDENCE.signerDownloadsUntil} />`; D4 keeps
`uploadHint`'s 10 MB as a fact. The revisions broke nothing I could find. One small gap remains in the sweep
(below): it does not block, because the tasks already name those lines.

## Findings (round 2)

| # | Severity | Finding | Required change |
|---|---|---|---|
| 1 | LOW | **V4 and V4b miss four stale sentences that the tasks do fix.** On the unchanged tree, no V4/V4b pattern matches these: `concepts/evidence-certificate.mdx:68-69` "sale de todos modos e indica que se está preparando, en el mismo enlace" / en "says it is being prepared, at the same link" (T4, D3: the email no longer says this); `signing/sign-and-download.mdx:72-73` "La copia del certificado que usted descarga enmascara…" / en "The copy of the certificate you download masks…" (T5); `signing/sign-and-download.mdx:101-102` "la página no ofrece certificado" / en "the page offers no certificate" (T5); `signing/receiving-the-email.mdx:29` second sentence "y a su certificado." / en "and your certificate." (V4b only catches the first sentence of that row). T4 and T5 cover all four, so a correct implementation removes them, but a clean V4 would not prove it. | Add to `PAT`: `indica que se está preparando\|says it is being prepared\|copia del certificado que usted descarga\|copy of the certificate you download\|no ofrece certificado\|offers no certificate`. Add to V4b (signer pages only, because "your certificate" is correct on admin pages): `y a su certificado\|and your certificate`. |
| 2 | LOW | **One V4 pattern can only ever hit the source.** `Desde el enlace del firmante\.\*\*` / `From the signer\S{1,6}s link\.\*\*` match the `**` around a bold label. In `dist/` the bold becomes `<strong>`, and V5 replaces tags with spaces, so the pattern never matches built HTML. In my snippet test V5 still reported that line, but only inside another pattern's 40-character context. V4 covers it in the source, so nothing is lost. | None required. If wanted, a V5-only variant without `\*\*` would cover the built page as well. |

Note for the implementer: `perl` runs on bytes and the 40-byte context can cut a UTF-8 character in half. Piping
V4/V5 output into `cut`, `sort` or `uniq` under a UTF-8 locale then fails with "Illegal byte sequence". Use
`LC_ALL=C` for any post-processing, or just read the raw output (the goal is no output).

## Checklist

- [x] Every acceptance criterion maps to at least one task (round 2: `sign/index.mdx` es/en added to T6)
- [x] No task exceeds the scope
- [x] Research findings cite real `file:line`, and those lines say what the plan claims (round 2: R3 fixed to `:14-18`)
- [x] Validation commands are runnable (round 2: V4/V4b run on the unchanged tree and hit only the 35 table pages; V5's perl tested on hand-made HTML; minor gaps in round-2 finding 1)
- [x] Security-sensitive surfaces called out and handled (no removed signer route or internal signer copy is documented; the sync drops both operations from the API reference)
- [x] Rollback is described and plausible
