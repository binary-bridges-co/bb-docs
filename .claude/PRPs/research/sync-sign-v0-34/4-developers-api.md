# Audit 4: developer pages, API contract sync and SDKs

Scope: bb-docs worktree `sync-sign-v0-34` (HEAD 92077ba). The pages audited are `src/content/docs/sign/developers/*.mdx`, `sign/sdks/*.mdx` and their English twins under `en/sign/`, plus `src/content/sync/sign/*` and the facts those pages import from `src/content/facts/sign.ts`.
Ground truth: bb-sign main `.claude/worktrees/audit-main` (df6a2a6, `v0.34.0-1`) and bb-infrastructure main `bb-infra-worktrees/audit-main` (5a8468f). Production runs edge-api `v0.34.0` (`bb-infrastructure/apps/bb-sign/edge-api.yaml:29`), so main's API equals production's.
Paths below: `bbs/` = bb-sign audit-main, `bbi/` = bb-infrastructure audit-main, `docs/` = bb-docs `src/content/docs/`, `en/` = bb-docs `src/content/docs/en/`.

Severity: **WRONG** (false today, or code that does not work), **OUTDATED** (true at d1badc5, superseded since), **MISSING** (a shipped capability with no page or no mention).

No developer page documents `/api/v1/internal/**`. The synced OpenAPI has no internal path in the old copy or on main (`grep -c internal` = 0). Nothing here conflicts with bb-infrastructure#123 (`bbi/apps/bb-sign/ingress.yaml:26-57`).

---

## 1. Sync drift

### 1.1 Manifest and hashes

| Item | Synced copy (bb-docs) | bb-sign main | Status |
|---|---|---|---|
| Manifest `commit` | `d1badc513f9c…` (`sync/sign/sign.json:4`), tag `v0.15.4`, committed 2026-09-28 | `df6a2a6`, **36 commits later** (`git rev-list --count d1badc5..HEAD` = 36) | OUTDATED |
| Manifest `ref` | `local:bb-sign` (`sign.json:3`), so it was synced from the **base checkout** | — | The base checkout is not a valid source (see 1.4) |
| `openapi.json` sha256 | `d1e37204…b6efb47c` (matches the manifest and `public/sync/sign/openapi.json`) | raw `90475998…197d3`. After the `servers[0]` rewrite (simulated in scratchpad): **`40c05068…3dd19bdd6`** | DRIFT |
| `webhook-signature-vectors.json` sha256 | `290fb600…6c3549` | `290fb600…6c3549` | **Identical**: no vector change, the 16 cases still hold |
| Synced openapi vs d1badc5 | Identical apart from `servers` (verified by structural diff) | — | The copy is faithful to d1badc5 |
| `info.version` (`apiVersion`) | `2026-08-09` | `2026-08-09` (unchanged; all changes are additive per spec P4) | OK |

### 1.2 Semantic diff of `openapi.json` (d1badc5 to main)

Size: **17 to 25 paths, 19 to 27 operations, 29 to 52 schemas.** Nothing was removed. One existing operation changed.

**Added operations (8)**

| Operation | operationId | Auth | Proof |
|---|---|---|---|
| `GET /api/v1/agreement-copies/{copyId}` | `getAgreementCopy` | Bearer, `agreement:read` (org_api holds it) | `bbs/docs/api/openapi.json:1708`; `bbs/docs/api/reference.md:27` |
| `POST /api/v1/envelopes/{id}/documents/{docId}/restore` | `restoreEnvelopeDocument` | Bearer, `document:download` | `openapi.json:2408`; `reference.md:286` |
| `GET /api/v1/envelopes/{id}/evidence-certificate` | `getEvidenceCertificate` | Bearer, `document:download` (+`archive:read` once archived) | `openapi.json:2516`; `reference.md:380` |
| `GET /api/v1/envelopes/{id}/evidence-certificate/download` | `downloadEvidenceCertificate` | same | `reference.md:407` |
| `GET /api/v1/sign/{token}/evidence-certificate` | `getSignerEvidenceCertificate` | none (the link token) | `reference.md:462` |
| `GET /api/v1/sign/{token}/evidence-certificate/download` | `downloadSignerEvidenceCertificate` | none | `reference.md:487` |
| `POST /api/v1/sign/{token}/signed-documents/restore` | `restoreSignedCopy` | none | `openapi.json:3210`; `reference.md:593` |
| `POST /api/v1/verify/file` | `verifyDocumentFile` | none, rate-limited | `openapi.json:3599`; `reference.md:733` |

The count of unauthenticated operations rises from 8 to 12 (`reference.md` header).

**Changed operation (1).** `GET /api/v1/verify` was renamed from "Verify a signed document" to "Verify a signature seal". The old description, still served by bb-docs' `/sign/api/` from the synced copy (`sync/sign/openapi.json:2238`), says it *"Checks a signed PDF's CMS/PKCS#7 signature"*. Main says it *"does **not** read the PDF or validate its CMS/PAdES signature"* (`bbs/docs/api/reference.md:712`). The published API reference therefore makes a false claim today (**WRONG**).

**Added schemas (23):** `AgreementCopy`, `AgreementPublisher`, `AuditCoverageResponse`, `ChainHead`, `DocumentFile`, `DocumentHashDto`, `DocumentRestoreRequest`, `DocumentRestoreResponse`, `DocumentRestoreStarted`, `EnvelopeRetention`, `EvidenceCertificateDownloadResponse`, `EvidenceCertificateResponse`, `RestoreInProgressResponse`, `SignerEvidenceCertificateDownloadResponse`, `SignerEvidenceCertificateResponse`, `VerifyFileResponse`, `VerifyFileSigner`, `WebhookEventAuditChainHead`, `WebhookEventAuditCoverage`, `WebhookEventDocument`, `WebhookEventEvidenceCertificate`, `WebhookEventRestoredDocument`, `WebhookEventRetention`.

**Changed schemas (11, additive fields only)**

