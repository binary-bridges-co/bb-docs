# Report: the signing error codes on the developer errors page

Plan: `.claude/PRPs/plans/sign-signing-error-codes.plan.md` (Revision 2). Review: APPROVED in round 2
(`.claude/PRPs/reviews/sign-signing-error-codes.review.md`). Product read at bb-sign 4ec7d3f0 (v0.37.0) and
bb-infrastructure origin/main.

## Predicted vs actual

| Predicted | Actual |
|---|---|
| Two fact modules, one test, one page in two locales | Same, plus a re-check of every `sign.ts` citation into files v0.37.0 changed (see Deviations) |
| Six new codes, two widened | Six new codes, `RATE_LIMITED` and `PAYLOAD_TOO_LARGE` widened |

## Tasks

1. `sign-integrations.ts`: six `ERROR_CODES` rows; `RATE_LIMITED` and `PAYLOAD_TOO_LARGE` name the sign call;
   `RATE_LIMITS.signPerMinutePerClient`, `signInFlightPerClient`, `signImageAttemptsPerLink`,
   `signImageAttemptsWindowMinutes` (each cites `prod:18`, replicas 1); new group `SIGN_REQUEST`
   (`maxPngMib`, `maxBodyMib`, `minBodyBytesForPng`, `busyRetryAfterSeconds`, `maxSeconds`), placed here and
   not in `SIGNATURE_UPLOAD` (review R2-2). `prod` shorthand defined in the header.
2. `sign.ts`: header records the 2026-10-29 re-read.
3. `facts.test.ts`: status 400 allowed; new test for the six codes, the exact body-cap rule
   (prefix + base64 + 64 KiB = 1,463,662, review R2-1) and the replicas line on each per-task limit (R2-3).
4. Both `errors.mdx`: rows 400, 408, 409, 413, 503 appended; the rate-limit list names the three sign limits;
   "outside the calls named here, no rate limit"; a paragraph on 503 `SIGNING_BUSY` versus 429; `codeHelp`
   for the six codes; every number is a `<Fact>`.

## Deviations

- **Citation drift from v0.37.0, fixed.** bb-sign v0.37.0 inserted 26 lines at `application.yml:239`; every
  `application.yml` / `yml` citation after line 238 in both fact files moved by 26 (16 fact lines, values
  unchanged). A read-only agent re-checked the `sign.ts` citations into the other files v0.37.0 changed:
  26 line references corrected (EnvelopeController, RecordSignatureUseCase, GetSignerAccessUseCase,
  EnvelopeDetail.tsx, StampSignedPdfUseCase, CreateEnvelopeUseCase, SigningController, envelopes.json,
  signing.json); `DOCUMENTS.changedWhileReviewingRefused` now cites `SigningEligibility.kt` where the check
  moved. One value updated: `SIGNER.recordedWithSignature` now includes the signature method (audit-service
  `SignerSignedListener.kt:44-45`, evidence `messages_es.properties:40-43`); no page renders that fact.
- "Requests", not "signatures": the per-minute limit counts sign requests.

## Verification

- `npm run verify`: build, 81 unit tests (6 files), 194 Playwright tests, all green (run after the last edit).
- Rendered text of every changed row and paragraph read in both locales at 1280px; no horizontal page
  overflow at 375px in light and dark, es and en (the codes table scrolls inside its own container, as before).
