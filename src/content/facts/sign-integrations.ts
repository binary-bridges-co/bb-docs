/**
 * bb-sign facts for integrations: webhooks, error codes, rate limits and the SDKs. Split out of `sign.ts`
 * to keep each fact module under 800 lines; `sign.ts` re-exports everything here, so pages keep importing
 * from `facts/sign`. Same rules and source shorthands as `sign.ts` (see its header).
 *
 * Source shorthands: `EA` = bb-sign/edge-api/src/main/kotlin/co/binarybridges/sign/edge,
 * `yml` = bb-sign/edge-api/src/main/resources/application.yml (lines read at v0.37.0, 4ec7d3f0),
 * `prod` = bb-infrastructure/apps/bb-sign/edge-api.yaml (origin/main; production runs edge-api v0.37.0, `prod:29`).
 */

import { fact } from './fact';

// ------------------------------------------------------------ webhooks ---

export type WebhookEventType =
  | 'envelope.sent'
  | 'envelope.completed'
  | 'envelope.cancelled'
  | 'envelope.expired'
  | 'signer.signed'
  | 'signer.viewed'
  | 'envelope.evidence_issued'
  | 'document.restored';

/** The eight event types. Source: EA/domain/webhook/WebhookEventType.kt:4-6,25-41. Receivers must ignore types they do not know. */
export const WEBHOOK_EVENTS: readonly WebhookEventType[] = [
  'envelope.sent',
  'envelope.completed',
  'envelope.cancelled',
  'envelope.expired',
  'signer.signed',
  'signer.viewed',
  'envelope.evidence_issued',
  'document.restored',
];

export const WEBHOOKS = {
  signatureHeader: fact('X-BBSign-Signature', 'bb-sign/docs/api/webhook-signature-spec.md:17-19 (§1)'),
  eventIdHeader: fact('X-BBSign-Event-Id', 'bb-sign/docs/api/webhook-signature-spec.md:17-19 (§1)'),
  eventTypeHeader: fact('X-BBSign-Event-Type', 'bb-sign/docs/api/webhook-signature-spec.md:17-19 (§1)'),
  /** Seconds of clock skew a verifier accepts. */
  toleranceSeconds: fact(300, 'bb-sign/docs/api/webhook-signature-spec.md:79 (§4)'),
  retryLadder: fact(['1m', '5m', '30m', '2h', '12h'] as const, 'EA/infrastructure/webhook/WebhookDispatchProperties.kt:30'),
  retryJitterPct: fact(20, 'EA/infrastructure/webhook/WebhookDispatchProperties.kt:31 (0.2)'),
  /** Approximate span of the whole ladder, in hours. */
  retryLadderHoursApprox: fact(15, 'bb-sign/docs/api/webhooks.md:197'),
  /** Consecutive exhausted ladders before the endpoint is disabled. */
  disableAfterLadders: fact(3, 'EA/infrastructure/webhook/WebhookDispatchProperties.kt:32'),
  /** Hours between automatic probes of a disabled endpoint. */
  probeIntervalHours: fact(6, 'EA/infrastructure/webhook/WebhookDispatchProperties.kt:33'),
  maxPerOrg: fact(20, 'bb-sign/edge-api/src/main/resources/application.yml:383'),
  secretRotationGraceHours: fact(24, 'bb-sign/edge-api/src/main/resources/application.yml:384'),
  deliveryLogRetentionDays: fact(90, 'EA/infrastructure/webhook/WebhookDispatchProperties.kt:34'),
  testVectorCount: fact(16, 'bb-sign/docs/api/webhook-signature-vectors.json (cases: 16)'),
  /** `envelope.completed` is sent once per envelope and subscription, on the first of: certificate issued, the degraded wait, FAILED, UNAVAILABLE. */
  completionNoticeOncePerSubscription: fact(true, 'bb-sign/docs/api/webhook-signature-spec.md:332-370 (P3a)'),
  /** Payloads carry API paths (`documentsPath`, `downloadPath`), never download URLs. */
  payloadCarriesPathsNotUrls: fact(true, 'bb-sign/docs/api/webhook-signature-spec.md:300,368-369'),
} as const;

