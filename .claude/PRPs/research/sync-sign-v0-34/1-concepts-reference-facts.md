# Docs audit 1: fact sheet, not-shipped lists, concepts and reference pages

What was compared:
- bb-docs worktree `sync-sign-v0-34` (HEAD 92077ba), whose fact sheet was verified against bb-sign d1badc5.
- bb-sign main `df6a2a6` (v0.34.0 + v0.34.1).
- bb-infrastructure main `5a8468f`. Production runs bb-sign v0.34.0 images (`apps/bb-sign/edge-api.yaml:29`) and frontend v0.34.1.

Path prefixes:
- `S/` = bb-sign main
- `I/` = bb-infrastructure main
- `EA` = `S/edge-api/src/main/kotlin/co/binarybridges/sign/edge`
- `W` = `S/document-processing-worker/src/main/kotlin/co/binarybridges/sign/documentprocessing`
- `NS` = `S/notification-service/src/main/kotlin/co/binarybridges/sign/notification`
- `yml` = `S/edge-api/src/main/resources/application.yml`
- `loc` = `S/frontend/src/i18n/locales`
- Docs paths are under `src/content/docs/`. "es" is `sign/...` and "en" is `en/sign/...`.

Severity:
- **WRONG**: false today.
- **OUTDATED**: true but incomplete, or the source line moved.
- **MISSING**: a shipped feature or value the page does not state.

**Production caveat that affects most retention rows.** The live S3 lifecycle on the documents bucket is not what `aws/bb-sign-aws.yml` declares.
- Live rules: exactly one, `bbsign-expiration-production-bbsign-documents`, Expiration 365 days, prefix "".
- No IA rule and no Glacier rule are live.
- Proof: `I/docs/runbooks/documents-lifecycle-guard.md:8-17`.
- So in production no file is ever archived, and restore is deployed but idle until bb-sign#214 P5.

---

## 1. `src/content/facts/sign.ts`, fact by fact

### 1a. Values that are now wrong

| # | fact (sign.ts line) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| F1 | `CERTIFICATE.chainEmbedded` (:254) | `'leaf only'`, PdfDigitalSignatureService.kt:154 | The leaf signs, and every certificate of the PKCS#12 chain is added to the CMS. | `W/application/service/PdfSealer.kt:224-233` (`JcaCertStore(cert.certificateChain…)`, `gen.addCertificates(store)`) | value `'full chain from the uploaded file'`, source PdfSealer.kt:225-232. Update the test `facts.test.ts:98-99`. | WRONG |
| F2 | `CERTIFICATE.sealHashFormula` (:256) | v1 formula only | v2 is the default for new seals: `SHA-256("bbsign-seal-v2" + "\n<len>:<field>"…)` over name, email, signedAt (ISO, seconds), envelopeId, certFingerprint and documentSetSha256. v1 remains for old seals. | `S/platform/contracts/src/main/kotlin/co/binarybridges/sign/platform/crypto/SealHashUtil.kt:12,40` (v1), `:82-93` (document set), `:100-120` (v2); `W/application/usecase/StampSignedPdfUseCase.kt:61,194-208` | Keep `sealHashFormulaV1`. Add `sealHashFormulaV2` and `documentSetFormula` (`SHA-256(join("\n", "<docId>:<originalSha256>" sorted by id))`). | WRONG |
| F3 | `WEBHOOK_EVENTS` (:187-194) and type `WebhookEventType` | 6 events | 8 events: adds `envelope.evidence_issued` and `document.restored` | `EA/domain/webhook/WebhookEventType.kt:4-6,25-41`; `EA/domain/webhook/WebhookEvent.kt:54-58` | Add both. Update the test `facts.test.ts:65` (`toHaveLength(8)`). | WRONG |
| F4 | `ORG_PERMISSIONS` (:63-73) | 9 keys | 11 keys: adds `agreement:manage` (platform_admin, org_admin) and `agreement:read` (all four roles) | `EA/domain/security/PermissionCatalog.kt:53-71`; `S/infrastructure/configs/keycloak/permission-catalog.txt:25-26` | Add both rows. Source moves to PermissionCatalog.kt:53-71. | WRONG |
| F5 | `ORG_API_NEVER` (:90-96) | 5 keys | 6 keys: adds `agreement:manage` | `PermissionCatalog.kt:82-90` | Add it. Source moves to :82-90. | WRONG |
| F6 | `RETENTION_IMPLEMENTED.documentsStandardIaDays` (:271) | 30, from yml template :284-290 | The template declares it (:286-290), but it is not live in production | `I/docs/runbooks/documents-lifecycle-guard.md:8-17` | Rename to `documentsStandardIaDaysDeclared`, or set the live value `'none live'`. Pages must not say "today". | WRONG |
| F7 | `RETENTION_IMPLEMENTED.documentsGlacierDays` (:272) | 90 | No Glacier rule is live. The declared rule is blocked by a CI guard. | same runbook :8-22, :102-104 | value `'none live (planned: 90 d, tag-filtered, bb-sign#214 P5)'`. Update the test `facts.test.ts:56`, which asserts it equals the policy. | WRONG |
| F8 | `RETENTION_IMPLEMENTED.documentsExpirationRule` (:273) | `'none'` | Live: Expiration 365 days on the whole bucket | runbook :11-12; `I/docs/runbooks/lv-retention-restore-iam.md:56` | value `365` (days, live). Update the test `facts.test.ts:57`. | WRONG |
| F9 | `RETENTION_IMPLEMENTED.evidenceBucketWriter` (:275) | `'none yet'` | (a) The worker writes the evidence certificate, the signer copy and the audit trail under `envelopes/<org>/<envelope>/`, GOVERNANCE lock for 365 days. (b) edge-api writes agreement copies to `agreements/{copyId}.md`, GOVERNANCE lock for 10 years (seeding is off in production). | `W/application/evidence/IssueEvidenceCertificateUseCase.kt:155`; `EA/agreement/application/AgreementPublishUseCase.kt:185,194`; IAM `I/aws/bb-sign-aws.yml:480-528`; `I/apps/bb-sign/edge-api.yaml:64,68` | value `'evidence certificates (365 d GOVERNANCE lock)'` | WRONG |
| F10 | `RETENTION_IMPLEMENTED.restoreOnRequest` (:278) | `false`, "#214 unmerged" | Merged and deployed (v0.34.0): sender and signer endpoints, poller, email, webhook. In production it is idle because nothing reaches Glacier. | `EA/presentation/admin/EnvelopeController.kt:577-591`; `EA/presentation/signer/SigningController.kt:261-274`; `I/apps/bb-sign/edge-api.yaml:72-75`; runbook lv-retention-restore-iam.md:21 | value `'implemented; idle until Glacier is enabled (#214 P5)'`. Update the test `facts.test.ts:58-59`. | WRONG |
| F11 | `RETENTION_IMPLEMENTED.nonProdLifecycleDefaultDays` (:274) | 365, yml:161-165 | The yml keys were removed (`yml:211-214`). The value is `Retention.DAYS`, expiration only (no IA or Glacier transitions locally). | `EA/infrastructure/storage/LifecycleInitializer.kt:40,46-47` | Source moves to LifecycleInitializer.kt:46-47 + Retention.kt:33-34. Drop the "IA 30 / Glacier 90 non-prod" wording. | OUTDATED |
| F12 | `RETENTION_POLICY.*` (:262-267) | sourced from the unmerged "LV contract" | Now code constants. `Retention.DAYS=365` and `ARCHIVE_AFTER_DAYS=90` (only for files tagged archivable: signed PDFs, and originals of COMPLETED envelopes; evidence never). Restore days 7 (allowed range 1-30). | `S/platform/contracts/src/main/kotlin/co/binarybridges/sign/platform/retention/Retention.kt:33-34,36-37,70-80`; `yml:265`; `EA/application/service/RestoreSettings.kt:15,33` | Re-source all four. `configurable:false` is backed by the Retention.kt object (no property). | OUTDATED |
| F13 | `NOT_SHIPPED` (:352-376) | includes evidence certificate PDF or export, rate limits, restore on request, certificate expiry emails, full certificate chain | All five are on main (see section 2) | see section 2 | Remove or narrow (section 2) | WRONG |
| F14 | header comment (:6-10) | "Verified on 2026-10-07 against d1badc5" | — | — | Re-date to df6a2a6 / bb-infrastructure 5a8468f | OUTDATED |

