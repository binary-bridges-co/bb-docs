# Report: signers no longer get the evidence certificate; the new signature capture screen (bb-sign v0.37.1)

- **Plan:** `.claude/PRPs/plans/signer-evidence-docs.plan.md`
- **Review:** `.claude/PRPs/reviews/signer-evidence-docs.review.md`. Round 1 was REJECTED for one HIGH: the product
  landing page was missing from the plan. Round 2 was APPROVED with two LOW findings, and LOW 1 was applied.
- **Branch:** `docs/signer-evidence-docs`. Worktree `.claude/worktrees/signer-evidence-docs`, from `origin/main` 5df9221.
- **Date:** 2026-10-29

## Predicted vs actual

| | Predicted | Actual |
|---|---|---|
| Pages | 17 per locale, plus en `signature-and-seal` (36 with the landing page added in round 2) | The same 36 files |
| Sync | Only `openapi.json` (both copies) and `sign.json` change; legal pages unchanged | As predicted: −162 lines in each copy; ref `v0.37.1`, commit daa783ec |
| Visual baselines | `sign-*`, `signing-*`, maybe `api-*` | Only `signing-*` (8) changed. `sign-*` and `api-*` stayed under the 1% threshold |

## Tasks

| Task | Status |
|---|---|
| T1 sync | `PRODUCT_REPO_TOKEN=$(gh auth token) npm run sync:sign -- v0.37.1`. Both signer paths and both `SignerEvidence*` schemas are gone. `cmp` shows the src and public copies are identical. The API reference has 25 operation pages, none for signer evidence |
| T2 facts | Every row of the plan's citation table is applied. `variants`, `signerCopyMasked` and `signerCopyIncludesAuditTrail` are removed. `signersReceiveCertificate` (false) and `signerDownloadsUntil` (`v0.37.0`) are added |
| T3 fact test | Updated |
| T4 concepts | `evidence-certificate` has a "Quién lo descarga" / "Who downloads it" section. `evidence-and-audit` rewrites the access event (D2) and line 229 |
| T5 signer guide | `sign-and-download` (capture step, recorded data, confirmation, email, availability), `index`, `receiving-the-email`, `troubleshooting`, `review-and-identity`, en `signature-and-seal` |
| T6 other pages | `download-signed-documents`, `archived-envelopes`, `first-envelope`, `developers/index`, `migrating-from-adobe`, `electronic-vs-digital-signature`, `legal/retention`, `glossary`, `emails`, landing `index` |
| T7 verify | See below |

## Deviations

1. `getting-started/first-envelope`: the sentence I edited said the signer "draws or types" their signature. It now
   says "draws, types or uploads", which has been true since v0.37.0. This is one word per locale.
2. V4's four capture-label patterns moved to a case-sensitive V4c. V4 is case-insensitive, so it also matched the
   corrected "Add your signature". In V5, `o un firmante descarga su copia` is anchored with `\b` because it matched
   "códig**o Un firmante descarga su copia** firmada", which is the correct `SIGNED_COPY_ACCESSED` row. Both changes
   are recorded in the plan.
3. The signer sentence on the certificate page sits inline in the paragraph, behind
   `EVIDENCE.signersReceiveCertificate`. A block-level MDX expression would render without a `<p>`.

## Verified

| Check | Result |
|---|---|
| V1 sync | ref `v0.37.1`, commit daa783ec. No `/api/v1/sign/*evidence` path. No `SignerEvidence*` schema. The two copies are identical |
| V4, V4b, V4c source sweeps (paragraph-joined) | no output |
| V5 `dist/` sweep, tags stripped, only the 3 generated mirrors excluded | no output. No signer evidence operation pages |
| `npm run build` | `astro check` 0 errors (one pre-existing hint: `WEBHOOKS` unused in `sign.ts:44`, not touched here). Links valid. CSP passes |
| `npm run test:coverage` | 81/81, coverage thresholds met |
| `npm run test:e2e` | 194/194 on Chromium, Firefox and WebKit, after updating the 8 `signing-*` baselines. The diff was step 6 losing the certificate button and the lines below moving up |
| 375 px, light and dark | `sign-and-download` and `evidence-certificate` (es, en): no horizontal overflow, read correctly |
| `npm run verify` | green before commit |

## Not done here

No merge and no deploy: the parent session does both after merging.