export type DeliveryStatus = 'PENDING_RENDER' | 'PENDING_SEND' | 'DELIVERED' | 'FAILED_PERMANENT' | 'SKIPPED' | 'DEAD_LETTERED';
/** Source: bb-sign/edge-api/src/main/resources/db/migration/V028__webhook_delivery.sql:82. */
export const DELIVERY_STATUSES: readonly DeliveryStatus[] = ['PENDING_RENDER', 'PENDING_SEND', 'DELIVERED', 'FAILED_PERMANENT', 'SKIPPED', 'DEAD_LETTERED'];

// -------------------------------------------------------------- errors ---

export interface ErrorCodeFact {
  readonly code: string;
  readonly status: number;
  /** Where the code is returned. */
  readonly where: string;
  readonly source: string;
}

/**
 * The `code` values added since v0.15 and the ones a reader meets most, with their HTTP status. The OpenAPI document
 * does not enumerate codes, and it describes every 429 as a quota (an upstream gap, report 4 §1.2): pages use this list.
 */
export const ERROR_CODES: readonly ErrorCodeFact[] = [
  { code: 'QUOTA_EXCEEDED', status: 429, where: 'envelope creation and send, when an organization quota is exhausted', source: 'bb-sign/platform/starters/starter-web-errors/.../GlobalExceptionHandler.kt:64-69' },
  { code: 'RATE_LIMITED', status: 429, where: 'verify by file, signer restore, audit chain verification and audit export, and the sign call (with Retry-After)', source: 'EA/presentation/VerifyFileExceptionHandler.kt:33-36,61; EA/domain/restore/RestoreRefusals.kt:23; EA/presentation/AuditReadExceptionHandler.kt:53-70; EA/presentation/admin/AuditReadController.kt:95,131,146-151; EA/presentation/SigningImageExceptionHandler.kt:33,60-65; EA/infrastructure/ratelimit/InMemorySignRequestThrottle.kt:94-97,137; EA/infrastructure/ratelimit/InMemorySignatureImageThrottle.kt:81-93' },
  { code: 'RESTORE_LIMIT_REACHED', status: 429, where: 'envelope document restore, when the organization has too many restores in progress', source: 'EA/domain/restore/RestoreRefusals.kt:19; EA/presentation/RestoreExceptionHandler.kt:34' },
  { code: 'VERIFY_TIMEOUT', status: 408, where: 'verify by file, when the upload takes longer than the deadline', source: 'EA/presentation/VerifyFileExceptionHandler.kt:40-44,62' },
  { code: 'PAYLOAD_TOO_LARGE', status: 413, where: 'verify by file and the sign call, above the body size limit', source: 'EA/presentation/VerifyFileExceptionHandler.kt:48; EA/presentation/SigningImageExceptionHandler.kt:31,50-53' },
  { code: 'AUDIT_EXPORT_TOO_LARGE', status: 413, where: 'audit export above the row limit (page with fromSeq and limit)', source: 'EA/presentation/admin/AuditReadController.kt:114' },
  { code: 'DOCUMENT_DELETED', status: 410, where: 'restores, once the file has passed its retention', source: 'EA/domain/restore/RestoreRefusals.kt:15; EA/presentation/RestoreExceptionHandler.kt:33' },
  { code: 'DOCUMENT_NOT_SIGNED', status: 409, where: 'restore of a signed file that does not exist', source: 'EA/domain/restore/RestoreRefusals.kt:12; EA/presentation/RestoreExceptionHandler.kt:32' },
  { code: 'ARCHIVAL_STORAGE_UNAVAILABLE', status: 503, where: 'restores, when the archive storage does not answer', source: 'EA/domain/restore/RestoreRefusals.kt:27; EA/presentation/RestoreExceptionHandler.kt:35' },
  { code: 'SERVICE_UNAVAILABLE', status: 503, where: 'audit read and export, when the audit service does not answer', source: 'EA/presentation/AuditReadExceptionHandler.kt:26,37-43' },
  { code: 'ENVELOPE_NOT_COMPLETED', status: 409, where: 'evidence certificate status or download before completion', source: 'EA/presentation/EvidenceExceptionHandler.kt:34,63' },
  { code: 'EVIDENCE_NOT_AVAILABLE', status: 409, where: 'evidence certificate download when it is not ISSUED', source: 'EA/presentation/EvidenceExceptionHandler.kt:30,62' },
  { code: 'DOCUMENT_HASH_MISMATCH', status: 409, where: 'signing with documentHashes that no longer match the documents', source: 'EA/presentation/DocumentExceptionHandler.kt:47-51,68' },
  { code: 'DOCUMENT_HASH_MISSING', status: 409, where: 'send (or sign) while a document has no recorded SHA-256', source: 'EA/presentation/DocumentExceptionHandler.kt:41-45,67; EA/application/usecase/SendEnvelopeUseCase.kt:50-51' },
  // POST /api/v1/sign/{token}/sign, since bb-sign v0.37.0 (#298, #292).
  { code: 'SIGNATURE_IMAGE_INVALID', status: 400, where: 'the sign call, when signatureImage is not a PNG data URL the server accepts', source: 'EA/presentation/SigningImageExceptionHandler.kt:29,44-47,84; EA/presentation/signer/SigningController.kt:519-529' },
  { code: 'SIGNATURE_IMAGE_TOO_LARGE', status: 400, where: 'the sign call, when the PNG is over the byte or pixel limits', source: 'EA/presentation/SigningImageExceptionHandler.kt:30,44-47,85; EA/presentation/signer/SigningController.kt:519-529' },
  { code: 'SIGNATURE_METHOD_INVALID', status: 400, where: 'the sign call, when signatureMethod is not DRAWN, TYPED or UPLOADED_IMAGE', source: 'EA/presentation/SigningExceptionHandler.kt:23,30-32,49; EA/domain/signature/SigningErrors.kt:9-10; EA/application/usecase/SubmitSignatureUseCase.kt:29,79-81; EA/presentation/signer/SigningController.kt:531-537' },
  { code: 'SIGNATURE_UPLOAD_TIMEOUT', status: 408, where: 'the sign call, when the body arrives too slowly; a client that stops sending entirely gets a bare 408 or an empty 401 instead', source: 'EA/presentation/SigningImageExceptionHandler.kt:32,55-58,86; EA/infrastructure/web/SignRequestBodyLimitFilter.kt:53-57' },
  { code: 'OTP_VERIFICATION_EXPIRED', status: 409, where: 'the sign call, when the signer verified the code more than OTP.verifiedValidityMinutes ago', source: 'EA/presentation/SigningExceptionHandler.kt:24,34-36,50; EA/domain/signature/SigningErrors.kt:12-17; EA/domain/signature/SigningEligibility.kt:72,103' },
  { code: 'SIGNING_BUSY', status: 503, where: 'the sign call, when bb-sign is at capacity for signatures (Retry-After: 1)', source: 'EA/presentation/SigningImageExceptionHandler.kt:34,67-71,88; EA/infrastructure/ratelimit/InMemorySignatureImageThrottle.kt:107-114; EA/infrastructure/web/SignRequestBodyLimitFilter.kt:124,130,136; EA/infrastructure/ratelimit/InMemorySignRequestThrottle.kt:86' },
];