### 1b. Values unchanged, source `file:line` moved

| # | fact | old source | new source on main |
|---|---|---|---|
| L1 | `URLS.senderAddress` / `identitySenderAddress` | aws yml:13-45 | `I/aws/bb-sign-aws.yml:37,42` (Defaults) |
| L2 | `URLS.openapiPath` | yml:292 | Not in the yml. `/v3/api-docs` is the springdoc default. Block at `yml:402-409`; comment `yml:382-388`. Note that `paths-to-match` (`yml:403`) now also publishes `/api/v1/agreement-copies/**`. |
| L3 | `AUTH.tokenLifetimeSeconds` 300 | md §2; realm | `I/apps/platform/configs/keycloak/bbsign-realm.json:4`; `I/apps/platform/configs/keycloak/kc-init.sh:531` |
| L4 | `AUTH.maxCredentialsPerOrg` 10 / `revokedCredentialListedDays` 90 | KeycloakApiCredentialAdapter.kt:47 / :48 | `EA/infrastructure/keycloak/KeycloakApiCredentialAdapter.kt:49` / `:50` |
| L5 | `AUTH.invitationLinkHours` 72 | yml:149 | `yml:172` |
| L6 | `AUTH.maxWorkspaceMembershipsPerPrincipal` 50 | yml:119-120 | `yml:143` |
| L7 | `ENVELOPE_TRANSITIONS` sources | Send :36,71; RecordSig :112-176; EnvelopeController :528-531; Expire :40-50 | `EA/application/usecase/SendEnvelopeUseCase.kt:40,77`; `RecordSignatureUseCase.kt:154,169-172,240-243`; **`CancelEnvelopeUseCase.kt:31,39`** (new file, CANCELLABLE = DRAFT, SENT, IN_PROGRESS); `ExpireEnvelopesUseCase.kt:38-43` |
| L8 | `ENVELOPE.linkTtlHoursDefault` 72 | EnvelopeEntity.kt:31; EnvelopeController.kt:107 | EnvelopeEntity.kt:31 (unchanged); `EnvelopeController.kt:124` |
| L9 | `ENVELOPE.expirySweepMinutes` 5 | yml:166-169 | `yml:215-218` |
| L10 | `ENVELOPE.downloadUrlSeconds` 3600 | RecordSig :193; GetSignerAccess :65 | `RecordSignatureUseCase.kt:265`; `GetSignerAccessUseCase.kt:68` (now version-pinned: `doc.originalVersionId`) |
| L11 | `ENVELOPE.archiveAfterDays` 30 | yml:156-160; ArchiveEnvelopesUseCase.kt:32-38 | `yml:205`; `EA/application/archive/ArchiveEligibility.kt:63-68` (STATUS_AND_AGE) |
| L12 | `ENVELOPE.archiveCron` 02:00 UTC | yml:160 | `yml:210` |
| L13 | `ENVELOPE.viewDedupSeconds` 30 | yml:170-174 | `yml:219-223`; production sets it explicitly at `I/apps/bb-sign/edge-api.yaml:54` |
| L14 | `ENVELOPE.listCountCap` 10000 | en/envelopes.json list.countCapped | The value lives at `EA/infrastructure/persistence/repository/EnvelopeFilterRepository.kt:41` (`COUNT_CAP = 10_000`); the label is at `loc/en/envelopes.json:52` |
| L15 | `OTP.digits` 6 | GenerateOtpUseCase.kt:30 | `S/auth-challenge-service/src/main/kotlin/co/binarybridges/sign/authchallenge/application/usecase/GenerateOtpUseCase.kt:54` |
| L16 | `OTP.validitySeconds` / `validityMinutes` | auth-challenge yml:45 | `S/auth-challenge-service/src/main/resources/application.yml:52` |
| L17 | `OTP.maxAttempts` 3 | V002 | `S/auth-challenge-service/src/main/resources/db/migration/V002__create_otp_schema.sql:10` |
| L18 | `OTP.resendCooldownSeconds` 60 | yml:180 | `yml:229` |
| L19 | `OTP.verifiedValidityMinutes` 15 | RecordSignatureUseCase.kt:42 | `RecordSignatureUseCase.kt:55` |
| L20 | `OTP.channel` email | templates | `NS/infrastructure/delivery/EmailOtpCodeDeliveryChannel.kt:25`. Note: V003 adds a `channel` column whose CHECK allows 'SMS' (`…/V003__lv209_otp_code_hmac.sql:7,14`), but no SMS sender exists. |
| L21 | `DOCUMENTS.maxUnassignedPerOrgMb` 500 / `unassignedRetentionHours` 24 | yml:186 / :187 | `yml:244` / `yml:245` |
| L22 | `DOCUMENTS.contentType`, `maxUploadMb`, `placementMarker` | — | unchanged: UploadUnassignedDocumentUseCase.kt:59; yml:64-65; PdfPlaceholderLocator.kt:76 |
| L23 | `LABELS.*` | V009; SetEnvelopeLabelsUseCase.kt:40-44 | unchanged: `V009__key_value_labels.sql:13,15`; SetEnvelopeLabelsUseCase.kt:44 |
| L24 | `REMINDERS.*` | notification yml:66-68 | `S/notification-service/src/main/resources/application.yml:78` (cron), `:79` (48 h), `:80` (24 h) |
| L25 | `QUOTA.warningThresholdPct`, `periodTypes` | V019 | `V019__create_org_quotas.sql:11`, `:6` (values unchanged) |
| L26 | `QUOTA.httpStatusWhenExhausted` 429 | QuotaEnforcementService.kt | No 429 literal there; the 429 table is at `EA/application/usecase/CreateEnvelopeUseCase.kt:58-62`. Caveat: 429 is no longer quota-only (see N10). |
| L27 | `WEBHOOKS.retryLadder`, jitter, disable, probe, log retention | WebhookDispatchProperties.kt:20-35 | `EA/infrastructure/webhook/WebhookDispatchProperties.kt:30` (ladder), `:31` (0.2), `:32` (3), `:33` (6h), `:34` (90d) |
| L28 | `WEBHOOKS.maxPerOrg` 20 / `secretRotationGraceHours` 24 | yml:249 / :250 | `yml:357` / `yml:358` |
| L29 | `WEBHOOKS.retryLadderHoursApprox` 15 | webhooks.md "Delivery behaviour" | `S/docs/api/webhooks.md:197` |
| L30 | `WEBHOOKS` headers, tolerance, vectors | spec §1, §4; vectors | unchanged: `S/docs/api/webhook-signature-spec.md:17-19,79`; vectors file `cases: 16` |
| L31 | `CERTIFICATE.defaultSubject` / `defaultKeyBits` / `defaultValidityYears` | GlobalCertificateBootstrap.kt:51 / :50 / :53 | `EA/infrastructure/config/GlobalCertificateBootstrap.kt:50` / `:49` / `:52` |
| L32 | `CERTIFICATE.defaultDisplayName` / `defaultReason` | CertificateResolverService.kt:18 / :19 | `W/application/service/CertificateResolverService.kt:16` / `:17` |
| L33 | `CERTIFICATE.cacheMinutes` 5 | Resolver :51 | `CertificateResolverService.kt:53-54` |
| L34 | `CERTIFICATE.allowedExtensions` / `maxFileMb` | Upload :28 / :29 | `EA/application/usecase/UploadOrgCertificateUseCase.kt:38` / `:39` |
| L35 | `CERTIFICATE.minKeyBits` / `requiredKeyUsage` | Upload :133 / :136 | `UploadOrgCertificateUseCase.kt:214` / `:218` |
| L36 | `CERTIFICATE.signatureSubFilter` / `signatureAlgorithm` | PdfDigitalSignatureService.kt:46 / :157 | `W/application/service/PdfSealer.kt:65` (adbe.pkcs7.detached; also :238) / `:229-230` (SHA256withRSA). PdfDigitalSignatureService now only delegates to PdfSealer (:43-44). |
| L37 | `CERTIFICATE.pemCanSign` false | Resolver :153-155 | `W/application/service/Pkcs12KeyEntryReader.kt:28-31`. Upload still accepts `.pem` with no warning (`UploadOrgCertificateUseCase.kt:38,82`). |
| L38 | `RETENTION_IMPLEMENTED.backupsRetentionDays` 30 | aws yml:361-367 | `I/aws/bb-sign-aws.yml:363-365` (plus noncurrent versions deleted after 7 days at :366) |
| L39 | `RETENTION_IMPLEMENTED.auditEventsPurge` none | no purge job | Still none. Append-only triggers now make a purge impossible without a migration (`S/audit-service/src/main/resources/db/migration/V006__lv212_audit_append_only.sql:11-17`). |
| L40 | `EMAILS[*].source` | "templates" or old files | `signing-invitation`: `NS/infrastructure/messaging/listener/EnvelopeCreatedListener.kt:35`; "It's your turn": `SignerEligibleListener.kt:37`; `otp-delivery`: `NS/infrastructure/delivery/EmailOtpCodeDeliveryChannel.kt:25`; `reminder`: `NS/application/service/ReminderSchedulerService.kt:79`; `envelope-completed`: **`NS/application/service/CompletionEmails.kt:64`** (moved out of the listener); `envelope-expired`: `EnvelopeExpiredListener.kt:28`; `webhook-disabled`: `WebhookSubscriptionDisabledListener.kt:56`; Keycloak: `S/infrastructure/configs/keycloak/themes/bbsign/email/html/{executeActions,password-reset,email-verification}.ftl` |
| L41 | `SDK.*` | sdk package.json / pom | unchanged: `S/sdk-js/package.json:2,3,10,18`; `S/sdk-java/pom.xml:21,22,24,36` |
| L42 | `WORKSPACE_PERMISSIONS` | WorkspaceRoleBundles.kt:29-33 | unchanged: `EA/domain/security/WorkspaceRoleBundles.kt:29-33`. No new workspace permission. Evidence uses `document:download`; export and chain verification use `audit:read`. |
| L43 | `ENVELOPE_STATUSES`, `SIGNER_STATUSES`, `DELIVERY_STATUSES` | — | unchanged. Delivery statuses at `S/edge-api/src/main/resources/db/migration/V028__webhook_delivery.sql:82`. |