| Schema | New fields |
|---|---|
| `DocumentInfo` | `sha256` |
| `DocumentResponse`, `UploadedDocumentResponse` | `originalSha256` |
| `DocumentWithUrlsResponse` | `original`, `signed` (`DocumentFile`: `availability`, `archivesAt`, `deletesAt`, `availableUntil`, `restorable`), `originalSha256` |
| `EnvelopeResponse` | `archived` (required), `archivedAt`, `restoresInProgress`, `retention` (required) |
| `SignRequest` | `documentHashes` (optional; a mismatch answers 409 `DOCUMENT_HASH_MISMATCH`) |
| `SignedCopyResponse` | `availableUntil`, `deletesAt`, `restoreInProgress` |
| `VerifyResponse` | `sealVersion` |
| `WebhookEvent.type` | enum grows from 6 to **8** (`document.restored`, `envelope.evidence_issued`). The description changes from "One of exactly six values" to "One of eight values today; further event types may be added, and a receiver must ignore one it does not know" (`openapi.json:1307-1309`) |
| `WebhookEventData` | `auditChainHead`, `document`, `documents`, `documentsPath`, `evidenceCertificate`, `evidenceStatus`, `retention`, `signedDocumentsStatus` |
| `WebhookEventSigner` | `authMethod` (`EMAIL_LINK` / `EMAIL_LINK_OTP`; `openapi.json:1613`) |

`securitySchemes`, shared `parameters` and shared `responses` are unchanged.

**Error codes.** The OpenAPI document does not enumerate error codes. The codes added since d1badc5, with their statuses, come from source:

| Code | Status | Where | Proof |
|---|---|---|---|
| `RATE_LIMITED` (+`Retry-After`) | 429 | verify/file; signer restore; audit read/export; evidence re-issue | `bbs/edge-api/.../presentation/VerifyFileExceptionHandler.kt:33-36,61`; `RestoreExceptionHandler.kt` (handler) ; `AuditReadExceptionHandler.kt:39-55` |
| `VERIFY_TIMEOUT` | 408 | verify/file | `VerifyFileExceptionHandler.kt:40-44,62` |
| `PAYLOAD_TOO_LARGE` | 413 | verify/file (>50 MB in prod: `bbi/apps/bb-sign/edge-api.yaml:61`) | `VerifyFileExceptionHandler.kt:48` |
| `RESTORE_LIMIT_REACHED` | 429 | envelope restore (50 active per org in prod: `edge-api.yaml:75`) | `domain/restore/RestoreRefusals.kt:19` |
| `DOCUMENT_DELETED` | 410 | restores (past 365 days) | `RestoreRefusals.kt:15`; `RestoreExceptionHandler.kt` `GONE` |
| `DOCUMENT_NOT_SIGNED` | 409 | restores | `RestoreRefusals.kt:12` |
| `ARCHIVAL_STORAGE_UNAVAILABLE` | 503 | restores | `RestoreRefusals.kt:27` |
| `ENVELOPE_NOT_COMPLETED` | 409 | evidence status/download | `presentation/EvidenceExceptionHandler.kt:63` |
| `EVIDENCE_NOT_AVAILABLE` | 409 | evidence download when not `ISSUED` | `EvidenceExceptionHandler.kt:62` |
| `DOCUMENT_HASH_MISMATCH` | 409 | `POST /sign/{token}/sign` with `documentHashes` | `presentation/DocumentExceptionHandler.kt:47-51,68` |
| `DOCUMENT_HASH_MISSING` | 409 | send, or sign, when a document has no recorded hash | `DocumentExceptionHandler.kt:41-45`; `usecase/SendEnvelopeUseCase.kt:51` |
| `AUDIT_EXPORT_TOO_LARGE` | 413 | audit export (>5,000 rows) | `presentation/admin/AuditReadController.kt:114` |

`QUOTA_EXCEEDED` (429) is unchanged (`bbs/platform/starters/starter-web-errors/.../GlobalExceptionHandler.kt:64-69`).

**Upstream gap, reported only.** Every 429 in the generated reference reads "An organisation quota is exhausted", including on rate-limited endpoints. The 408, 410, 413 and 503 statuses above are not declared in `openapi.json`. bb-docs should not copy that table verbatim.

**Not in the contract (deliberately unpublished)**, but documented in bb-sign prose and reachable by an API key. `/api/v1/audit/envelopes/{id}/events|verification|export` takes `audit:read` (`bbs/docs/api/machine-authentication.md:104,108-126`; `AuditReadController.kt:86-150`). springdoc excludes `/audit` "for a follow-up issue" (`bbs/edge-api/src/main/resources/application.yml` springdoc block, around lines 381-402).

### 1.3 Webhook event types

| | Synced (d1badc5) | main |
|---|---|---|
| Count | 6 | **8** |
| Added | — | `envelope.evidence_issued`, `document.restored` |
| Payload additions | — | `envelope.completed` / `envelope.evidence_issued`: `evidenceStatus`, `signedDocumentsStatus`, `documents[]` (hashes), `documentsPath`, `evidenceCertificate`, `auditChainHead` (spec P3a). `envelope.completed`: `retention` (spec P3c). `document.restored`: `data.document`. `signer.*`: `signer.authMethod` |
| Proof | — | `bbs/docs/api/webhooks.md:18-29,48-66,78-127`; `bbs/docs/api/webhook-signature-spec.md:282-305,332-391`; `bbs/edge-api/.../domain/webhook/DispatchableEvent.kt:114`; UI labels in `bbs/frontend/src/i18n/locales/es/settings.json:67-68` |

### 1.4 Sync procedure (README)