// -------------------------------------------------------- sign request ---

/**
 * Server limits of `POST /api/v1/sign/{token}/sign` (bb-sign#298). Production sets no `APP_SIGN_*` or
 * `SIGNATURE_IMAGE_*` variable (prod), so the yml defaults apply. The client-side upload limits are
 * `SIGNATURE_UPLOAD` in `sign.ts`.
 */
export const SIGN_REQUEST = {
  /** 1,048,576 bytes. */
  maxPngMib: fact(1, 'yml:259 (max-png-bytes 1048576); EA/presentation/signer/SigningController.kt:521'),
  /** 1,572,864 bytes: the longest accepted image as base64 plus 64 KiB of JSON. */
  maxBodyMib: fact(1.5, 'yml:248-250 (max-body-bytes 1572864); EA/presentation/signer/SigningController.kt:525'),
  /** The minimum body cap the server's own rule allows for maxPngMib (yml:248-249). */
  minBodyBytesForPng: fact(1_463_662, 'yml:248-249 (">= 1,463,662 for the 1 MiB default")'),
  /** The `Retry-After` of a 503 SIGNING_BUSY. */
  busyRetryAfterSeconds: fact(1, 'EA/domain/signature/SignatureImageErrors.kt:46-51 (RETRY_AFTER_SECONDS); EA/presentation/SigningImageExceptionHandler.kt:67-71'),
  maxSeconds: fact(30, 'yml:251 (max-body-seconds, checked after every read); EA/infrastructure/web/SignRequestBodyLimitFilter.kt:53-57'),
} as const;