### 1c. New facts the new features need

| # | proposed fact | value | source |
|---|---|---|---|
| N1 | `CERTIFICATE.expiryNoticeDays` | `[30, 7]` | `yml:184`; `EA/domain/certificate/ExpiryNoticePolicy.kt:9-13`; terms clause 2.4 noted at `yml:181-182` |
| N2 | `CERTIFICATE.expiryCheckTime` | 13:07 UTC daily | `yml:187`; `EA/infrastructure/scheduling/CertificateExpiryScheduler.kt:20-21` |
| N3 | `CERTIFICATE.expiryNoticeScope` | the org's own active certificate only (never the default), to users with `org_admin`, one email per admin per threshold | `EA/infrastructure/persistence/JdbcCertificateExpiryNotices.kt:46`; `EA/presentation/admin/InternalEnvelopeController.kt:38-44`; `NS/application/service/CertificateExpiryEmails.kt:16-20` |
| N4 | `CERTIFICATE.chainStatuses` | `COMPLETE, NO_ROOT, LEAF_ONLY, SELF_SIGNED` (UI also shows `UNCHECKED` for older uploads) | `EA/domain/certificate/ChainStatus.kt:4-16`; `loc/en/organizations.json:104-131` |
| N5 | `CERTIFICATE.uploadWarnings` | `CHAIN_LEAF_ONLY, CHAIN_NO_ROOT, CHAIN_SELF_SIGNED, UNRELATED_CERTIFICATES` (upload accepted with warnings) | `ChainStatus.kt:19-26`; `UploadOrgCertificateUseCase.kt:144-147` |
| N6 | `CERTIFICATE.uploadRefusals` | expired or not yet valid anywhere in the chain; broken or misordered chain; issuer not a CA; more than 10 certificates; non-RSA key; key not matching the leaf; zero or several keys | `EA/domain/certificate/CertificateChainInspector.kt:22-52,68-83,108`; `UploadOrgCertificateUseCase.kt:163-169` |
| N7 | `CERTIFICATE.maxChainLength` | 10 | `CertificateChainInspector.kt` (agent cite :22-52; confirm the constant line when editing) |
| N8 | `CERTIFICATE.rsaOnly` | true ("Only RSA keys are supported.") | `loc/en/organizations.json` fileHint; CertificateChainInspector.kt |
| N9 | `CERTIFICATE.testingNoticeSendingBlocked` | false (notice: "Sending is not blocked…") | `loc/en/organizations.json:94-97`; `loc/es/organizations.json:94-97`; `SendEnvelopeUseCase.kt:40-51` (no certificate check) |
| N10 | `VERIFY.file` | `POST /api/v1/verify/file`, public, raw body; 10 per minute per client IP; 4 in flight in total; 30 s per request; 50 MB; hash only, not stored; matches **signed** PDFs only | `yml:235-238`; `I/apps/bb-sign/edge-api.yaml:58-61`; `EA/presentation/verify/VerifyController.kt:98,116-151`; `EA/application/usecase/VerifyDocumentFileUseCase.kt:34-45` |
| N11 | `VERIFY.qrUsesStoredFingerprint` | true for seals made since v0.34.0; older seals fall back to the active certificate | `EA/application/usecase/VerifySignatureSealUseCase.kt:49-72` |
| N12 | `DOCUMENTS.originalSha256` | SHA-256 computed while the upload streams; S3 version pinned; send refused with `DOCUMENT_HASH_MISSING` if any document lacks one | `EA/application/usecase/UploadUnassignedDocumentUseCase.kt:111-113`; `S/edge-api/src/main/resources/db/migration/V035__lv211_original_sha256.sql:13-26`; `SendEnvelopeUseCase.kt:50-51`; `loc/en/common.json` DOCUMENT_HASH_MISSING |
| N13 | `DOCUMENTS.signedSha256` | SHA-256 of each sealed PDF (in the audit trail and in webhooks; the envelope page line never renders, a bug) | `V036__lv211_seal_v2_signed_sha256.sql:9-27`; `StampSignedPdfUseCase.kt:239`; `EA/domain/webhook/WebhookEvent.kt:178-181`; bug: `EnvelopeController.kt:216-229` omits signedSha256 |
| N14 | `OTP.storage` | stored as an HMAC plus an encrypted hand-off, never as plaintext | `GenerateOtpUseCase.kt:63-64`; `V003__lv209_otp_code_hmac.sql:1-23` |
| N15 | `SIGNER.authMethods` | `EMAIL_LINK`, `EMAIL_LINK_OTP` | `S/edge-api/src/main/resources/db/migration/V039__lv209_signer_auth_method.sql:2-15`; `SignerAuthMethod.kt:11-16`; `RecordSignatureUseCase.kt:160-162` |
| N16 | `EVIDENCE.certificate` | sealed PDF issued after completion. Organization copy, plus a signer copy with emails masked and no IP, user agent or OTP destination. Stored with a frozen `audit-trail.json`. Statuses `ISSUED, PENDING, FAILED, UNAVAILABLE, EXPIRED`. | `EA/domain/evidence/EvidenceCertificate.kt:12`; `S/docs/api/evidence-certificate.md:3-33`; `S/document-processing-worker/src/main/resources/evidence/messages_en.properties:4-131` |
| N17 | `EVIDENCE.languages` | `es` (default), `en`; set per organization by the platform admin; fixed at issue | `OrgLanguage.kt:16-22`; `EA/presentation/admin/OrganizationController.kt:117-126`; `loc/en/organizations.json` evidenceLanguage |
| N18 | `EVIDENCE.degradedAfterHours` | 2 (completion notice goes without the certificate; clamped to 24 h) | `yml:192-193` |
| N19 | `EVIDENCE.downloadLinkSeconds` | 300 | `EA/presentation/admin/EvidenceCertificateController.kt:37-45,116-131` |
| N20 | `EVIDENCE.retentionDays` | 365 (GOVERNANCE Object Lock) | `IssueEvidenceCertificateUseCase.kt:155` |
| N21 | `EVIDENCE.reissue` | platform staff, at most 3 times in 30 days | `EvidenceCertificateController.kt:150-163` |
| N22 | `AUDIT.chainScopes` | `env:<envelopeId>`, `org:<orgId>`, `global`; gap-free seq; hash v4 over 17 fields | `S/audit-service/src/main/kotlin/co/binarybridges/sign/audit/application/port/AuditChainAppender.kt:7-31`; `…/audit/domain/AuditHashV4.kt:38-58` |
| N23 | `AUDIT.appendOnly` | runtime role has no UPDATE, DELETE or TRUNCATE; triggers refuse them for every role | `afterMigrate__lv212_role_grants.sql:54-60`; `V006__lv212_audit_append_only.sql:11-84` |
| N24 | `AUDIT.nightlyVerify` | 03:30 America/Bogota | `…/audit/application/verification/NightlyChainVerificationJob.kt:81` |
| N25 | `AUDIT.readRatePerMinute` | 20 per caller (trail verification + export) | `EA/infrastructure/ratelimit/InMemoryAuditReadThrottle.kt:22-23` |
| N26 | `AUDIT.exportMaxRows` | 5000 (above that 413, paging by 1000); format `bbsign.audit-export.v1`; API only (`GET /api/v1/audit/envelopes/{id}/export`, unpublished in OpenAPI) | `EA/presentation/admin/AuditReadController.kt:105-144`; `…/audit/application/export/AuditTrailExporterV1.kt:13,21`; `yml:398` (/audit unpublished) |
| N27 | `RESTORE.days` | 7 | `yml:265`; `I/apps/bb-sign/edge-api.yaml:72` |
| N28 | `RESTORE.typicalHours` | 3-5 (Standard tier); UI says "usually within a few hours" | `yml:263-264`; `loc/en/envelopes.json:113` |
| N29 | `RESTORE.timeoutHours` | 48, then `FAILED(TIMEOUT)` | `EA/application/service/RestoreSettings.kt:25-26` |
| N30 | `RESTORE.maxActivePerOrg` | 50 (users and API keys, not signers) | `yml:269`; `RestoreSettings.kt:18` |
| N31 | `RESTORE.signerRateLimits` | 5 per 10 min per link; 20 per 10 min per IP | `yml:273-274`; `InMemorySignerRestoreThrottle.kt:25-26` |
| N32 | `RESTORE.statuses` | `REQUESTED, IN_PROGRESS, RESTORED, AVAILABLE, EXPIRED, FAILED`; reasons `DELETED, TIMEOUT, STORAGE_ERROR` | `EA/application/port/DocumentRestores.kt:70-78` |
| N33 | `RESTORE.purgeAfterDays` | 400 (restore rows and requester emails) | `RestoreSettings.kt:29-30` |
| N34 | `FILE.availability` | `AVAILABLE, ARCHIVED, RESTORE_IN_PROGRESS, RESTORED, DELETED` | `EA/application/service/DocumentDownloads.kt:56`; labels `loc/{en,es}/envelopes.json:112-116` |
| N35 | `RETENTION.archiveDatesVisible` | false in production (`archivesAt` null; `deletesAt` always shown) | `yml:261`; `EA/application/service/RetentionDates.kt:11-29`; not set in `I/apps/bb-sign/edge-api.yaml` |
| N36 | `ARCHIVE.stampHoldDays` | 7 (a COMPLETED envelope that is still unstamped stays live) | `yml:207-209`; `ArchiveEligibility.kt:70-77` |
| N37 | `ADMIN_MFA` | TOTP required for `platform_admin` and `org_admin` (login, first login after invitation, password reset); 6 digits, 30 s | `I/apps/platform/keycloak.yaml:73`; `I/apps/platform/configs/keycloak/kc-init.sh:663-664,726-743,270-271` |
| N38 | `AUTH.bruteForce` | temporary lockout: 10 failures, +60 s per failure, max 900 s, reset after 12 h | `kc-init.sh:658-661` |
| N39 | `EMAILS` new rows | see R-E1..E3 (certificate-expiring, document-restored, completion lines) | `NS/application/service/CertificateExpiryEmails.kt:90,95-100`; `NS/application/service/RestoreEmails.kt:80-81` |
| N40 | `RATE_LIMITS` (replaces "none") | verify-by-file 10/min/IP; signer restore 5/10 min per link and 20/10 min per IP; audit read/export 20/min; agreement publishes 10/day per type (dark) | N10, N25, N31; `yml:124` |

