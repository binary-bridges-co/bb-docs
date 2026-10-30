# Report: signing-order docs (bb-sign v0.38.0)

- **Plan:** `.claude/PRPs/plans/signing-order-docs.plan.md` (Revision 2)
- **Review:** `.claude/PRPs/reviews/signing-order-docs.review.md`. Round 1 REJECTED (3 HIGH), round 2 APPROVED
  (1 MEDIUM, 3 LOW, all applied during implementation)
- **Branch:** `docs/signing-order-docs` from `origin/main` 0caa45b
- **Source:** bb-sign tag `v0.38.0` = `4c39ee7c` (PR #314: #293, #128, #129)

## Predicted vs actual

| | Predicted | Actual |
|---|---|---|
| Content files | about 22 | 22 (11 pages x 2 locales) |
| Fact modules | 2 + 1 new | `sign.ts` (citations, header, re-export), `sign-integrations.ts` (`VALIDATION_FAILED`), new `sign-signing-order.ts` (`WIZARD`, `SIGNING_ORDER`) |
| Sync diff | 2 descriptions + manifest | as predicted, plus the tracked `public/sync/sign/openapi.json` (review finding 8) |
| Visual baselines | maybe the API page | unchanged: all 32 visual tests passed on the existing baselines |

## Tasks

| Task | Status |
|---|---|
| 1 Sync at v0.38.0 | Done. `sign.json` ref v0.38.0, commit 4c39ee7c; openapi.json in `src/content/sync/sign` and `public/sync/sign` gains the two `signOrder` descriptions; legal texts and webhook vectors identical |
| 2 Facts | Done. 5 drifted citations re-pointed (EnvelopeController.kt 369, 673-687 x2, 291-304; EnvelopeDetail.tsx 171/176-180, 77-80); 18 new facts with v0.38.0 sources; 2 new tests |
| 3 signers-and-order | Rewritten in both locales |
| 4 create-an-envelope | Sentence after the signing-order table. No LinkCard change (Rev2-1) |
| 5 first-envelope | Step order (intro, numbered steps), Signers step, review summary in display order, "only the first one" |
| 6 envelopes-and-signers | Positions only for sequential; groups API-only |
| 7 send-and-track | Signers (N) row |
| 8 documents (sending + concepts) | `{{signerN}}` = place in the list; "third step" |
| 9 glossary | Sign order entry |
| 10 walkthrough | signOrder rule, messages as today's wording, SDK status-only |
| 11 migrating-from-adobe | Bullet extended as in bb-sign `migrating-from-adobe.md:121` |
| 12 errors | `VALIDATION_FAILED` row (via `ERROR_CODES` + `codeHelp` both locales); 400 row names the code |

## Deviations

- None from Revision 2. The round-2 notes were applied: the leftover checks include the step-order and marker
  phrases; check 3 written out (below); the "created at send" fact cites `CreateEnvelope.tsx:336-353`; the reorder
  note mentions the draft restore at `:148`; `ErrorCodes.kt` has its full path; the thresholds are named
  `...FromCards` and the pages say "tarjetas"/"cards"; `dragByPointerAndKeyboard` is test-only.
- Link text for the walkthrough uses its real title ("De la credencial al documento firmado" / "From credential to
  signed document").

## Verification

| Check | Result |
|---|---|
| `npm run verify` | passed: build (astro check 0 errors, links, CSP), 83 unit tests, 194 Playwright (smoke, i18n, search, axe light+dark, visual) |
| Source leftovers (check 1, extended) | no match (exit 1) |
| Built site leftovers (check 2, tags stripped) | 0 |
| Exact app strings in built site (check 3) | orderHint, parallelNote, dragUnavailable: 1 page each per locale; modeParallelHint: 2 pages per locale |
| 375 px, light and dark | no horizontal overflow on signers-and-order (ES/EN), walkthrough, errors, first-envelope; signers-and-order inspected by eye |

Check 2/3 script: `scratchpad/distcheck.cjs` (strips scripts, styles and tags, collapses whitespace, skips `/api/`
and `/legal/` for leftovers).

## Production state (read-only, 2026-10-29)

- bb-infrastructure `origin/main` runs edge-api `v0.38.0` (`apps/bb-sign/edge-api.yaml:29`).
- The live frontend bundle (`https://sign.binarybridges.co/assets/index-6fAt46K7.js`) contains the v0.38.0
  Signers-step strings, so the new wizard is live.

## Follow-ups (not filed)

- Navigation: the sidebar and next-step cards still run Documents before Signers, while the wizard asks for the
  signers first since v0.35.0 (review round 1, finding 1).
- `sending/documents.mdx` still says that without a marker the seals go to the bottom right of the last page; since
  v0.35.0 the sender can also draw the seal boxes. Not changed here.
- `src/content/facts/sign.ts:48` imports `WEBHOOKS` without using it (astro check warning, already on main).
