# Plan: the signing error codes on the developer errors page (bb-sign v0.37.0)

## Summary

bb-sign v0.37.0 (bb-sign#298, #292; release tag commit 1ef08008, live in production since 2026-10-29)
added six `code` values to `POST /api/v1/sign/{token}/sign` and made two existing ones reachable from
it. The signer guide already explains the messages a signer sees (bb-docs#8). The developer page
`/sign/developers/errors/` (es) and `/en/sign/developers/errors/` (en) does not: its status table and its
"Códigos frecuentes" / "Common codes" table stop at the v0.34 set, and the rate-limit paragraph says
the only limits are verify by file and the audit reads. This plan brings that page, its facts and the
fact test up to v0.37.0.

## User story

As an integrator calling the bb-sign API, or building my own signing page on
`POST /api/v1/sign/{token}/sign`, I want every `code` that call can return listed with its status,
cause and fix, so that my code reacts to `SIGNING_BUSY` (retry in a second) differently from
`RATE_LIMITED` (wait minutes) and from `SIGNATURE_IMAGE_INVALID` (fix the image).

## Metadata

- Complexity: small (two facts modules, one test, one page in two locales)
- Source: owner request 2026-10-29 ("update bb-docs"), follow-up from bb-sign#298/#292 report
- Product source read: bb-sign `main` 4ec7d3f0 (= v0.37.0 code; 1ef08008 + plan archive only);
  bb-infrastructure `main` (production runs edge-api v0.37.0, infra #133)
- Branch: `docs/sign-signing-error-codes`; worktree `.claude/worktrees/sign-signing-error-codes`
- Dependencies: none. bb-docs#8 (the signer pages and the OpenAPI sync at v0.37.0) is merged.

## Acceptance criteria

1. `ERROR_CODES` lists `SIGNATURE_IMAGE_INVALID` 400, `SIGNATURE_IMAGE_TOO_LARGE` 400,
   `SIGNATURE_METHOD_INVALID` 400, `SIGNATURE_UPLOAD_TIMEOUT` 408, `OTP_VERIFICATION_EXPIRED` 409 and
   `SIGNING_BUSY` 503, each with a `file:line` source.
2. `RATE_LIMITED` and `PAYLOAD_TOO_LARGE` name the sign call too, with sources.
3. The new limits are facts, not prose: sign requests per minute per client, image refusals per link and
   their window, the request body cap, the request deadline and the PNG cap.
4. Both locales of the errors page: the status table rows 400, 408, 409, 413 and 503 mention the sign
   cases; the "quota or rate limit" list names the sign limits; the codes table renders the new rows with
   a cause **and** a fix (CLAUDE.md §3); the 429/503 difference is stated.
5. `tests/unit/facts.test.ts` accepts status 400 and asserts the six codes exist.
6. `npm run verify` green; both themes and 375px checked on the changed page.

## Out of scope

- The signer-facing pages (done in bb-docs#8).
- The OpenAPI copy: `src/content/sync/sign/openapi.json` already equals bb-sign `docs/api/openapi.json`
  except the server URL the sync rewrites (checked with `jq -S` diff).
- bb-sign follow-ups (security L3, spec 69 flake): product work, not documentation.
- Any limit not in production: the compose values (`APP_SIGN_RATE_PER_MINUTE=1000` etc.) are local only.

## Research findings (bb-sign 4ec7d3f0)

| # | Claim | Source |
|---|---|---|
| R1 | The six image/body refusals map to 400 `SIGNATURE_IMAGE_INVALID`, 400 `SIGNATURE_IMAGE_TOO_LARGE`, 413 `PAYLOAD_TOO_LARGE` (`Connection: close`), 408 `SIGNATURE_UPLOAD_TIMEOUT` (`Connection: close`), 429 `RATE_LIMITED` (`Retry-After`), 503 `SIGNING_BUSY` (`Retry-After: 1`) | `EA/presentation/SigningImageExceptionHandler.kt:27-34,44-72,84-88` |
| R2 | 400 `SIGNATURE_METHOD_INVALID` when `signatureMethod` is not DRAWN, TYPED or UPLOADED_IMAGE; 409 `OTP_VERIFICATION_EXPIRED` when the code was verified more than 15 minutes ago | `EA/presentation/SigningExceptionHandler.kt:22-24,30-36,49-50`; `EA/domain/signature/SigningErrors.kt:9-17`; `EA/domain/signature/SigningEligibility.kt:72,103` |
| R3 | Every refusal leaves the link unused; the PNG rules (1 MiB, 8192 x 4096, 8-bit, no interlace, no animation) and the 1.5 MiB body are in the published contract | `EA/presentation/signer/SigningController.kt:584-602` |
| R4 | Production limits are the `application.yml` defaults: 30 sign requests a minute per client key (IPv4 or IPv6 /64), 5 image refusals per link per 10 minutes, body 1,572,864 bytes, deadline 30 s, PNG 1,048,576 bytes, 2 s wait for an inspection permit then 503 | `bb-sign/edge-api/src/main/resources/application.yml:242,245,247,250,251,259`; `bb-infrastructure/apps/bb-sign/edge-api.yaml` sets no `APP_SIGN_*` / `SIGNATURE_IMAGE_*` variable (grep: only `APP_SIGNING_VIEW_DEDUP_WINDOW_SECONDS`, line 54) |
| R5 | 429 per link counts image refusals only | `EA/infrastructure/ratelimit/InMemorySignatureImageThrottle.kt:23,43`; `EA/domain/signature/SignatureImageErrors.kt:42-44` |
| R6 | The OTP validity is already a fact: `OTP.verifiedValidityMinutes` = 15 | `bb-docs/src/content/facts/sign.ts:285-288` |
| R7 | The codes table renders `ERROR_CODES` with per-locale `codeHelp`; a code without `codeHelp` falls back to the English `where` | `src/content/docs/sign/developers/errors.mdx:12-27,80-95` (same in `en/`) |
| R8 | The fact test restricts statuses to `[408, 409, 410, 413, 429, 503]` | `tests/unit/facts.test.ts:205-214` |
| R9 | The JS SDK generates `SigningControllerApi`, so an SDK user can reach the call | `bb-sign/sdk-js/src/generated/apis/SigningControllerApi.ts` |

## Tasks

1. **Facts, `src/content/facts/sign-integrations.ts`.**
   - `RATE_LIMITS`: add `signPerMinutePerClient` (30), `signImageRefusalsPerLink` (5),
     `signImageRefusalWindowMinutes` (10), sources R4/R5.
   - `ERROR_CODES`: add the six codes (AC1) with sources R1/R2; widen `RATE_LIMITED` and
     `PAYLOAD_TOO_LARGE` `where`/`source` to the sign call (AC2).
2. **Facts, `src/content/facts/sign.ts`.** In `SIGNATURE_UPLOAD`, add `serverMaxPngMb` (1, i.e. 1 MiB),
   `signRequestMaxBodyMb` (1.5, i.e. 1,572,864 bytes), `signRequestMaxSeconds` (30), sources R3/R4.
   Update the header line that dates the v0.37.0 reads. The file stays under 800 lines.
3. **Test, `tests/unit/facts.test.ts`.** Allow 400; assert the six codes; assert
   `SIGNATURE_UPLOAD.signRequestMaxBodyMb > serverMaxPngMb` (the body must hold the image as base64) and
   `signImageRefusalsPerLink < signPerMinutePerClient`.
4. **Page, `src/content/docs/sign/developers/errors.mdx` and `en/…/errors.mdx`, key for key.**
   - Status table: 400 (image or `signatureMethod` refused), 408 (the sign body arrived too slowly,
     `<Fact signRequestMaxSeconds>`), 409 (the identity check expired, `<Fact OTP.verifiedValidityMinutes>`),
     413 (sign body above `<Fact signRequestMaxBodyMb>`), 503 (`SIGNING_BUSY`: retry after about a second).
   - "Cuota o límite de tasa": add the sign limits (per client per minute; image refusals per link per
     window). Keep "no general rate limit". Add one sentence: a 503 `SIGNING_BUSY` is not a rate limit,
     retry after `Retry-After` (1 s).
   - `codeHelp`: rows for the six codes; widen `RATE_LIMITED` and `PAYLOAD_TOO_LARGE`. Every row says
     what happened and what to do; every sign refusal says the link stays unused.
   - Import the new facts; no number typed in prose.
5. **Verify.** `npm run verify`; open the page in both themes at 375px.
6. **Report** `.claude/PRPs/reports/sign-signing-error-codes-report.md`.

## Validation

```bash
cd .claude/worktrees/sign-signing-error-codes
npm ci
npx vitest run tests/unit/facts.test.ts     # AC1, AC2, AC3, AC5
npm run verify                              # AC6: build (types, links, CSP), unit + coverage, Playwright
grep -c "SIGNING_BUSY" src/content/docs/sign/developers/errors.mdx src/content/docs/en/sign/developers/errors.mdx  # AC4, both > 0
```

## Risks and rollback

- **A wrong number.** Every value is a fact with a source line; the test checks the relations. Production
  has no override of these variables today (R4); if bb-infrastructure adds one later, the fact source names
  the line to re-read.
- **Over-promising SDK behaviour.** The SDKs retry a 503 with their own backoff and ignore `Retry-After`
  (existing fact `SDK.honoursRetryAfter`); the page must not say the SDK waits one second.
- **Rollback.** Revert the squash commit and redeploy the previous docs image (bb-infrastructure
  `apps/docs` tag before this change).

## Revision 2 (review round 1, REJECTED: 3 HIGH, 5 MEDIUM, 2 LOW)

This section supersedes the Research rows, Tasks and test relations above wherever they differ.

| Finding | Change |
|---|---|
| 1 HIGH: second `RATE_LIMITED` cause | New fact `RATE_LIMITS.signInFlightPerClient` = 2 (`application.yml:243`; `EA/infrastructure/ratelimit/InMemorySignRequestThrottle.kt:94-97,137`). The page names three causes of the sign 429 (requests per minute, uploads at once, image attempts per link) and says only "wait the `Retry-After` seconds", never "minutes". |
| 2 HIGH: 408 not always delivered | The 408 row and the `SIGNATURE_UPLOAD_TIMEOUT` row say the code comes back when the upload is too slow; a client that stops sending entirely gets a bare 408 from the server, or an empty 401, with no `ErrorResponse`. Source `EA/infrastructure/web/SignRequestBodyLimitFilter.kt:53-56`. Fix in both cases: retry the whole request. |
| 3 HIGH: "link unused" not sourced for every code | No blanket claim. "The link stays unused" is stated only for the codes the contract says it for (`SigningController.kt:584-602`: the five image/body codes and `SIGNATURE_METHOD_INVALID`); `OTP_VERIFICATION_EXPIRED` cites `EA/domain/signature/SigningEligibility.kt:72,103` and says "verify again, then sign"; `SIGNING_BUSY` and `RATE_LIMITED` only "retry after `Retry-After`". |
| 4 MEDIUM: per-link count | Fact renamed `signImageAttemptsPerLink`, documented as "image attempts that were refused or are still being checked" (`InMemorySignatureImageThrottle.kt:21-24,81-105`). |
| 5 MEDIUM: per task | Every sign limit source adds `prod:18 (replicas: 1; limits are per task, application.yml:240)`. The page says "per client" without a cluster-wide promise; the fact comment says to re-read when replicas change. |
| 6 MEDIUM: units | Facts `serverMaxPngMib` (1), `signRequestMaxBodyMib` (1.5), rendered with `unit="MiB"`; bytes in the source. If `Fact` cannot take `MiB`, the page writes the unit after a unitless `<Fact>`. |
| 7 MEDIUM: three 503 causes | `SIGNING_BUSY` reads "bb-sign is at capacity for signatures right now"; sources `InMemorySignatureImageThrottle.kt:107-114`, `SignRequestBodyLimitFilter.kt:124,130,136`, `InMemorySignRequestThrottle.kt:86`. The wait for an inspection is not a fact on the page. |
| 8 MEDIUM: SDK | R9 is context only. No SDK text for the sign call; nothing implies an SDK waits `Retry-After`. |
| 9 LOW: invented relation | Test: drop `attempts < perMinute`; assert `signRequestMaxBodyMib * 1024 * 1024 >= ceil(serverMaxPngMib * 1024 * 1024 / 3) * 4 + 64 * 1024` (the rule in `application.yml:248-249`). |
| 10 LOW: append, not replace | Rows 400, 408, 409, 413, 503 keep their current text and gain the sign case. The "no general rate limit" sentence becomes "Outside the calls named here, the API applies no rate limit". |

Note: the local `bb-infrastructure` checkout is stale; production facts are read from `origin/main`
(`apps/bb-sign/edge-api.yaml:18` replicas 1, `:29` image v0.37.0; no `APP_SIGN_*`/`SIGNATURE_IMAGE_*` variable in `apps/bb-sign/`).
