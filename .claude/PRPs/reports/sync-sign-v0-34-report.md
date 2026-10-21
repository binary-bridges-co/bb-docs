# Report: sync-sign-v0-34

Plan: `.claude/PRPs/plans/sync-sign-v0-34.plan.md` (review APPROVED, round 2). Gate checked before the first edit.

## Phase 1: foundation (2026-10-20)

### Source synced (step 0)

| | |
|---|---|
| bb-sign | `df6a2a6474e7cfcf192d9b3774b2c597336372de` (main, v0.34.0 + v0.34.1), commit date 2026-10-20 |
| plus | bb-sign#276 as **uncommitted** changes in worktree `remove-legal-review-banner` (terms Versión 4, both guides without the banner). `docs/api/*` there equal main byte for byte |
| manifest | `src/content/sync/sign/sign.json`: `ref: local:remove-legal-review-banner`, `uncommitted` lists the three legal files |
| bb-infrastructure | `5a8468f` (main) |
| live lifecycle | read by the lead 2026-10-21T00:02Z: one rule, Expiration 365 d, prefix "", no transitions |

Re-sync after #276 merges: `npm run sync:sign -- --from <clean bb-sign main worktree at the merge commit>`. The run is
deterministic (same commit, same bytes; checked by running it twice), and the `uncommitted` key disappears for a clean
checkout. The OpenAPI copy hashes to `40c05068…3dd19bdd6`, the value report 4 predicted; the vectors are unchanged.

### What changed

- **Fact sheet** `src/content/facts/sign.ts`: 88 facts before, 203 after, plus `ERROR_CODES` (14 codes),
  `AUDIT_EVENT_TYPES` (44) and 20 new `LIMITS` rows. Every report 1 §1a row (F1-F14), every §1b moved source,
  every §1c fact (N1-N40), and the fact rows of reports 2-4. New groups: `ADMIN_MFA`, `PERMISSION_SCOPE`,
  `AGREEMENTS` (D4), `ARCHIVED_ENVELOPES` (D2), `SIGNER`, `ERROR_CODES`, `RATE_LIMITS`, `VERIFY` (incl. the D9 QR
  defect), `EVIDENCE`, `AUDIT`, `RESTORE`. `RETENTION_IMPLEMENTED` rebuilt on the live read (D1); template values kept
  only as `*Declared`. `NOT_SHIPPED`: NS1-NS5 removed, "general API rate limits" and "signer acceptance of agreement
  texts (data-processing authorization)" added. Header re-dated. I re-read the sources of every new fact that
  carries a number in bb-sign main / bb-infrastructure main (yml, prod manifest, Retention, RestoreSettings,
  CertificateChainInspector, EvidenceCertificateController, throttles, AuditReadController, VerifySignatureSealUseCase,
  VerifyOtpUseCase, kc-init.sh, keycloak.yaml, RetryInterceptor, exception handlers, enums) and corrected the line
  numbers that differed from the reports.