- The README tells you to run `npm run sync:sign -- --from ../bb-sign` (bb-docs `README.md:35,107`). From bb-docs' base checkout, `../bb-sign` resolves to bb-sign's **base checkout**. That checkout is not ground truth: it was on `docs/remove-legal-review-banner` at session start and is now on `main` at `92061987`, two commits behind origin. **It predates `8c48c78d` (#269: evidence certificate, restore, audit export).** Syncing from it would publish a mid-state contract. From inside the bb-docs worktree, `../bb-sign` does not exist at all. The script records `ref: local:<basename>`, so the previous sync is marked `local:bb-sign` (`scripts/sync-product.mjs:72-75`).
  - **Proposed:** run `npm run sync:sign -- --from /Users/edward.montoya/code/binarybridges/bb-sign/.claude/worktrees/audit-main` (records `ref: local:audit-main`). Better, use the remote form `PRODUCT_REPO_TOKEN=… npm run sync:sign -- main`, which records the real ref. Change the README example to the remote form, or to a path that names a clean `main` checkout, and add a line saying that a local `--from` must be a clean checkout of `origin/main`.
- **The `servers[0].url` rewrite still applies.** Main still emits `servers[0] = {url: "http://localhost:8080", description: "Generated server url"}` (`bbs/docs/api/openapi.json:3727-3732`). The script replaces it with `https://sign-api.binarybridges.co` (`scripts/sync-product.mjs:35,88-95`). That is the production host (`bbi/apps/bb-sign/ingress.yaml:14-23`). `tests/unit/sync.test.ts:48-49` pins both.
- **Unit tests that block or contradict the new sync** (another audit owns facts, but the sync cannot land green without these):
  - `tests/unit/facts.test.ts:65` asserts `WEBHOOK_EVENTS` has length 6. It must become 8.
  - `tests/unit/facts.test.ts:58-59` asserts `restoreOnRequest === false` and that `NOT_SHIPPED` contains `'restore on request'`. Both are false since #214 (`bbs/docs/api/webhooks.md:78-127`).
  - `src/content/facts/sign.ts:179-194` (`WebhookEventType`, `WEBHOOK_EVENTS`) has 6 events and needs 8.
  - `sign.ts:361-375` (`NOT_SHIPPED`) still lists `evidence certificate PDF or export`, `rate limits` and `restore on request`. All three have shipped (`bbs/docs/api/evidence-certificate.md`; `VerifyFileExceptionHandler.kt`; `RestoreExceptionHandler.kt`).
  - `sign.ts:90-96` (`ORG_API_NEVER`) lacks `agreement:manage`, and `sign.ts:63-73` (`ORG_PERMISSIONS`) lacks `agreement:read` / `agreement:manage` (`bbs/edge-api/.../domain/security/PermissionCatalog.kt:71,85-90`; `bbs/infrastructure/configs/keycloak/permission-catalog.txt`, last two lines).
  - `tests/e2e/smoke.spec.ts:50-51` counts operations dynamically, so it needs no change.

---

## 2. `developers/index.mdx`, `docs/sign/developers/index.mdx` / `en/sign/developers/index.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 2.1 | 35-44 / 35-44 | The contract is organized in "cinco áreas" / "five areas": Documents, Envelopes, Signing ceremony, Verify, Workspaces | The counts are computed from the synced file (17/19 now, 25/27 after sync). The area table has no row for agreement copies, envelope restore, evidence certificate or verify-by-file | `bbs/docs/api/openapi.json:1708,2408,2516,3210,3599` | Make it six areas: add **Acuerdos / Agreement copies** (`GET /agreement-copies/{id}`, credential). Envelopes: add "restaurar un archivo archivado, certificado de evidencia". Ceremony: add "certificado del firmante, pedir la copia archivada". Verify: add "subir el archivo y comprobar su SHA-256 (`POST /verify/file`, rate-limited)" | OUTDATED |
| 2.2 | 63 / 62 | Webhooks card: "Los seis eventos" / "The six events" | Eight events | `bbs/docs/api/webhooks.md:18` | Change to "Los ocho eventos" / "The eight events", or drop the number ("Los eventos…") so it cannot drift again | WRONG |
| 2.3 | 16-18 / 16-18 | "Los SDKs de JavaScript y Java cubren la API" / SDKs cover the API | Both SDK facades expose only `envelopes`, `documents` and `verification`. The evidence-certificate, workspace and agreement-copy APIs are generated but **not reachable from the client** | `bbs/sdk-js/src/index.ts:1-6,157-160,271-273`; `bbs/sdk-java/.../BbSignClient.java:69-79`; `bbs/sdk-js/package.json` `exports` (only `.` and `./webhooks`) | Write "cubren los sobres, documentos y la verificación, y la verificación de webhooks". Note that the evidence certificate and `GET /workspaces` need plain HTTP with the token (see 10.4) | OUTDATED |
| 2.4 | 59-70 / 58-69 | Card list | No page for the evidence certificate, retention and restores, or the audit-trail export | `bbs/docs/api/evidence-certificate.md` (new); `bbs/docs/api/quickstart.md` reference list | Add cards for the pages proposed in section 12 | MISSING |

## 3. `developers/authentication.mdx`, `docs/…/authentication.mdx` / `en/…/authentication.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 3.1 | 75-76 / 74-75 | At organization level a credential holds **only** `label:read` and `workspace:read` | `org_api` also holds **`agreement:read`** | `bbs/edge-api/.../domain/security/PermissionCatalog.kt:69-71`; `bbs/infrastructure/configs/keycloak/permission-catalog.txt` (`agreement:read\|…,org_api`) | Write "`label:read`, `workspace:read` y `agreement:read` (leer las copias de acuerdos que citan sus sobres)" | WRONG |
| 3.2 | 98-102 / ~96-100 (`ORG_API_NEVER` list) | Five never-held permissions | Six: **`agreement:manage`** added (a key that could rewrite signers' legal text) | `PermissionCatalog.kt:82-90` | Add `agreement:manage` to `ORG_API_NEVER` (`facts/sign.ts:90-96`) and to `ORG_PERMISSIONS` | OUTDATED |
| 3.3 | 104-107 / 102-105 | The archive and the audit trail are administered only in the UI | An API key **reads archived envelopes** through the normal routes with `archive:read` (viewer and up). It **reads one envelope's audit trail** with `audit:read` at `/api/v1/audit/envelopes/{id}/events`, plus `/verification` and `/export` (20 calls a minute per caller). Only org-wide audit (`/audit/org-events`, `audit:read-org`) and other `/audit/**` stay human-only | `bbs/docs/api/machine-authentication.md:104,108-126`; `AuditReadController.kt:63-66,86-150`; `InMemoryAuditReadThrottle.kt:22` | Drop "el archivo, la auditoría" from the UI-only sentence. Add an **"Sobres archivados y auditoría de un sobre"** subsection that mirrors machine-authentication.md §Archived envelopes: same routes, `archived: true`, `archivedAt`, `archive:read` in addition to the usual permission, 404 for unreadable, writes on an archived id answer 404 | WRONG |
| 3.4 | 54-64 / 54-63 (Required claims) | `bb_sign_org_id`, `realm_access.roles`, `aud` | The issuer is now **mandatory**: edge-api refuses to start without `KEYCLOAK_EXPECTED_ISSUER`, and a token whose `iss` differs is rejected (401). Prod value: `https://auth.binarybridges.co/realms/bbsign` | `bbs` commit `beacf0b0` (#205); `bbs/edge-api/src/main/resources/application.yml:84`; `bbi/apps/bb-sign/common-config.yaml:19` | Add a row: `iss` = `https://auth.binarybridges.co/realms/bbsign`, otherwise 401. Add "token emitido por otro realm o host" to the 401 causes (line 120 / 118) | MISSING |
| 3.5 | 35-52 / 34-51 | Shows only `grant_type=client_credentials` | Correct. Since #184 the realm also has **no password grant (ROPC)** on the human clients (`bb-sign-frontend`, `admin-cli`). API-key clients never had it. A script cannot get a token with a user's email and password | `bbi/apps/platform/configs/keycloak/kc-init.sh:239,378,591,638`; `bbi/.../bbsign-realm.json:118,178` (`directAccessGrantsEnabled: false`); `bbs/edge-api/.../keycloak/KeycloakAdminClient.kt:446-448`; `bbs` commit `03502bb7` | Add one sentence: "Solo se admite `client_credentials`; el grant de contraseña está desactivado (`unauthorized_client`). Una integración nunca usa la cuenta de una persona." Optional: brute-force protection is on (`kc-init.sh:658`), so repeated `invalid_client` attempts can lock | MISSING |
| 3.6 | 45, 66-71, 120, 130 / same | `expires_in: 300`, 300 s lifetime | Still true in production | `bbi/.../bbsign-realm.json:4`; `kc-init.sh:531` | None (verified) | OK |
| 3.7 | 113-114 / ~111-112 | Missing org permission answers `403`, no body | Still true. New nuance: a missing **workspace** permission on an archived envelope (no `archive:read`) is `404` | `machine-authentication.md:121-123` | Fold into 3.3 | — |

## 4. `developers/quickstart.mdx`, `docs/…/quickstart.mdx` / `en/…/quickstart.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 4.1 | 245-251 / 241-247 (Referencia) | API reference, webhooks, Adobe migration, openapi.json | bb-sign quickstart now also links the **Evidence certificate** guide (the only change to quickstart.md since d1badc5) | `bbs/docs/api/quickstart.md:235` | Add "**Certificado de evidencia**: el resumen sellado de un sobre completado y su registro de auditoría", linking the new page (section 12) | MISSING |
| 4.2 | 216-229 / ~212-225 (step 5) | Attach, send, webhook | Still true. One new edge: send refuses with 409 `DOCUMENT_HASH_MISSING` when a document has no recorded hash. New uploads are always hashed (#211 P1), so only legacy un-backfilled documents can hit it | `SendEnvelopeUseCase.kt:51`; `DocumentExceptionHandler.kt:41-45` | Optional row in Troubleshooting: `409 DOCUMENT_HASH_MISSING` means re-upload the document | MISSING (low) |
| 4.3 | 87, 97-101, 112 / 85, 95-99, 110 | SDK `0.1.0` / `0.1.0-SNAPSHOT` | Version numbers unchanged on main even though both SDKs gained API surface (see section 10) | `bbs/sdk-js/package.json:3`; `bbs/sdk-java/pom.xml:24`; `bbs/sdk-java/CHANGELOG.md` "Unreleased" | Leave as is, but see 10.6 | OK (flag upstream) |

The rest of the page (URLs, curl, workspaces, the 404 codes, the troubleshooting table) checks out on main.

## 5. `developers/envelope-walkthrough.mdx`, `docs/…/envelope-walkthrough.mdx` / `en/…/envelope-walkthrough.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 5.1 | 277-278 / 273-274 | `if ("envelope.completed".equals(event.getType()))` | `WebhookEvent.getType()` returns the enum `TypeEnum`, not a String. `String.equals(TypeEnum)` is **always false**, so `downloadSigned` never runs. This bug already existed at d1badc5 | `bbs/sdk-java/.../generated/model/WebhookEvent.java:56-73,226` (and `git show d1badc5:…WebhookEvent.java:56,220`) | `if (event.getType() == WebhookEvent.TypeEnum.ENVELOPE_COMPLETED)` | WRONG |
| 5.2 | 277 / 273 (and webhooks 116/114, java 132/132) | `new ObjectMapper().readValue(rawBody, WebhookEvent.class)` | A plain mapper has no `JavaTimeModule`, and `WebhookEvent.createdAt` is an `OffsetDateTime`, so it throws `InvalidDefinitionException`. It also keeps `FAIL_ON_UNKNOWN_PROPERTIES`, so any additive field fails (P4). Five fields were added since d1badc5. The SDK's own mapper and its test configure both | `WebhookEvent.java:45`; `BbSignClient.java:239-268`; `bbs/sdk-java/src/test/.../UnknownEnumToleranceTest.java:19-21` | `new ObjectMapper().registerModule(new JavaTimeModule()).disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)` (needs `jackson-datatype-jsr310`), or inject Spring's mapper | WRONG |
| 5.3 | 244-246 / 240-242 (sample payload) | `data` has only `envelope` | `envelope.completed` now carries `evidenceStatus`, `signedDocumentsStatus`, `documents[{documentId, filename, originalSha256, signedSha256}]`, `documentsPath`, `evidenceCertificate`, `auditChainHead` and `retention` | `bbs/docs/api/webhook-signature-spec.md:332-391` | Update the sample. Say "una notificación por sobre y suscripción". Mention `envelope.evidence_issued` for a late certificate | OUTDATED |
| 5.4 | 227-233 / 223-229 | "El payload contiene el id y el estado del sobre; el documento se obtiene en el paso 7" | The payload now carries each document's `signedSha256` and the certificate hashes, so the download in step 7 can be **verified**. When `signedDocumentsStatus: PREPARING`, `signedSha256` is null and the signed copy may not exist yet | `webhook-signature-spec.md:361-363`; `bbs/docs/api/webhooks.md:85-93` | In step 7, add: compute the SHA-256 of each downloaded PDF and compare it with `data.documents[].signedSha256`. Fetch `data.evidenceCertificate.downloadPath` (300 s link). On `PREPARING`, fetch later | MISSING |
| 5.5 | 289-293, 311, 324 / 285-289, 307, 320 | `signedUrl` is present once `COMPLETED` and null only without `document:download` | It is **also null when the signed file is `ARCHIVED`, `RESTORE_IN_PROGRESS` or `DELETED`**. The JS and Java snippets would `fetch(null)` / `URI.create(null)`. In prod no Glacier transition is live yet, so `ARCHIVED` cannot happen today, and `archivesAt` is null | `bbs/edge-api/.../service/DocumentDownloads.kt:151-167`; `bbi/aws/bb-sign-aws.yml:264-295,439-443`; `bbs/edge-api/src/main/resources/application.yml:259-261` (`archive-dates-visible: false`) | Note `signed.availability` and guard the snippets: skip a document whose `signedUrl` is null, and on `ARCHIVED` call the restore endpoint (section 12) | OUTDATED |
| 5.6 | 332-334 / 328-330 | "bb-sign conserva los documentos firmados durante un plazo fijo" | The period is concrete: **365 days** from completion (original from upload). From day 90 files *may* be archived and need a restore. Evidence certificate and audit trail: 365 days from issue | `bbs/docs/api/webhooks.md:80-83`; `bbs/docs/api/evidence-certificate.md:93-97` | Name the 365 days. Point to `data.retention.deletesAt` as the date to archive by | OUTDATED |
| 5.7 | 117-120 / ~113-116 | Generated SDK methods send JSON, so the multipart upload uses raw HTTP | Still true (`DocumentControllerApi.uploadDocument` is `Content-Type: application/json`) | `bbs/sdk-java/.../generated/api/DocumentControllerApi.java:31-37` | None | OK |

## 6. `developers/webhooks.mdx`, `docs/…/webhooks.mdx` / `en/…/webhooks.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 6.1 | 26 / 26 | "entre los seis disponibles" / "the six available" | Eight | `bbs/docs/api/webhooks.md:18` | "entre los ocho disponibles" / "the eight available" | WRONG |
| 6.2 | 28-35 / 28-35 (event table) | Six rows. `envelope.completed` means "Todos los firmantes firmaron" | Add `envelope.evidence_issued` ("the evidence certificate arrived after an `envelope.completed` sent without it") and `document.restored` ("a restore of an archived file ended"). `envelope.completed` is "sent once, with the evidence certificate when it is ready in time" | `webhooks.md:20-29`; UI labels `bbs/frontend/src/i18n/locales/es/settings.json:67-68` | Add the two rows and reword `envelope.completed`. Drive the list from `WEBHOOK_EVENTS` once it has 8 | WRONG |
| 6.3 | 53 / 53 (sample) | `signer` lacks `authMethod` | `signer.authMethod` = `EMAIL_LINK` or `EMAIL_LINK_OTP`, null before signing or for old signatures | `webhooks.md:48,53-57`; `openapi.json:1613` | Add the field to the sample and one paragraph on its meaning | OUTDATED |
| 6.4 | 58-60 / 58-59 | `data.signer` only on `signer.*` | Also `data.document` only on `document.restored`; `data.retention` only on `envelope.completed`; the completion-notice fields only on `envelope.completed` / `envelope.evidence_issued`. "New fields may appear within an `apiVersion`, and new event types may be added; ignore what you do not know" | `webhooks.md:59-66`; `openapi.json` `WebhookEventData` description | Add these lines | OUTDATED |
| 6.5 | 70-77 / 69-75 ("Obtener el documento firmado") | Call `GET …/documents` for `signedUrl` | Still true. Missing: verify against `documents[].signedSha256`, the evidence-certificate `downloadPath`, `retention.deletesAt`, and the "archive each envelope as soon as it completes" recipe | `webhooks.md:85-93` | Extend this subsection with the 4-step recipe from `webhooks.md:87-93` | MISSING |
| 6.6 | (none) | — | New section **"Retention and restores"**: 365-day fixed retention, possible archiving from day 90, `availability` values, `POST …/documents/{docId}/restore` with `{"kind":"SIGNED"\|"ORIGINAL"}` (202 while restoring, 200 when not needed), `document.restored` payload (`outcome` RESTORED/AVAILABLE/FAILED, `reason` DELETED/TIMEOUT/STORAGE_ERROR, `availableUntil` 7 days, `downloadPath`), and "API credentials are never emailed: subscribe to `document.restored`" | `webhooks.md:78-127`; `bbi/apps/bb-sign/edge-api.yaml:72` (7 days) | Add the section, or a dedicated page (section 12) linked from here. State that in production `archivesAt` is null and no file is archived yet (`bbi/aws/bb-sign-aws.yml:439-443`) | MISSING |
| 6.7 | 116 / 114 | `new ObjectMapper().readValue(...)` | See 5.2 | — | Same fix | WRONG |

## 7. `developers/webhook-signature-spec.mdx`, `docs/…/webhook-signature-spec.mdx` / `en/…/webhook-signature-spec.mdx`

Part 1 (sections 1 to 9) is unchanged on main and the vectors are byte-identical. All findings are in Part 2.

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 7.1 | 283-284 / 276 | "Exactamente seis" / "Exactly six" | "Eight today… Further types may be added: a receiver ignores one it does not know (P4)" | `bbs/docs/api/webhook-signature-spec.md:282-283` | Reword to match | WRONG |
| 7.2 | 286-293 / ~279-286 (P3 table) | Six rows; `envelope.completed` data = `envelope` | Add `envelope.evidence_issued` (`envelope` + notice fields) and `document.restored` (`envelope` + `document`). `envelope.completed` data = `envelope` + the notice fields + `retention` | `webhook-signature-spec.md:285-294` | Add the rows. Add the `data.document` bullet list (`kind`, `outcome`, `reason`, `downloadPath` always `/api/v1/envelopes/{id}/documents`, "no URL is ever in the payload", one event per restore with a deterministic `id`) | WRONG |
| 7.3 | 295-306 / 289-299 (data sample) | `signer` without `authMethod` | Add `authMethod` (in `openapi.json`; the upstream spec sample is itself stale here) | `openapi.json:1613`; `webhooks.md:48` | Add `"authMethod": "EMAIL_LINK\|EMAIL_LINK_OTP\|null"` | OUTDATED |
| 7.4 | (after 318) / (after 311) | — | **P3a, the completion notice**: one `envelope.completed` per envelope and subscription. It is sent on the first of: certificate issued, 2 h late (`PENDING`), `FAILED`, `UNAVAILABLE`. Never withheld more than 24 h. `envelope.evidence_issued` follows a notice sent without the certificate. Field rules: `PREPARING` means treat `signedSha256` as unknown; an unknown `evidenceStatus` is treated like `PENDING`; a `PENDING` notice may never be followed by anything, so poll `GET …/evidence-certificate` | `webhook-signature-spec.md:332-370` | Add a P3a section | MISSING |
| 7.5 | (after P3a) | — | **P3c (upstream numbering), retention dates on `envelope.completed`**: `retention = {archivesAt\|null, deletesAt}`, both rounded up to 00:00 UTC and the earliest across the envelope's files. `deletesAt` means "no longer available from". `archivesAt` is null until archiving is enabled. Fixed at first send (P3b) | `webhook-signature-spec.md:372-391` | Add the section. Upstream now has **two headings called P3c** (lines 372 and 405). Name the retention one P3c as upstream does, and keep the docs' "data se lee del estado actual" as the second P3c with an explicit note, or renumber both and file a bb-sign issue | MISSING |
| 7.6 | 308-311 / 300-303 ("Se excluyen… URL de descarga") | No download URLs in the payload | Still true. The payload now carries **paths** (`documentsPath`, `evidenceCertificate.downloadPath`, `document.downloadPath`), never URLs | `webhook-signature-spec.md:300,368-369` | Add "Los campos `*Path` son rutas de la API que se consultan con el token, no enlaces" | OUTDATED |
| 7.7 | 350 / 340 (P5 schemas row) | `WebhookEvent`, `WebhookEventData`, `WebhookEventEnvelope`, `WebhookEventSigner` | Plus `WebhookEventDocument`, `WebhookEventEvidenceCertificate`, `WebhookEventAuditChainHead`, `WebhookEventAuditCoverage`, `WebhookEventRetention`, `WebhookEventRestoredDocument` | `openapi.json` components (see 1.2) | List them | OUTDATED |
| 7.8 | 352 / 342 | "La guía de los seis tipos" | Eight (upstream P5 still says "six types" at `webhook-signature-spec.md:432`, an upstream inconsistency) | — | "La guía de los tipos de evento" | WRONG |

## 8. `developers/errors.mdx`, `docs/…/errors.mdx` / `en/…/errors.mdx`

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 8.1 | 32-33 / 32-33 | "Un 429 indica siempre una cuota agotada; la API no aplica límites de tasa" / "does not apply rate limits" | **False.** 429 `RATE_LIMITED` with `Retry-After` exists on `POST /verify/file` (10 a minute per client in prod), on the signer restore endpoint, and on audit read/export (20 a minute per caller). 429 `RESTORE_LIMIT_REACHED` applies to org restores (50 active) | `VerifyFileExceptionHandler.kt:33-36`; `RestoreRefusals.kt:19-23`; `AuditReadExceptionHandler.kt:39-55`; `InMemoryAuditReadThrottle.kt:22`; `bbi/apps/bb-sign/edge-api.yaml:58,75` | Rewrite: "429 means the server did not process the request. `code` says why: `QUOTA_EXCEEDED` (body has `quota`), `RATE_LIMITED` (honor `Retry-After`), `RESTORE_LIMIT_REACHED`" | WRONG |
| 8.2 | 18-27 / 18-27 (status table) | 400, 401, 403, 404, 409, 422, 429, 0 | Missing **408** `VERIFY_TIMEOUT`, **410** `DOCUMENT_DELETED`, **413** `PAYLOAD_TOO_LARGE` / `AUDIT_EXPORT_TOO_LARGE`, **503** `ARCHIVAL_STORAGE_UNAVAILABLE` (and `SERVICE_UNAVAILABLE` from audit). 409 now also covers `ENVELOPE_NOT_COMPLETED`, `EVIDENCE_NOT_AVAILABLE`, `DOCUMENT_NOT_SIGNED`, `DOCUMENT_HASH_MISMATCH` and `DOCUMENT_HASH_MISSING` | see the code table in 1.2 | Add the four statuses. Add a **"Códigos `code` frecuentes"** table, one row per code with status, endpoint and action | MISSING |
| 8.3 | 26 / 26 (429 row action) | Ask the platform admin to raise the quota; the SDKs retry | Right for `QUOTA_EXCEEDED` only. Retrying a quota 429 is useless. The SDKs retry *any* 429/503 with their own backoff (250 ms base, capped) and **ignore `Retry-After`** | `bbs/sdk-java/.../RetryInterceptor.java:105-121`; `bbs/sdk-js/src/index.ts:139-143` | Split the row by `code`. State that the SDKs do not wait for `Retry-After` | OUTDATED |
| 8.4 | 129-132 / ~128-131 | 429 and 503 retried on any method "because the server did not process it" | Still the SDK behaviour (unchanged) | same | Keep, plus the Retry-After caveat | OK |

## 9. `developers/migrating-from-adobe.mdx`, `docs/…/migrating-from-adobe.mdx` / `en/…/migrating-from-adobe.mdx`

bb-sign's `docs/api/migrating-from-adobe.md` is unchanged since d1badc5. The drift comes from new product capability.

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 9.1 | 84-86 / 83-85 ("Contenido del evento") | Compact event: envelope id, title, status, signer. For more data, call the API | `envelope.completed` now also carries document hashes, the evidence certificate (hashes, `downloadPath`), the audit-chain head, `retention`, and `signer.authMethod` | `webhook-signature-spec.md:332-391` | Write "compacto y tipado; el de finalización incluye además los hashes de los documentos, el certificado de evidencia y las fechas de conservación" | OUTDATED |
| 9.2 | 90-98 / 88-96 (endpoint map) | No mapping for audit trail or certificate | Adobe `GET /agreements/{id}/auditTrail` (and the "audit report" PDF) map to `GET /api/v1/envelopes/{id}/evidence-certificate/download` (sealed PDF + frozen `audit-trail.json`, 300 s links) or `GET /api/v1/audit/envelopes/{id}/export` (`audit:read`). Adobe `GET /agreements/{id}/formData`: no equivalent | `bbs/docs/api/evidence-certificate.md:53-77`; `AuditReadController.kt:105-150` | Add the rows | MISSING |
| 9.3 | 18-30 / 18-30 | Concept map | Add **Adobe "Audit report"** maps to **Certificado de evidencia** (organization copy and signer copy) | `evidence-certificate.md:3-15` | Add a row | MISSING |

## 10. SDKs: `sdks/javascript.mdx` and `sdks/java.mdx` (es / en)

Versions: both unchanged (`@binarybridges/bb-sign-sdk` 0.1.0, Node >= 20; `co.binarybridges.sign:bb-sign-sdk-java:0.1.0-SNAPSHOT`, Java 17). The facts are right (`bbs/sdk-js/package.json:2-10`; `bbs/sdk-java/pom.xml:21-36`). The **generated surface grew** in 6 commits (#245, #253, #257, #260, #265, #269); `git diff --stat d1badc5 HEAD -- sdk-js sdk-java` shows 53 files and +8,312 lines.

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change | severity |
|---|---|---|---|---|---|---|
| 10.1 | java 133-137 / 133-137 | `switch (event.getType()) { case "envelope.completed" -> …; case "signer.signed" -> …; default -> … }` | `getType()` returns `TypeEnum`, and a switch on an enum cannot take String labels, so **this does not compile** (true at d1badc5 too; copied from `bbs/sdk-java/README.md:113-115`, which has the same bug) | `WebhookEvent.java:56-73,226` | `switch (event.getType()) { case ENVELOPE_COMPLETED -> …; case SIGNER_SIGNED -> …; default -> {} }`. Explain that `UNKNOWN_DEFAULT_OPEN_API` is what an unknown type now parses to | WRONG |
| 10.2 | java 132 / 132 | `new ObjectMapper()` | See 5.2 | `BbSignClient.java:239-268` | Same fix | WRONG |
| 10.3 | java 136 / 136 ("ignore unknown types: more will be added") | Implies unknown types are harmless | Only true **since #213 P5R-L4**: `enumUnknownDefaultCase=true`, so an unknown type reads as `UNKNOWN_DEFAULT_OPEN_API` and an unknown nullable enum as null. An SDK built before that change **throws** on a new event type. Both SDK builds carry the same version number | `bbs/sdk-java/CHANGELOG.md` Unreleased "Changed"; `bbs/sdk-java/pom.xml:168-174`; `UnknownEnumToleranceTest.java` | Add an Aside: "Use the current SDK build: earlier builds of 0.1.0-SNAPSHOT fail to parse `envelope.evidence_issued` and `document.restored`" | OUTDATED |
| 10.4 | js 57-59 / 57; java 101 / 101 | The client exposes `envelopes`, `documents`, `verification` | Still exactly true. Through them a client gets the **new** `envelopes.restoreEnvelopeDocument` and `verification.verifyDocumentFile`. It does **not** get `EvidenceCertificateControllerApi`, `WorkspaceControllerApi` or `AgreementCopyControllerApi`: they are generated but not on the facade, not exported by the JS package (`exports` has only `.` and `./webhooks`, and `index.ts` re-exports only models), and not reachable from `BbSignClient` (which builds its Retrofit internally) | `bbs/sdk-js/src/index.ts:1-9,157-160,271-273`; `bbs/sdk-js/src/generated/apis/EvidenceCertificateControllerApi.ts:71,111`; `BbSignClient.java:69-79` | List what each accessor now includes (restore, verify-by-file). Add "El certificado de evidencia, `GET /workspaces` y las copias de acuerdos no están en el cliente: llámelos por HTTP con el token". File a bb-sign issue to add `evidence()`, `workspaces()`, `agreements()` | MISSING |
| 10.5 | (none) | — | New typed fields an integrator now receives: `EnvelopeResponse.archived/archivedAt/retention/restoresInProgress`; `DocumentWithUrlsResponse.original/signed` (`DocumentFile.availability`…) and `originalSha256`; webhook `evidenceStatus`, `documents`, `evidenceCertificate`, `retention`, `document`; `signer.authMethod`. Also `SignRequest.documentHashes` (optional; JS README "Signing: document hashes") | `bbs/sdk-java/CHANGELOG.md` Unreleased "Added"; `bbs/sdk-js/README.md:244-248` | Add a short "Novedades del contrato" or "Changelog" section to both pages, or link the CHANGELOG | MISSING |
| 10.6 | js 15, 22-27 / 15, 22-27; java 15, 30-48 / 15, 30-48 | Version `0.1.0` / `0.1.0-SNAPSHOT` | Correct, but **the version was not bumped** across the new surface and a source-breaking enum change (10.3). A customer cannot tell an old tarball or jar from a new one. The CHANGELOG's own "Breaking (source only)" entry (workspaceId) and these are all under "Unreleased" | `bbs/sdk-java/CHANGELOG.md:6-…` | Docs: tell readers to check the `.sha256` against the current handover. Upstream: bump to 0.2.0 before the next handover | OUTDATED (upstream) |
| 10.7 | js 205-212 / 196-205; java 214-221 / 209-217 (error tables) | 429 = "Una cuota de la organización está agotada" | Also `RATE_LIMITED` / `RESTORE_LIMIT_REACHED`. Add 408, 410, 413, 503 | see 8.1-8.2 | Align with the errors page | WRONG |
| 10.8 | js 197-198 / 191; java 206-207 / 202 | 429/503 retried on POST too | True, but the SDKs ignore `Retry-After`, so on `RATE_LIMITED` (10/min on verify/file) they retry within milliseconds and fail again | `RetryInterceptor.java:105-121` | Add "no respetan `Retry-After`; ante `RATE_LIMITED` espere ese tiempo antes de volver a llamar" | MISSING |
| 10.9 | (none) | — | **Upstream defect, do not document as working.** Java `VerifyControllerApi.verifyDocumentFile(@Body File body)` goes through `JacksonConverterFactory`, which serializes a `java.io.File` as its JSON path string, not its bytes. No test calls it (`grep verifyDocumentFile sdk-java/src/test` finds nothing). The JS version passes `body` to `fetch` as given and looks correct | `bbs/sdk-java/.../generated/api/VerifyControllerApi.java:40-50`; `BbSignClient.java:316-317` | Until bb-sign fixes it, a Java verify-by-file example should use plain HTTP (`application/octet-stream`). File a bb-sign issue | — (flag) |

---

## 11. Upstream (bb-sign) inconsistencies found along the way

These are not bb-docs bugs, but bb-docs will inherit them on the next sync or if it copies them:

1. `bbs/sdk-java/README.md:113-115`: the `switch` on `TypeEnum` with String labels does not compile (10.1), and `new ObjectMapper()` lacks JavaTimeModule (5.2).
2. `bbs/docs/api/webhook-signature-spec.md:372,405`: two headings named "P3c". Line 432 (P5) still says "the six types", and the P3 `data` sample (lines 302-313) lacks `authMethod`.
3. `openapi.json`: every 429 is described as an exhausted quota, and 408, 410, 413 and 503 are not declared on verify/file and the restores.
4. The SDK facades omit the evidence, workspace and agreement APIs (10.4). Java `verifyDocumentFile(File)` is likely broken (10.9). Versions were not bumped (10.6).
5. `/api/v1/audit/envelopes/{id}/events|verification|export` is open to API keys (`audit:read`) but unpublished in the contract.

## 12. New pages proposed

| Page (es / en) | Content | Sources |
|---|---|---|
| `sign/developers/evidence-certificate.mdx` / `en/…` "Certificado de evidencia" / "Evidence certificate" | Organization copy and signer copy. `GET …/evidence-certificate`: statuses `PENDING`/`ISSUED`/`FAILED`/`UNAVAILABLE`/`EXPIRED`, fields, safe to poll, not recorded. `/download`: 300 s links pinned to versions, `auditTrailUrl`, recorded as `EVIDENCE_CERTIFICATE_ACCESSED`, 409 `EVIDENCE_NOT_AVAILABLE`. Signer endpoints. 365-day lock. How to check hashes and the chain head. Completion webhook table (`evidenceStatus`) with `envelope.evidence_issued`. Re-issue is platform-only. curl / JS / Java via plain HTTP, since the SDK facades lack it | `bbs/docs/api/evidence-certificate.md:1-131`; `reference.md:380-430,462-510` |
| `sign/developers/retention-and-restores.mdx` / `en/…` "Conservación y restauración" / "Retention and restores" | Fixed 365 days. Archiving possible from day 90 (not active in prod yet; `archivesAt` null). `availability` values on `GET …/documents`. `POST …/documents/{docId}/restore` (202/200, `alreadyInProgress`, 7-day restored copy, 409/410/429/503 codes). `document.restored` payload. "Archive at completion" recipe with hash checks. Archived envelopes stay readable with `archive:read` | `bbs/docs/api/webhooks.md:78-127`; `reference.md:286-320,593-620`; `machine-authentication.md:108-126`; `bbi/apps/bb-sign/edge-api.yaml:69-75`; `bbi/aws/bb-sign-aws.yml:439-443` |
| `sign/developers/audit-trail-api.mdx` / `en/…` "Registro de auditoría por API" / "Audit trail API" (or a section of the evidence page) | `GET /api/v1/audit/envelopes/{id}/events`, `/verification` (`VALID`/`BROKEN`/`EMPTY`), and `/export` (`bbsign.audit-export.v1`, `X-BbSign-Export-Sha256`, `uptoSeq`/`fromSeq`/`limit` paging, 413 `AUDIT_EXPORT_TOO_LARGE` beyond 5,000 rows). `audit:read`; 20 calls a minute (429 `RATE_LIMITED`). The API key is recorded as `API_CLIENT` with its credential id. Note: not in the OpenAPI contract yet | `AuditReadController.kt:86-150`; `bbs/docs/audit/hash-chain-v4.md` §Export v1, §Export paging (lines 294-383); `bbs/docs/audit/actor-model.md`; `machine-authentication.md:104` |
| `sign/developers/verify-by-file.mdx` / `en/…` (or a section in an existing verification page) | `POST /api/v1/verify/file`: raw bytes `application/octet-stream`, at most 50 MB, 30 s; only signed outputs match; response fields (`match`, `sha256`, masked signers, `sealCertFingerprint`); 429 `RATE_LIMITED` (10 a minute per client), 408, 413. Contrast with `GET /verify` (seal lookup, does **not** validate CMS/PAdES) | `reference.md:705-750`; `bbs/sdk-java/CHANGELOG.md` (verifyDocumentFile entry); `bbi/apps/bb-sign/edge-api.yaml:55-61` |
| Section, not a page: "Copias de acuerdos" in `authentication.mdx` or the index | `GET /api/v1/agreement-copies/{copyId}` (`agreement:read`): an immutable text with version, language and `contentSha256`; another organization's copy is 404. Production has **not enabled pinning at send** (`AGREEMENTS_PIN_AT_SEND: "false"`) and seeds no platform texts, so no envelope references a copy yet | `reference.md:27-45`; `bbi/apps/bb-sign/edge-api.yaml:62-68` |

Update the sidebar (`src/config/products.ts`, developers group) and the index cards (2.4) for each page added. Also add the evidence page to the quickstart's reference list (4.1).