---

## 2. "Not shipped" list (plan §"Not shipped", `sign.ts` NOT_SHIPPED) and test denylists

| # | item | status on main | proof | action |
|---|---|---|---|---|
| NS1 | evidence certificate PDF or export | **SHIPPED and live.** The certificate (PDF) and the frozen trail JSON download from envelope detail and from the signer link. Export is through an unpublished API. | `loc/en/envelopes.json:85-94`; `loc/en/signing.json:85-86`; `EvidenceCertificateController.kt:37-45`; `AuditReadController.kt:105-144`; live: no `APP_EVIDENCE_*` override, platform-wide rollout (`V037__lv213_evidence_foundation.sql:64-79`) | Remove from NOT_SHIPPED and the plan list. Add "audit export in the OpenAPI contract / UI export button" if you want to keep a narrower item. |
| NS2 | rate limits | **Partly shipped.** There are now rate limits on public verify-by-file, signer restore, and audit read/export. There is still no general API rate limit. | N40 | Replace with "general API rate limits". The plan's "429 means quota or allowance cap" is now WRONG: `RATE_LIMITED` is 429 too (`loc/en/common.json` RATE_LIMITED). |
| NS3 | restore on request | **SHIPPED (deployed v0.34.0), idle in production** because no Glacier rule is live | F10; runbook `documents-lifecycle-guard.md:8-22` | Remove. Document it as "how restore works", stating that files are not archived today. |
| NS4 | certificate expiry emails | **SHIPPED and live** (no production override) | N1-N3; `yml:184-188` | Remove |
| NS5 | full certificate chain in the seal | **SHIPPED** | F1 | Remove. Update the test `facts.test.ts:98-99`. |
| NS6 | consent checkbox | Still NOT shipped. Agreement copies exist but are not pinned or shown to signers. `SIGNER_AGREEMENT_ACCEPTED` has no producer. | `I/apps/bb-sign/edge-api.yaml:64,68`; `S/audit-service/.../domain/AuditEventType.kt:17` | Keep. **Add** "signer acceptance of agreement texts (data-processing authorization)". The Settings > Agreements tab is live but has no signer effect yet. |
| NS7 | SMS OTP | Still not shipped (the schema allows 'SMS'; #223 is future) | `V003__lv209_otp_code_hmac.sql:14`; `SignerAuthMethod.kt:11-16` | Keep |
| NS8 | TSA / PAdES / LTV | Still not shipped | `W/application/service/PdfDigitalSignatureService.kt:13`; `PdfSealer.kt:48-51` | Keep |
| NS9 | sender completion email | Still not shipped (CompletionEmails sends to signers only) | `NS/application/service/CompletionEmails.kt:50-64` | Keep |
| NS10 | cancellation email | Still not shipped (no cancelled listener) | `NS/infrastructure/messaging/listener/` (no Cancelled listener) | Keep |
| NS11 | per-organisation retention | Still not shipped (`Retention` constants) | `Retention.kt:33-37` | Keep |
| NS12 | per-organisation branding | Still not shipped. Note: per-org *evidence language* now exists; it is not branding. | N17 | Keep |
| NS13 | templates, bulk send, field placement UI, signature image upload, declining, resending a link, access codes, legal hold, billing, free trial, Python/Go SDKs, Postman | No evidence on main (no DECLINED, resend link, legal hold or access code anywhere in the changed files) | grep over `git diff d1badc5..HEAD --name-only` | Keep |

Test denylists:
- `tests/unit/facts.test.ts` asserts claims that are now false:
  - `:56` Glacier equals policy
  - `:57` expiration `'none'`
  - `:58-59` `restoreOnRequest false` and NOT_SHIPPED contains 'restore on request'
  - `:65` 6 webhook events
  - `:98-99` `'leaf only'` and NOT_SHIPPED contains the full chain

  Each must be inverted or rewritten along with F1, F3, F7, F8 and F10.
- `tests/unit/content.test.ts:20-33` `FACT_DENYLIST` lists numbers, not features, so nothing is "shipped" to remove from it. **Add** the new literals pages will now need, so they cannot be typed in prose:
  - `\b7\s*(d[ií]as|days)\b` (restore window, stamp hold, 7-day notice)
  - `\b48\s*(h|horas|hours)\b` already exists (restore timeout and the reminder share 48)
  - `\b3\s*(a|-)\s*5\s*(h|horas|hours)\b`
  - `\b10\s*(por minuto|per minute)\b`
  - `\b20\s*(por minuto|per minute)\b`
  - `\b2\s*(h|horas|hours)\b`
  - `\b400\s*(d[ií]as|days)\b`

  Note: `30 days` and `365 days` already cover the 30-day notice and retention.

---

## 3. Concept and reference pages (es and en twins)

### 3.1 `concepts/documents.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| D1 | es :77-82 / en :76-81 "Documento original y documento firmado" | two downloads, Original and Signed | The detail also shows "SHA-256 del original:" / "SHA-256 of the original:" per document. It adds an **Evidence certificate** block ("Certificado de evidencia (PDF)", "Registro de auditoría (JSON)", "SHA-256 del certificado:") and a **Conservación / Retention** block with the delete date. | `loc/es/envelopes.json:78,85-94,98-116`; `loc/en/envelopes.json:78,85-116` | Add the fingerprint and the evidence certificate (link to Evidence and audit). Do not promise "SHA-256 del PDF firmado": that line never renders (N13 bug). | MISSING |
| D2 | es :87 / en :86 | "El documento firmado corresponde exactamente al PDF que usted adjuntó" | Now enforced. Each upload's SHA-256 and S3 version are recorded. Signers sign that exact set. The worker refuses to seal if the bytes differ. If documents changed during review, the signer sees "Los documentos cambiaron mientras los revisabas…". | `V035…:13-26`; `StampSignedPdfUseCase.kt:172-175,234-235`; `RecordSignatureUseCase.kt:134-147`; `loc/es/signing.json:13` | Explain the fingerprint ("huella SHA-256") and that bb-sign proves it (cite it as `DOCUMENTS.originalSha256`) | OUTDATED |
| D3 | es :25 / en :25 "Un sobre necesita al menos un documento para enviarse" | — | Also every document needs its recorded fingerprint, or send fails with "Uno de los documentos aún no tiene registrada su huella…". Older drafts are backfilled hourly. | `SendEnvelopeUseCase.kt:50-51`; `loc/{en,es}/common.json` DOCUMENT_HASH_MISSING; `EA/infrastructure/scheduling/DocumentHashBackfillScheduler.kt:12,18` | Add one sentence plus the error row ("wait a few minutes or upload it again") | MISSING |
| D4 | whole page | no word on retention or archive of files | Each file shows "No longer available from {date}" (365 days). In production the archive date is hidden (`archivesAt` null). Restore UI exists for archived files. | `loc/{en,es}/envelopes.json:98-116`; N35; F10 | Add a short "Conservación de los archivos" section that links to legal/retention, with the production caveat | MISSING |

### 3.2 `concepts/envelopes-and-signers.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| E1 | es :30-32 / en :28-30 | on completion, bb-sign seals each document | It then also issues the **evidence certificate** (PENDING then ISSUED, normally minutes). The completion email says whether it is ready or being prepared. | `EA/domain/evidence/EvidenceCertificate.kt:12`; `S/notification-service/src/main/resources/templates/email/envelope-completed.html:44-52` | Add a bullet that links to Evidence and audit | MISSING |
| E2 | es :84-87 / en :83-86 "Enviar un sobre" | DRAFT, at least one signer and one document | Plus every document needs a recorded SHA-256 (409 `DOCUMENT_HASH_MISSING`) | `SendEnvelopeUseCase.kt:50-51` | Add the condition | MISSING |
| E3 | es :89-93 / en :88-92 caution aside | documents freeze at send "para que todos firmen exactamente lo mismo" | Now cryptographic: each signer's signature is bound to the SHA-256 of the document set (seal v2) | `RecordSignatureUseCase.kt:134-160`; `SealHashUtil.kt:82-120` | One clause: "y cada firma queda ligada a la huella de esos documentos" | OUTDATED |
| E4 | es :81-82 / en :80-81 | no cancellation email | still true | NS10 | none | correct |

### 3.3 `concepts/evidence-and-audit.mdx` (largest gap)

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| A1 | es :18-20 / en :18-20 | each event carries its own hash and the previous one of the same envelope | Chain v4 has three chain kinds (envelope, organization, global), a gap-free sequence, and a 17-field hash that includes the chain key and seq. Storage is append-only at the database (no role can UPDATE or DELETE). It is verified every night at 03:30 Bogotá, with a daily heads digest kept off-host. | N22-N24; `S/audit-service/.../verification/DailyHeadsDigest.kt:13-24` | Rewrite the section: chain + append-only + nightly verification. Avoid internal names (R8, Grafana). | OUTDATED |
| A2 | es :22-24 / en :22-24 | actor is "una persona, un firmante o **Sistema**" | Users by name or email ("Usuario desconocido" fallback); API credentials by label with an **API** badge ("Credencial de API"); signers; "Sistema"; "Actor no registrado" for unattributed rows | `S/frontend/src/api/auditActor.ts:14-25`; `loc/es/envelopes.json:131-138` | Add API credential + badge + "Actor no registrado" | OUTDATED |
| A3 | es :23-24 / en :23-24 | trail readable by "Auditores y Gestores del espacio, y los administradores" | `audit:read` is held by **auditor, contributor and manager**. Every member is a contributor in General, so they read it there. The app's own hint still says "auditores y gestores". | `EA/domain/security/WorkspaceRoleBundles.kt:29-33`; sign.ts WORKSPACE_PERMISSIONS already lists contributor; `loc/es/envelopes.json:133` | "Auditores, Colaboradores y Gestores…". File a bb-sign issue for the UI hint. | WRONG |
| A4 | es :28-37 / en :28-37 events table | 11 event types | The envelope trail now also records ENVELOPE_CREATED, ENVELOPE_SENT, ENVELOPE_CANCELLED, ENVELOPE_EXPIRED, ENVELOPE_ARCHIVED, DOCUMENT_ADDED (with the original SHA-256), DOCUMENTS_SEALED (signed SHA-256), OTP_REQUESTED, OTP_VERIFIED, OTP_FAILED, OTP_LOCKED, AUDIT_TRAIL_EXPORTED, EVIDENCE_CERTIFICATE_ISSUED / FAILED / ACCESSED / REISSUE_REQUESTED, DOCUMENT_RESTORE_REQUESTED, DOCUMENT_RESTORED. Only 15 types have friendly UI labels; SIGNING_*, EMAIL_*, OTP_* show as codes. | `S/audit-service/src/main/kotlin/co/binarybridges/sign/audit/domain/AuditEventType.kt:10-97`; labels `loc/{en,es}/envelopes.json:139-154`; `auditActor.ts:27-44` | Replace the table with the full list: code, the app label where one exists, when. Drop SIGNER_AGREEMENT_ACCEPTED (no producer). | OUTDATED |
| A5 | es :39-41 / en :39-40 | webhooks notify "el envío, la cancelación y el vencimiento" | 8 events incl. completion, signer viewed/signed, `envelope.evidence_issued`, `document.restored` | F3 | List via WEBHOOK_EVENTS or say "los eventos del sobre" | OUTDATED |
| A6 | es :43-46 / en :42-45 org-level events | credentials, webhooks, workspaces | Also CERTIFICATE_UPLOADED / DELETED / EXPIRING and AGREEMENT_COPY_PUBLISHED | `AuditEventType.kt:63,92-97`; `EA/application/usecase/CertificateEvents.kt:27-45` | Add certificate events (agreements only if documented, see NS6) | MISSING |
| A7 | es :48-52 / en :47-51 "Datos de cada firma" | image, time, IP, user agent | Plus the **identification method** (`EMAIL_LINK` / `EMAIL_LINK_OTP`), the OTP challenge (channel, masked destination) and the **SHA-256 of the document set signed**. OTP codes are stored only as an HMAC. | N14, N15; `S/audit-service/.../listener/SignerSignedListener.kt:38-43` | Add three bullets | MISSING |
| A8 | es :54-59 / en :53-58 "Seguimiento de aperturas" | dedup 30 s | Still true. Caveat: before #226 (commit 4ff6d76e) the view-closed beacon never reached the API in production, so older envelopes may lack SIGNING_VIEW_CLOSED. | `S/frontend/src/pages/SigningCeremony.tsx:145-167` | Optional one-line note | OUTDATED (low) |
| A9 | es :68-71 / en :66-69 | recomputes `<sealHashFormula>` with the fingerprint of the **active** certificate | Seals since v0.34.0 use the fingerprint **stored with the seal**. v2 seals also recompute the document-set hash from current records. Only seals made before then fall back to the active certificate. | `VerifySignatureSealUseCase.kt:49-72` | Rewrite with v2 formula facts (F2) | WRONG |
| A10 | es :80-83 / en :77-80 | after a certificate change, earlier seals stop validating | False for seals made since v0.34.0. True only for older seals. | same | Limit to "sellos anteriores a <fecha/versión>" | WRONG |
| A11 | es :73-78 / en :71-75 aside "Para verificar el PDF, use el panel de firmas" | the public page never checks the PDF | New **"Comprobar un archivo"** on `/verify`: upload a PDF; its SHA-256 is computed on the server (not stored) and matched against the **signed** PDFs. A match shows completion date, signers (masked email) and certificate fingerprint. An unsigned original never matches. Limits in N10. | `loc/es/signing.json:106-117`; `VerifyController.kt:78-151`; `yml:235-238` | Add a subsection "Comprobar un archivo". Keep the aside for the CMS signature (still not checked server-side). Note: the UI hint "We compute its fingerprint here" is inaccurate; say "se sube, se calcula su huella y no se guarda". | MISSING |
| A12 | es :85-89 / en :82-85 "Consultar y conservar la evidencia" | only the in-app Audit Trail | **Evidence certificate** PDF (organization copy; signer copy masked) + frozen **audit trail JSON**, downloadable with `document:download` (the signer from their link), kept 365 days. Language es/en per organization. Chain verification (VALID/BROKEN/EMPTY) and export are API-only. | N16-N21, N26; `loc/es/envelopes.json:85-94`; `loc/es/signing.json:85-86` | New section "El certificado de evidencia" + update this one | MISSING |

### 3.4 `concepts/signature-and-seal.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| S1 | es :43 / en :43 Hash row | SHA-256 of name, email, date, envelope id, certificate fingerprint | v2 adds the SHA-256 of the signed document set and uses the signing time to the second (ISO), with a domain prefix and length-prefixed fields | F2 | "y la huella de los documentos firmados" | OUTDATED |
| S2 | es :79-82 / en :79-82 | embeds the certificate **without the chain**; a reader needs the root installed | The whole chain from the PKCS#12 is embedded. A reader still needs to trust the root (if the root is absent, NO_ROOT). | F1; `ChainStatus.kt:4-16` | Rewrite: "incrusta la cadena completa que contenga el archivo; por eso exporte el .p12 con su ruta de certificación" | WRONG |
| S3 | es :73-77 / en :73-77 testing certificate | self-signed, shown untrusted | Still correct. **MISSING**: the app shows a "Certificado de pruebas predeterminado" notice in Settings > Certificado, and states "No se bloquea el envío…". The evidence certificate prints a testing-certificate warning. | `loc/es/organizations.json:94-97`; `S/frontend/src/components/OrganizationCertificate.tsx:110-132`; `messages_es.properties:60-71` | Add the notice | MISSING |
| S4 | es :66-71 / en :66-71 own certificate | links to own-certificate | **MISSING**: chain check at upload (statuses N4, warnings N5, refusals N6, RSA only, at most 10 certificates). Expiry emails at 30 and 7 days to org admins. | N1-N8 | Short paragraph + link to admin/own-certificate | MISSING |
| S5 | es :58-64 / en :58-64 aside | identity backed by email, code, IP, audit | Add identification method and the evidence certificate | N15, N16 | Add both | OUTDATED (low) |

### 3.5 `concepts/organizations-workspaces-roles.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| O1 | es :67 / en :68 `org_admin` row | invite, workspaces, labels, credentials, webhooks, certificate, org audit | Also: Settings > **Agreements** (publish data-processing authorization versions, organization identification: legal name, NIT, privacy contact…) through `agreement:manage`. Admins must use an **authenticator app (TOTP)**. | `PermissionCatalog.kt:53-60`; `loc/es/settings.json` agreements; N37 | Add MFA now (live). Add agreements only with the caveat that signers do not see them yet (NS6). | MISSING |
| O2 | es :69 / en :70 `platform_admin` row | creates organizations, quotas, seal appearance | Also sets the organization's **evidence-certificate language** and re-issues failed certificates. Also subject to MFA. | N17, N21, N37 | Add | MISSING |
| O3 | es :66 / en :67 `org_member` / es :68 / en :69 `org_api` | label:read, workspace:read only | Both also hold `agreement:read` | F4 | Mention only if agreements are documented | OUTDATED (low) |
| O4 | es :49-52 / en :49-52 workspace roles | auditor adds download + audit trail | Download also unlocks the evidence certificate and restore requests. Archived envelopes need `archive:read` (viewer+). | `EnvelopeController.kt:294,577-591`; `loc/en/envelopes.json:94` | Add to the auditor row: "el certificado de evidencia y solicitar restauraciones" | MISSING |

### 3.6 `concepts/labels.mdx`, `concepts/quotas.mdx`

No change found. Labels: V009, SetEnvelopeLabelsUseCase unchanged. Quotas: quota-service only gained `expected-issuer`; V019 unchanged. One caveat: neither page should imply 429 means only quota (quotas.mdx es :75-76 / en twin says the API answers 429 when a limit is exceeded, which is still true). **No finding.**

### 3.7 `reference/emails.mdx` (+ `EMAILS` fact)

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| R-E1 | table (EMAILS) | 10 emails | **New:** `certificate-expiring`. Subject: "bb-sign: el certificado de sello de su organización vence en N días · Your organization's sealing certificate expires in N days". Recipient: org admins. Trigger: daily 13:07 UTC check at 30 and 7 days. Bilingual. | `NS/application/service/CertificateExpiryEmails.kt:90,95-100`; template `S/notification-service/src/main/resources/templates/email/certificate-expiring.html` | Add a row and a TRIGGER key (es and en) | MISSING |
| R-E2 | table | — | **New:** `document-restored`. Subject: "Tu solicitud de restauración de documentos / Your document restore request". Recipient: **whoever requested** (a user or a signer; API credentials get only the webhook). Trigger: a restore ends (restored, or failed with a reason). Bilingual, one per request. | `NS/application/service/RestoreEmails.kt:12-21,80-96` | Add a row. Add a `recipient` value `'requester'` to `EmailFact` and to RECIPIENT (es :12-16 / en :12-16). Mark it idle in production (NS3). | MISSING |
| R-E3 | table row envelope-completed | "Signing complete: {title}" | Same subject. The body now says the evidence certificate is ready or being prepared at the same link (English). Recipients are still signers only. | `CompletionEmails.kt:34-37,64`; `envelope-completed.html:44-52` | Update the source; add a note | OUTDATED |
| R-E4 | es :71-75 / en :71-75 aside "Idioma de los correos de sobres" + fact comment (sign.ts:291) | signer emails are English only | Still true for envelope mail. The two new emails are **Spanish then English**. | R-E1, R-E2 | Narrow: "los correos del sobre… en inglés; los avisos de certificado y de restauración, en español e inglés" | OUTDATED |
| R-E5 | es :85-86 / en :85-86 "Vencimiento del certificado. Lleve control… y renuévelo" | no email exists | There is now an email at 30 and 7 days (own certificates only) | N1-N3 | Move the item into the table; keep the advice to renew | WRONG |
| R-E6 | es :37-41 / en :37-41 Remitentes | lists envelope emails sent from sign@ | The new notices also go out from notification-service (same sender) | `S/notification-service/src/main/resources/application.yml:66`; `I/aws/bb-sign-aws.yml:37` | Add "avisos de certificado y de restauración" to the list | OUTDATED |
| R-E7 | es :81-84 / en :81-84 completed/cancelled | no sender email, no cancellation email | still true | NS9, NS10 | none | correct |
| R-E8 | identity emails | invite, reset, verification | Unchanged templates. The admin flows now include TOTP setup (login page `login-config-totp.ftl`, not an email). | `S/infrastructure/configs/keycloak/themes/bbsign/email/html/`; `…/login/login-config-totp.ftl` | none (MFA belongs in admin pages) | correct |

### 3.8 `reference/glossary.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| G1 | es :55-57 / en :56-58 Cadena de auditoría | hash-chained record of an envelope | Also organization and global chains; append-only; verified nightly | A1 | Update | OUTDATED |
| G2 | es :58-60 / en :59-61 Verificación | QR check that the seal matches the org's **active** certificate | Matches the certificate stored with the seal and, for v2, the documents' hashes. Plus file check by upload. | A9-A11 | Rewrite | WRONG |
| G3 | es :67-69 / en :68-70 Webhook | lists 6 events | 8 events | F3 | Add evidence ready and file restored | OUTDATED |
| G4 | es :81-82 / en :82-83 PKCS#12 | "agrupa un certificado, su cadena…" | Still correct; now meaningful because the chain is embedded | F1 | none | correct |
| G5 | es :83-84 / en :84-85 Cadena de certificación | definition only | Add: bb-sign embeds it in each seal and checks it at upload (COMPLETE / NO_ROOT / LEAF_ONLY / SELF_SIGNED) | N4 | Extend | OUTDATED |
| G6 | es :22-23 | role list says "visor" | App label is "Lector" (concepts page :44) | `organizations-workspaces-roles.mdx:44` | "lector" (consistency) | OUTDATED (low) |
| G7 | new terms | — | MISSING terms: **Certificado de evidencia** (evidence certificate), **Registro de auditoría congelado / audit-trail.json**, **Huella SHA-256 del original / del PDF firmado** (original / signed SHA-256), **Huella del conjunto de documentos** (document set SHA-256), **Versión del sello (v1, v2)**, **Certificado de pruebas** (testing certificate, DEFAULT_TESTING), **Estado de la cadena** (chain status), **Método de identificación** (EMAIL_LINK / EMAIL_LINK_OTP), **Actor** (user, API credential with API badge, signer, system), **Archivado (archivo en Glacier)** vs "Archivados" (database view), **Restauración** (restore) and **Disponible hasta** (restored copy window), **Idioma de la evidencia** (evidence language), **Comprobar un archivo** (verify by file). Only if agreements are documented: **Autorización de tratamiento de datos / copia de acuerdo**. | N4, N13-N17, N22, N32-N34; `loc/*` strings cited above | Add under "Firma, sello y evidencia" and "Certificados" | MISSING |
| G8 | es :33-35 / en :34-36 Archivados | the database view; independent of retention | Still true. Add: archived envelopes are read-only and their documents stay downloadable, including for signers (#122 fix). Distinguish this from file archiving (Glacier). | `loc/es/envelopes.json:66`; `EA/application/usecase/GetSignedCopyUseCase.kt:47-53` | Add one sentence | OUTDATED |

### 3.9 `reference/statuses.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| ST1 | whole page | envelope, signer, delivery, attempt and credential statuses | MISSING: **file availability** `AVAILABLE, ARCHIVED, RESTORE_IN_PROGRESS, RESTORED, DELETED` with UI labels (archivado / restaurando / "restaurado, disponible hasta el {date}" / "ya no está disponible (plazo de 365 días cumplido)") | N34; `loc/{es,en}/envelopes.json:112-116` | New section | MISSING |
| ST2 | — | — | MISSING: **evidence certificate** `ISSUED, PENDING, FAILED, UNAVAILABLE, EXPIRED`. Labels: "Procesando el certificado de evidencia...", "No se pudo generar; el equipo fue notificado.", "Completado antes de habilitar los certificados de evidencia.", "El periodo de conservación terminó y el certificado fue eliminado." | N16; `loc/es/envelopes.json:90-93` | New section | MISSING |
| ST3 | — | — | MISSING: **restore** `REQUESTED, IN_PROGRESS, RESTORED, AVAILABLE, EXPIRED, FAILED` (+ reasons) on the API and in the `document.restored` webhook. No UI labels. | N32; `EA/domain/webhook/WebhookEventType.kt:39-40` | New section (API/webhook names) | MISSING |
| ST4 | — | — | MISSING: **certificate chain status** COMPLETE / NO_ROOT / LEAF_ONLY / SELF_SIGNED / UNCHECKED, labels "Cadena completa" etc. | N4; `loc/es/organizations.json:104-131` | New section | MISSING |
| ST5 | — | — | Optional: audit chain verification `VALID, BROKEN, EMPTY` (API only) | `EA/presentation/admin/AuditReadController.kt:73-103` | Optional | MISSING (low) |
| ST6 | es :30-32 / en :30-32 envelope statuses | unchanged | Correct. Archived is a flag (`archived`, `archivedAt`), not a status value, and is audited as ENVELOPE_ARCHIVED. | openapi EnvelopeResponse; `loc/en/envelopes.json:144` | One sentence | MISSING (low) |
| ST7 | es :65-68 / en :65-68 webhook ladder text | unchanged values | Correct; only the sources moved (L27) | — | none | correct |

### 3.10 `reference/limits-and-defaults.mdx` (+ `LIMITS`)

| # | docs file:line (es / en) | currently says | reality on main | proof | proposed change | sev |
|---|---|---|---|---|---|---|
| LI1 | es :12-13 / en :11-12 "Las dos últimas filas corresponden a la política de conservación" | last two rows = policy | Becomes false once rows are appended. The policy rows' sources also change (F12). | — | Make the page say which rows by key, or keep the policy rows last | OUTDATED |
| LI2 | LIMITS rows | 34 rows | MISSING rows: verify-file rate (10/min/IP), concurrency (4), deadline (30 s), size (50 MB); certificate expiry notices (30 and 7 d); certificate max chain (10), RSA only; evidence notice degraded-after (2 h); evidence link (300 s); evidence retention (365 d); audit read/export rate (20/min) and export cap (5000 rows); restore window (7 d), typical (3-5 h), timeout (48 h), max active per org (50), signer restore limits (5 per 10 min per link, 20 per 10 min per IP); archive stamp hold (7 d); admin MFA TOTP (6 digits, 30 s); brute-force lockout (10 failures, max 900 s) | N1-N40 | Add rows with the new facts. Mark restore rows "idle in production". | MISSING |
| LI3 | `retentionPolicy`/`archivePolicy` rows | sourced from the LV contract | `Retention.kt:33-37` | F12 | Re-source | OUTDATED |

---

## Summary count

| scope | WRONG | OUTDATED | MISSING | total |
|---|---|---|---|---|
| 1. sign.ts values (1a) | 10 | 4 | — | 14 |
| 1. sign.ts sources moved (1b) | — | 43 rows checked (about 38 moved, values unchanged) | — | 43 |
| 1. new facts (1c) | — | — | 40 | 40 |
| 2. not-shipped / tests | 5 items now shipped (NS1-NS5; 1 partial), 5 test assertions false | — | 1 to add (signer agreement acceptance) + 6 denylist regexes | — |
| 3. concepts + reference pages | 9 | 17 | 27 | 53 |

Biggest risks:
- (a) The retention facts describe the CloudFormation template, not production. Live: 365-day expiration, no IA, no Glacier.
- (b) Public verification no longer fails after a certificate change, and verify-by-file exists.
- (c) The full chain is now embedded.
- (d) The evidence certificate and certificate expiry emails are live but listed as not shipped.
- (e) The webhook catalogue is 8 events, not 6.