- **Tests**: `facts.test.ts` (the five false assertions now assert the new truth; new tests for D1/D2/D4/D9/D10,
  error codes, units, emails, and that every `LIMITS` key has both labels in `LimitsTable.astro`);
  `content.test.ts` (six new `FACT_DENYLIST` literals; legal mirrors exempted, with a test that the exemption is
  exactly the mirrors); `legal.test.ts` (rewritten: header logic, clause/heading/history/code-block equality es vs en,
  the terms' Versión 4 clause list, banner absent from src/tests/scripts/CLAUDE.md/README and from every built page,
  the built header of each mirror); `sync.test.ts` (manifest shape, extras = registry, no legal downloads, byte
  equality of each generated page with the generator's output, transform rules incl. every refusal). A mutation
  check (invented clause 3.4 in English; a hand edit to the generated terms) fails the two intended tests.
- **Sync** `scripts/sync-product.mjs` + new `scripts/legal-mirror.mjs` (the D3 generator, imported by the script
  and the tests): the three legal files, rendered into `src/content/docs/sign/legal/{terms,own-certificate-guide,
  retention-guide}.md` before anything is moved into place. `src/config/products.ts` `sync.extra` lists them.
- **Legal rendering**: `legal: true` in the schema; `src/lib/legal.ts` decides the header; the `PageTitle` override
  renders `LegalHeader` (version, and the "Spanish prevails" note in English); `sign/legal/terms.mdx` deleted; English
  terms retranslated from Versión 4; English twins of both guides added.
- **Banner removal (D8)**: `LegalHeader.astro`, the Aside on both `electronic-vs-digital-signature.mdx`, CLAUDE.md §3,
  README (rule and Sync section), tests, the CSS comment. `grep -rniE "pendiente de revisi|pending legal review" src
  CLAUDE.md README.md tests scripts` finds nothing.
- **Stubs (D5)**: `concepts/evidence-certificate`, `sending/retention-and-restore`, `admin/sign-in-security` in both
  locales; all five new slugs in the sidebar.

### Results

- `npm run build`: 0 errors, 0 warnings, 143 pages, all internal links valid, CSP check passes.
- `npm run test:coverage`: 6 files, 71 tests pass; coverage 100 % lines, 92.3 % branches.
- Playwright not run (the lead runs it).

### Deviations from the plan

1. The manifest's `syncedAt` (wall clock) is replaced by `commitDate`, and a dirty `--from` checkout is recorded under
   `uncommitted`. Both make the sync deterministic and honest about its source.
2. The GENERATED notice is a YAML comment on the first frontmatter line, not an HTML comment: an HTML comment ends up
   in the built page.
3. A generated page's title is its H1 text (transform a keeps it as the frontmatter title).
4. `certificado-propio.md` §6 types an arrow ("Configuración → Certificado"). The generated Spanish mirrors are
   exempted from the typed-arrow test (verbatim). The English text says "Settings, Certificate", as §5 does. Worth a
   bb-sign fix at the source (D7 list).
5. The English translation drops the old "(*firma digital*)" gloss in 1.1, which the source does not have, and uses
   the app's English UI labels for quoted UI text ("Leaf only", "Request restore", "Request my copy", "No longer
   available from …", "Archived from …").
6. Key renames applied mechanically in pages Phase 2 owns, only so the build stays green (rendered text unchanged):
   `sealHashFormula` to `sealHashFormulaV1` (verify-a-document, evidence-and-audit); `RETENTION_IMPLEMENTED.
   documentsGlacierDays` to `RETENTION_POLICY.archiveAfterDays` (admin/storage, sending/download-signed-documents);
   `documentsGlacierDays`/`documentsStandardIaDays` to the `*Declared` keys (legal/retention). Those pages still state
   90-day archiving as current behaviour until Phase 2 rewrites them (D1); they keep an unused `RETENTION_IMPLEMENTED`
   import.
7. Until Phase 2 A updates `reference/emails.mdx`: the completion row shows the new trigger in English (no `TRIGGER`
   key) and the `document-restored` row has no recipient label (`requester` is new). `concepts/signature-and-seal`
   renders `chainEmbedded` ("full chain from the uploaded file") inline in English, as it did with "leaf only".
8. `NOT_SHIPPED` also gains "Postman collection" (report 1 NS13, "keep").
9. The built-HTML tests read `dist/`, so `npm test` alone needs `npm run build` first (CI and `npm run verify` already
   build first). The failure message says so.

### Open items for the lead

- `VERIFY_QR_ARCHIVED_ISSUE` is `'bb-sign#pending'`: fill in the issue number (R2-5); the test accepts a number.
- Re-sync from the merged main commit that contains #276; confirm `uncommitted` is gone and the generated pages are
  unchanged.
- Not added as a fact: Java `verifyDocumentFile(File)` being broken (report 4 §10.9 says "likely"; not verified).
  Phase 2 D should show Java verify-by-file over plain HTTP regardless.
- Not added: a test that no page claims signer acceptance of agreements (review round 1 finding 3 suggestion); a
  regex would be unreliable. The Phase 3 review should check it by reading.

## Facts completion (2026-10-20)

The Phase 2 writers reported facts missing from the sheet. Each was re-read in bb-sign `main` 114de38
(worktree `release-v0.34.2`) and bb-infrastructure `main` 5a8468f (`bb-infra-worktrees/audit-main`), then added
and wired into every page (es and en) that states it. One writer in the worktree; nothing committed.

### Fact sheet layout

`sign.ts` was at 797 lines. It is split thematically: `src/content/facts/fact.ts` (the `Fact` type and `fact()`
helper), `src/content/facts/sign-integrations.ts` (webhooks, delivery statuses, error codes, rate limits, SDKs; 172
lines) and `sign.ts` (768 lines), which re-exports the integrations module, so every page and component still imports
from `facts/sign`. A new test keeps every fact module at 800 lines or less.

### Facts added or corrected

| Fact | Value | Source |
|---|---|---|
| `DOCUMENTS.signedSha256Since` | `v0.29.0` | V036__lv211_seal_v2_signed_sha256.sql:3-5; StampSignedPdfUseCase.kt:101-104,155-156; first tag containing cf1af3a (#257) is v0.29.0 (GitHub release 2026-10-12); bb-infrastructure 375a475 (worker v0.29.0 in production 2026-10-16) |
| `VERIFY.qrUsesStoredFingerprintSince` | corrected `v0.34.0` to `v0.29.0` | VerifySignatureSealUseCase.kt:49-72; V036:18-23; StampSignedPdfUseCase.kt:61,194-208 (v2 default, no production override) |
| `DOCUMENTS.sealRefusedOnHashMismatch` | true | StampSignedPdfUseCase.kt:232-235, :168-176, :143-147 |
| `EVIDENCE.usuallyIssuedWithinMinutes` | true | docs/api/evidence-certificate.md:30; frontend es/signing.json:85 |
| `EVIDENCE.signerCopyIncludesAuditTrail` | false | evidence-certificate.md:90; worker evidence messages_es/en.properties:133 |
| `EVIDENCE.reissueWindowDays` | 30 | EvidenceReissue.kt:13-14,41; ReissueEvidenceCertificateUseCase.kt:49-51; evidence-certificate.md:122,129-130 (`reissueMax` re-sourced to EvidenceReissue.kt:15) |
| `CERTIFICATE.sealHashFormulaV2`, `documentSetFormula` | formula only, no prose | SealHashUtil.kt:95-120, :78-93 (wording of `<len>` and the ordering moved into each page) |
| `AUDIT.nightlyVerifyTime` + `nightlyVerifyTimeZone` | `03:30` + `America/Bogota` | NightlyChainVerificationJob.kt:81; not overridden in bb-infrastructure audit-service.yaml |
| `RESTORE.emailGenericWithoutConfirmedAccess` | true | RestoreNotifications.kt:23-25,92-101; RestoreEmails.kt:12-17 |
| `RESTORE.emailLinksToEnvelopeOrSigningPage` | true | RestoreNotifications.kt:23,26-27,100,114; RestoreEmails.kt:15-16,59 |
| `RESTORE.requestableAgainAfterWindow` | true | docs/guias/conservacion-y-restauracion.md:19; JdbcDocumentRestores.kt:79,158 |
| `SIGNER.fingerprintShownChars` | 8 | DocumentFingerprint.tsx:4-9,19 |
| `ADMIN_MFA.lostAuthenticatorResetBySupport`, `passwordResetClearsSecondFactor` | true, false | bb-infrastructure docs/runbooks/keycloak-hardening.md:157-160 |
| `ADMIN_MFA.enrolmentTitleEs` / `enrolmentTitleEn` | «Autenticación de dos factores» / "Two-factor authentication" | bb-infrastructure apps/platform/configs/keycloak/themes/bbsign/login/messages/messages_es.properties:14, messages_en.properties:13; login-config-totp.ftl:16; keycloak.yaml:91,103; kustomization.yaml:62-65 |
| `CERTIFICATE.expiryHighlightDays` | 30 | OrganizationCertificate.tsx:21,98,170-180 |
| `AUDIT.orgEventsPublished` | false | AuditReadController.kt:63-71; yml:398,403; docs/api/openapi.json has no `/api/v1/audit` path |
| `RETENTION_IMPLEMENTED.storageApplyWritesProduction` | true | LifecycleController.kt:14-15,107-117; BucketLifecycleService.kt:56-75,123-127; StorageLifecycle.tsx:19,35-36,99-118; bb-sign-aws.yml:435,476; documents-lifecycle-guard.md:174-176 |
| `AUTH.invitationActions` | UPDATE_PASSWORD, VERIFY_EMAIL, CONFIGURE_TOTP | UserController.kt:85-91,136,187-189; e2e 18-user-invitation.spec.ts:227-235; 58-admin-mfa-invitation.serial.spec.ts:38-52 |
| `SDK.javaVerifyFileSendsPath` | true | VerifyControllerApi.java:43-48; BbSignClient.java:316-317; bb-sign#281 (open, checked) |
| `SDK.errorCarriesStatusOnly` | true | BbSignException.java:3-34; BbSignClient.java:102-106; sdk-js errors.ts:14-23, index.ts:176-178,256-263 |
| `SDK.java.jsr310Dependency`, `SDK.java.jacksonVersion` | `com.fasterxml.jackson.datatype:jackson-datatype-jsr310`, `2.17.2` | sdk-java/pom.xml:53,78-87; BbSignClient.java:10,239-241 |
| `RATE_LIMITS.auditReadThrottledRoutes` | verification, export | AuditReadController.kt:88-95,120-131,146-151; AuditProxyController.kt:47-51,129-145 (`auditReadPerMinutePerCaller` and `AUDIT.readRatePerMinute` re-sourced to the same lines; `RATE_LIMITED` row narrowed to "audit chain verification and audit export") |

### Claims found false

1. **"Signed SHA-256 recorded since v0.34.0"** (Set A 1): false. The migration, the worker code and seal v2 shipped
   in v0.29.0 (cf1af3a, in production since 2026-10-16). The existing `VERIFY.qrUsesStoredFingerprintSince` said
   v0.34.0 and rendered on three page pairs (verify-a-document, own-certificate, evidence-and-audit); it now says v0.29.0, and the "recent/earlier versions" wording names the
   release through `DOCUMENTS.signedSha256Since` (verify-a-document, troubleshooting, archived-envelopes). No release
   fact for v0.34.0 was added: no page needs it.
2. **"Invitation order: email verification, password, then authenticator"** (Set C 5): not as stated. The invitation
   email carries UPDATE_PASSWORD, VERIFY_EMAIL (+ CONFIGURE_TOTP for admins); the E2E shows the password form first,
   and the link itself proves the email, so no separate verification step appears. No page states the three-step
   order; the pages say "set the password, then (admins) set up the authenticator", which matches.
3. **Completion email "normally a few minutes"** (Set B 3): the cited source is a code comment. Kept, but re-sourced:
   the email is sent when the certificate is issued (`EMAILS` row) and the certificate is normally issued within
   minutes (evidence-certificate.md:30), so the pages now say exactly that, through `EVIDENCE.usuallyIssuedWithinMinutes`.
4. **Re-issue window**: true, with a second condition the writers did not report: the envelope must not be archived.
   Pages say both.
5. **Organization-events endpoint** (Set C 3): exists but is not in the published OpenAPI. Not documented as an
   endpoint; the only mention (developers/authentication) says it stays reserved for people, which is true.
6. **Storage page "read-only"** (Set C 4): false for platform admins. The **Aplicar** button is live in production
   and rewrites the documents and evidence bucket lifecycle. admin/storage now says read-only for org admins and
   describes the platform-admin action.

All other reported claims were true at the cited lines (some line numbers corrected, as in the table).

### Pages touched (es and en, 20 pairs)

signing/verify-a-document, signing/troubleshooting, signing/receiving-the-email, signing/review-and-identity,
signing/sign-and-download, sending/retention-and-restore, sending/archived-envelopes, concepts/documents,
concepts/evidence-certificate, concepts/evidence-and-audit, admin/audit-trail, admin/sign-in-security,
admin/own-certificate, admin/storage, reference/emails, reference/glossary, developers/authentication,
developers/errors, sdks/java, sdks/javascript. Boolean facts are wired as conditional sentences
(`{FACT.value && ...}`), the pattern the pages already used; markdown inside those expressions is written as JSX.

### Tests and results

`tests/unit/facts.test.ts` gains nine tests: formulas and times language-neutral, seal v2 and signed hash from the
same release, evidence re-issue and signer copy, fingerprint length, restore emails, admin access facts, the audit
throttle scope, the SDK facts (incl. the #281 citation) and the 800-line cap per fact module.

- `npm run build`: 0 errors, 0 warnings, 0 hints, 143 pages, all internal links valid, CSP check passes.
- `npm test`: 6 files, 80 tests pass.
- Playwright not run.

## Rebase onto #5 (2026-10-21)

The branch was cut from 92077ba; main had since merged #5 "remove the limits and defaults page" (the
image live in production). Rebased onto 8ef6ae3 keeping #5's decision: the page (both locales), its
sidebar entry, `LimitsTable.astro`, the `LIMITS` facts and their tests stay removed; #5's inline retry
delays on the webhooks page are kept. The facts added for the limits rows remain where other pages use
them. Re-verified: build 141 pages, 79 unit tests, 194 Playwright tests; `sign` visual baselines regenerated.