// ---------------------------------------------------------- rate limits ---

/** The rate limits that exist. There is still no general API rate limit (NOT_SHIPPED). */
export const RATE_LIMITS = {
  verifyFilePerMinutePerClient: fact(10, 'bb-infrastructure/apps/bb-sign/edge-api.yaml:58; yml:235'),
  /** Per caller, one budget shared by the two typed audit routes in `auditReadThrottledRoutes`. */
  auditReadPerMinutePerCaller: fact(
    20,
    'EA/infrastructure/ratelimit/InMemoryAuditReadThrottle.kt:22-23; EA/presentation/admin/AuditReadController.kt:76-80,95,109,131,146-151',
  ),
  /**
   * Only `GET /api/v1/audit/envelopes/{id}/verification` and `/export` are throttled. `/events` and every other
   * envelope audit route go through the proxy, which has no throttle.
   */
  auditReadThrottledRoutes: fact(
    ['verification', 'export'] as const,
    'EA/presentation/admin/AuditReadController.kt:88-95,120-131,146-151; EA/presentation/AuditProxyController.kt:47-51,129-145 (TYPED_AUDIT_SEGMENTS; the proxy calls no throttle)',
  ),
  signerRestorePerLink: fact(5, 'bb-sign/edge-api/src/main/resources/application.yml:299 (5/PT10M); InMemorySignerRestoreThrottle.kt:25'),
  signerRestorePerIp: fact(20, 'bb-sign/edge-api/src/main/resources/application.yml:300 (20/PT10M); InMemorySignerRestoreThrottle.kt:26'),
  /** The window of both signer restore limits. */
  signerRestoreWindowMinutes: fact(10, 'bb-sign/edge-api/src/main/resources/application.yml:299-300 (PT10M)'),
  agreementPublishesPerDayPerType: fact(10, 'bb-sign/edge-api/src/main/resources/application.yml:124'),
  /**
   * The sign call (`POST /api/v1/sign/{token}/sign`). In memory, per task (yml:240): one number holds because
   * production runs one replica (prod:18). Re-read when the replica count changes.
   */
  signPerMinutePerClient: fact(30, 'yml:242 (per client key: IPv4, or IPv6 /64); EA/infrastructure/ratelimit/InMemorySignRequestThrottle.kt:94-95; no APP_SIGN_* in prod; prod:18 (replicas: 1)'),
  signInFlightPerClient: fact(2, 'yml:243; EA/infrastructure/ratelimit/InMemorySignRequestThrottle.kt:97,137 (Retry-After 1 s); no APP_SIGN_* in prod; prod:18 (replicas: 1)'),
  /** Image attempts on one link that were refused, or are still being checked (a slot is reserved before the check). */
  signImageAttemptsPerLink: fact(5, 'yml:245 (5/PT10M); EA/infrastructure/ratelimit/InMemorySignatureImageThrottle.kt:21-24,81-105; no APP_SIGN_* in prod; prod:18 (replicas: 1)'),
  signImageAttemptsWindowMinutes: fact(10, 'yml:245 (PT10M); EA/infrastructure/ratelimit/InMemorySignatureImageThrottle.kt:86-89'),
} as const;

// ----------------------------------------------------------------- sdk ---

export const SDK = {
  js: {
    packageName: fact('@binarybridges/bb-sign-sdk', 'bb-sign/sdk-js/package.json:2'),
    version: fact('0.1.0', 'bb-sign/sdk-js/package.json:3'),
    tarball: fact('binarybridges-bb-sign-sdk-0.1.0.tgz', 'bb-sign/sdk-js/README.md "Installing"'),
    minNode: fact(20, 'bb-sign/sdk-js/package.json:10 (engines)'),
    webhookSubpath: fact('@binarybridges/bb-sign-sdk/webhooks', 'bb-sign/sdk-js/package.json:18 (exports)'),
  },
  java: {
    groupId: fact('co.binarybridges.sign', 'bb-sign/sdk-java/pom.xml:21'),
    artifactId: fact('bb-sign-sdk-java', 'bb-sign/sdk-java/pom.xml:22'),
    version: fact('0.1.0-SNAPSHOT', 'bb-sign/sdk-java/pom.xml:24'),
    minJava: fact(17, 'bb-sign/sdk-java/pom.xml:36 (maven.compiler.release)'),
    /** A runtime dependency of the jar (the client's ObjectMapper registers JavaTimeModule): add it next to the jar. */
    jsr310Dependency: fact(
      'com.fasterxml.jackson.datatype:jackson-datatype-jsr310',
      'bb-sign/sdk-java/pom.xml:83-87 (default compile scope); bb-sign/sdk-java/.../BbSignClient.java:10,239-241 (registerModule(new JavaTimeModule()))',
    ),
    jacksonVersion: fact('2.17.2', 'bb-sign/sdk-java/pom.xml:53 (jackson.version), used by jackson-databind and jackson-datatype-jsr310 at :78-87'),
  },
  /** The client facades in both SDKs. */
  facadeAccessors: fact(['envelopes', 'documents', 'verification'] as const, 'bb-sign/sdk-js/src/index.ts:157-160,271-273; bb-sign/sdk-java/.../BbSignClient.java:69-79'),
  /** Generated but not reachable from the client: call these over plain HTTP with the token. */
  notOnFacade: fact(
    ['evidence certificate', 'GET /workspaces', 'agreement copies'] as const,
    'bb-sign/sdk-js/package.json exports (only . and ./webhooks); bb-sign/sdk-js/src/index.ts:1-9; bb-sign/sdk-java/.../BbSignClient.java:69-79',
  ),
  /** Both SDKs retry 429 and 503 on any method with their own exponential backoff from this base. */
  retryBaseMs: fact(250, 'bb-sign/sdk-java/.../RetryInterceptor.java:49; bb-sign/sdk-js/src/index.ts:43'),
  retryMaxBackoffMs: fact(8000, 'bb-sign/sdk-java/.../RetryInterceptor.java:50; bb-sign/sdk-js/src/index.ts:44'),
  /** The backoff ignores the value of Retry-After. */
  honoursRetryAfter: fact(false, 'bb-sign/sdk-java/.../RetryInterceptor.java:105-121; bb-sign/sdk-js/src/index.ts:139-150'),
  /** Java: an unknown webhook type parses to UNKNOWN_DEFAULT_OPEN_API (builds before this change throw). */
  /**
   * SDK errors carry the HTTP status and an SDK-written message only: never the response body nor its `code`.
   * To branch on `code`, call that endpoint over plain HTTP.
   */
  errorCarriesStatusOnly: fact(
    true,
    'bb-sign/sdk-java/.../BbSignException.java:3-34; bb-sign/sdk-java/.../BbSignClient.java:102-106; bb-sign/sdk-js/src/errors.ts:14-23; bb-sign/sdk-js/src/index.ts:176-178,256-263',
  ),
  /**
   * A defect (bb-sign#281): Java `verification().verifyDocumentFile(File)` sends the file's path as a JSON string, not
   * its bytes, so the answer never matches. Call `POST /api/v1/verify/file` over plain HTTP until the fix ships.
   */
  javaVerifyFileSendsPath: fact(
    true,
    'bb-sign/sdk-java/.../generated/api/VerifyControllerApi.java:43-48 (@Body File with Content-Type application/octet-stream); bb-sign/sdk-java/.../BbSignClient.java:316-317 (Scalars, then Jackson, which writes a java.io.File as its path); bb-sign#281',
  ),
  javaUnknownEnumTolerant: fact(true, 'bb-sign/sdk-java/pom.xml:168-174 (enumUnknownDefaultCase=true); bb-sign/sdk-java/CHANGELOG.md Unreleased; UnknownEnumToleranceTest.java'),
} as const;
