/**
 * The bb-sign fact sheet: every number, limit, default and behaviour the
 * documentation states, each with the line in bb-sign (or bb-infrastructure)
 * it was read from. Pages import these values; prose never types them.
 *
 * Re-verified on 2026-10-20 against bb-sign `main` 114de38 (v0.34.2: v0.34.0 + the
 * v0.34.1 frontend fix + bb-sign#276, legal texts Versión 4 without the review banner), and
 * bb-infrastructure `main` (5a8468f, production runs bb-sign v0.34.0). The live
 * S3 lifecycle of the documents bucket was read on 2026-10-21T00:02Z
 * (`aws s3api get-bucket-lifecycle-configuration --bucket production-bbsign-documents`).
 * SIGNATURE_UPLOAD, SIGNER.signatureMethods and OTP.verifiedValidityMinutes were read on 2026-10-28 at the
 * bb-sign release tag v0.37.0 (1ef08008: bb-sign#298 and #292).
 * When a value moves in the product, change it here and the whole site follows.
 * `tests/unit/facts.test.ts` checks the relationships between values (an OTP
 * outlives its resend cooldown, the retention outlives the archive threshold,
 * and so on).
 *
 * Source shorthands: `EA` = bb-sign/edge-api/src/main/kotlin/co/binarybridges/sign/edge,
 * `W` = bb-sign/document-processing-worker/.../documentprocessing,
 * `NS` = bb-sign/notification-service/.../notification, `yml` = bb-sign/edge-api/src/main/resources/application.yml,
 * `prod` = bb-infrastructure/apps/bb-sign/edge-api.yaml.
 *
 * Two layers are kept apart on purpose:
 *   - RETENTION_POLICY is the binding service term (terms §3, code constants in `Retention.kt`).
 *   - RETENTION_IMPLEMENTED is what production does today (plan decision D1: production wins over
 *     declared templates).
 * Pages say "policy" for the first and "today" for the second, and never
 * claim the second does what only the first promises.
 *
 * Integration facts (webhooks, error codes, rate limits, SDKs) live in `sign-integrations.ts` and are
 * re-exported from here, so every page imports from `facts/sign` alone. Facts completed on 2026-10-20
 * against bb-sign `main` 114de38 (v0.34.2 release branch) and bb-infrastructure `main` 5a8468f.
 *
 * A fact rendered with `<Fact>` must read the same in both locales: numbers, dates, code, paths, formulas.
 * Wording that differs per language lives in the page, or in an `Es`/`En` pair of facts.
 */

import { fact } from './fact';
import { RATE_LIMITS, WEBHOOKS } from './sign-integrations';

export type { Fact } from './fact';
export * from './sign-integrations';

const LIVE_LIFECYCLE_READ =
  'live read 2026-10-21T00:02Z: aws s3api get-bucket-lifecycle-configuration --bucket production-bbsign-documents (one rule, Expiration 365 d, prefix "", no transitions); bb-infrastructure/docs/runbooks/documents-lifecycle-guard.md:8-17';

// ---------------------------------------------------------------- urls ---

export const URLS = {
  app: fact('https://sign.binarybridges.co', 'bb-infrastructure/README.md domains table'),
  api: fact('https://sign-api.binarybridges.co', 'bb-infrastructure/apps/bb-sign/ingress.yaml:14-23'),
  tokenUrl: fact(
    'https://auth.binarybridges.co/realms/bbsign/protocol/openid-connect/token',
    'bb-infrastructure/apps/bb-sign/ingress.yaml; bb-sign/docs/api/machine-authentication.md §2',
  ),
  /** springdoc default path; the published paths are filtered at yml:403. */
  openapiPath: fact('/v3/api-docs', 'bb-sign/edge-api/src/main/resources/application.yml:381-409 (springdoc default /v3/api-docs; paths-to-match :403)'),
  senderAddress: fact('sign@binarybridges.co', 'bb-infrastructure/aws/bb-sign-aws.yml:37'),
  identitySenderAddress: fact('no-reply@binarybridges.co', 'bb-infrastructure/aws/bb-sign-aws.yml:42'),
  /** Public verification page of the app (QR target and "Comprobar un archivo"). */
  verifyPath: fact('/verify', 'bb-sign/frontend/src/App.tsx (route /verify); bb-sign/frontend/src/pages/VerifySignature.tsx'),
} as const;

// ---------------------------------------------------------------- auth ---

export const AUTH = {
  /** Access-token lifetime in seconds; tokens are validated against the JWKS with no introspection. */
  tokenLifetimeSeconds: fact(300, 'bb-infrastructure/apps/platform/configs/keycloak/bbsign-realm.json:4; kc-init.sh:531'),
  /** Active API credentials per organisation. */
  maxCredentialsPerOrg: fact(10, 'EA/infrastructure/keycloak/KeycloakApiCredentialAdapter.kt:49'),
  /** Days a revoked credential stays listed. */
  revokedCredentialListedDays: fact(90, 'EA/infrastructure/keycloak/KeycloakApiCredentialAdapter.kt:50'),
  /** Invitation link validity in hours. */
  invitationLinkHours: fact(72, 'bb-sign/edge-api/src/main/resources/application.yml:172 (259200 s)'),
  /** Workspace memberships per user or API key. */
  maxWorkspaceMembershipsPerPrincipal: fact(50, 'bb-sign/edge-api/src/main/resources/application.yml:143'),
  /** The `iss` every token must carry; edge-api refuses to start without it and answers 401 to any other issuer. */
  expectedIssuer: fact(
    'https://auth.binarybridges.co/realms/bbsign',
    'bb-sign/edge-api/src/main/resources/application.yml:84; bb-infrastructure/apps/bb-sign/common-config.yaml:19',
  ),
  /** Only `client_credentials` is accepted for machines; the password grant (ROPC) is off on every client. */
  passwordGrantDisabled: fact(
    true,
    'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:239,378,591,638; bbsign-realm.json:118,178 (directAccessGrantsEnabled false)',
  ),
  passwordMinLength: fact(12, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:662 (length(12))'),
  passwordMaxLength: fact(128, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:662 (maxLength(128))'),
  /** A new password may not repeat this many previous ones; it may not be the username or the email either. */
  passwordHistory: fact(5, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:662 (passwordHistory(5), notUsername, notEmail)'),
  /** Sign-in failures before Keycloak starts making the account wait. Temporary waits only, never a permanent lockout. */
  bruteForceFailures: fact(10, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:658-659 (failureFactor=10, permanentLockout=false)'),
  bruteForceWaitIncrementSeconds: fact(60, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:659 (waitIncrementSeconds=60)'),
  bruteForceMaxWaitSeconds: fact(900, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:659 (maxFailureWaitSeconds=900)'),
  /** The wait is the same 15 minutes, expressed for non-technical pages. `facts.test.ts` keeps the two equal. */
  bruteForceMaxWaitMinutes: fact(15, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:659 (900 s)'),
  bruteForceResetHours: fact(12, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:660 (maxDeltaTimeSeconds=43200)'),
  /**
   * The actions an invitation link carries. The person opens the link, continues, and the first form is the new
   * password; the link itself proves the email. CONFIGURE_TOTP is added only for a role that requires admin MFA, and
   * enrolment happens before the app opens. Pages never promise a separate email-verification step or an order beyond
   * "password first".
   */
  invitationActions: fact(
    ['UPDATE_PASSWORD', 'VERIFY_EMAIL', 'CONFIGURE_TOTP'] as const,
    'EA/presentation/admin/UserController.kt:85-91,136,187-189; bb-sign/e2e/playwright/tests/18-user-invitation.spec.ts:227-235 (proceed, then the password form); 58-admin-mfa-invitation.serial.spec.ts:38-52 (enrolment before the app)',
  ),
} as const;

/** Second factor for administrators (bb-sign#184 P6). Members and signers are never asked for it. */
export const ADMIN_MFA = {
  roles: fact(['platform_admin', 'org_admin'] as const, 'bb-infrastructure/apps/platform/keycloak.yaml:73 (KC_MFA_REQUIRED_ROLES)'),
  method: fact('TOTP (authenticator app)', 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:663 (otpPolicyType=totp)'),
  digits: fact(6, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:663 (otpPolicyDigits=6)'),
  periodSeconds: fact(30, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:663 (otpPolicyPeriod=30)'),
  codeReusable: fact(false, 'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:664 (otpPolicyCodeReusable=false)'),
  /** Where the code is asked: every interactive sign-in, the first sign-in after an invitation (enrolment), and after a password reset. */
  appliesTo: fact(
    'sign-in, first sign-in after an invitation (enrolment), password reset',
    'bb-infrastructure/apps/platform/configs/keycloak/kc-init.sh:726-743, :270-271 (CONFIGURE_TOTP); keycloak.yaml:70-73',
  ),
  /** Title of the authenticator set-up screen, per locale (production theme). */
  enrolmentTitleEs: fact(
    'Autenticación de dos factores',
    'bb-infrastructure/apps/platform/configs/keycloak/themes/bbsign/login/messages/messages_es.properties:14 (loginTotpTitle); login-config-totp.ftl:16; bb-infrastructure/apps/platform/keycloak.yaml:91,103; kustomization.yaml:62-65',
  ),
  enrolmentTitleEn: fact(
    'Two-factor authentication',
    'bb-infrastructure/apps/platform/configs/keycloak/themes/bbsign/login/messages/messages_en.properties:13 (loginTotpTitle); login-config-totp.ftl:16; bb-infrastructure/apps/platform/keycloak.yaml:91,103; kustomization.yaml:62-65',
  ),
  /** A lost authenticator: platform staff verify the person out of band, remove the second factor and require a new enrolment. */
  lostAuthenticatorResetBySupport: fact(true, 'bb-infrastructure/docs/runbooks/keycloak-hardening.md:157-160 (verify out of band; delete the otp credential; requiredActions CONFIGURE_TOTP)'),
  /** A password reset keeps the second factor: it never removes the authenticator. */
  passwordResetClearsSecondFactor: fact(false, 'bb-infrastructure/docs/runbooks/keycloak-hardening.md:157 ("a password reset no longer clears OTP")'),
} as const;

export type OrgRole = 'platform_admin' | 'org_admin' | 'org_member' | 'org_api';
export type WorkspaceRole = 'viewer' | 'auditor' | 'contributor' | 'manager';

export const ORG_ROLES: readonly OrgRole[] = ['platform_admin', 'org_admin', 'org_member', 'org_api'];
export const WORKSPACE_ROLES: readonly WorkspaceRole[] = ['viewer', 'auditor', 'contributor', 'manager'];

/** Org-scope permissions and who holds them. Source: EA/domain/security/PermissionCatalog.kt:53-71 and bb-sign/infrastructure/configs/keycloak/permission-catalog.txt. */
export const ORG_PERMISSIONS: readonly { readonly key: string; readonly holders: readonly OrgRole[] }[] = [
  { key: 'audit:read-org', holders: ['platform_admin', 'org_admin'] },
  { key: 'label:read', holders: ['platform_admin', 'org_admin', 'org_member', 'org_api'] },
  { key: 'label:manage', holders: ['platform_admin', 'org_admin'] },
  { key: 'credential:manage', holders: ['platform_admin', 'org_admin'] },
  { key: 'webhook:manage', holders: ['platform_admin', 'org_admin'] },
  { key: 'workspace:read', holders: ['platform_admin', 'org_admin', 'org_member', 'org_api'] },
  { key: 'workspace:manage', holders: ['platform_admin', 'org_admin'] },
  { key: 'workspace:manage-members', holders: ['platform_admin', 'org_admin'] },
  { key: 'workspace:access-all', holders: ['platform_admin', 'org_admin'] },
  { key: 'agreement:read', holders: ['platform_admin', 'org_admin', 'org_member', 'org_api'] },
  { key: 'agreement:manage', holders: ['platform_admin', 'org_admin'] },
];

/** Workspace-scope permissions per workspace role. Source: EA/domain/security/WorkspaceRoleBundles.kt:29-33. */
export const WORKSPACE_PERMISSIONS: readonly { readonly key: string; readonly roles: readonly WorkspaceRole[] }[] = [
  { key: 'envelope:read', roles: ['viewer', 'auditor', 'contributor', 'manager'] },
  { key: 'archive:read', roles: ['viewer', 'auditor', 'contributor', 'manager'] },
  { key: 'audit:read', roles: ['auditor', 'contributor', 'manager'] },
  { key: 'document:download', roles: ['auditor', 'contributor', 'manager'] },
  { key: 'envelope:create', roles: ['contributor', 'manager'] },
  { key: 'envelope:update', roles: ['contributor', 'manager'] },
  { key: 'document:upload', roles: ['contributor', 'manager'] },
  { key: 'label:assign', roles: ['contributor', 'manager'] },
  { key: 'envelope:send', roles: ['contributor', 'manager'] },
  { key: 'envelope:cancel', roles: ['manager'] },
];

/** Permissions a machine credential can never hold. Source: EA/domain/security/PermissionCatalog.kt:82-90 (ESCALATION_GUARDS). */
export const ORG_API_NEVER: readonly string[] = [
  'credential:manage',
  'webhook:manage',
  'workspace:manage',
  'workspace:manage-members',
  'workspace:access-all',
  'agreement:manage',
];

/**
 * What the workspace permissions unlock beyond their name (for the roles pages):
 * `document:download` also gives the evidence certificate and restore requests, and
 * `audit:read` also the audit API for an envelope.
 */
export const PERMISSION_SCOPE = {
  downloadCoversEvidenceAndRestore: fact(
    true,
    'EA/presentation/admin/EnvelopeController.kt:294,577-591; EA/presentation/admin/EvidenceCertificateController.kt:37-45; bb-sign/frontend/src/i18n/locales/es/envelopes.json:94',
  ),
  auditReadCoversAuditApi: fact(
    true,
    'EA/presentation/admin/AuditReadController.kt:86-150; bb-sign/docs/api/machine-authentication.md:104,108-126',
  ),
  /** An API key reads archived envelopes through the normal routes with `archive:read`; without it an archived id is 404. */
  archivedEnvelopesReadableByApi: fact(true, 'bb-sign/docs/api/machine-authentication.md:108-126'),
} as const;

// ---------------------------------------------------------- agreements ---

/**
 * Agreements (Settings, tab "Acuerdos"): the tab exists for every `agreement:read` holder, but in production
 * nothing reaches signers (plan decision D4). Pages say exactly that, once, and never describe signer acceptance.
 */
export const AGREEMENTS = {
  /** Copies are pinned to envelopes at send only when this is on. Off in production. */
  pinAtSendInProduction: fact(false, 'bb-infrastructure/apps/bb-sign/edge-api.yaml:64 (AGREEMENTS_PIN_AT_SEND "false"); yml:119'),
  /** The platform publishes no default text. */
  platformDefaultsSeeded: fact(false, 'bb-infrastructure/apps/bb-sign/edge-api.yaml:68 (AGREEMENTS_SEED_PLATFORM_DEFAULTS "false"); yml:116'),
  /** Every published copy is permanent. */
  copyLockYears: fact(10, 'EA/agreement/application/AgreementPublishUseCase.kt:37 (GOVERNANCE Object Lock for 10 years); yml:122-123'),
  maxPublishesPerDayPerType: fact(10, 'bb-sign/edge-api/src/main/resources/application.yml:124'),
  /** The Settings tab is shown to every holder of `agreement:read` (all four org roles). */
  tabVisibleTo: fact('agreement:read', 'bb-sign/frontend/src/pages/Settings.tsx:32-36; EA/domain/security/PermissionCatalog.kt:59,67,71'),
} as const;

// ------------------------------------------------------------ envelope ---

export type EnvelopeStatus = 'DRAFT' | 'SENT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type SignerStatus = 'PENDING' | 'NOTIFIED' | 'VIEWED' | 'SIGNED';

export const ENVELOPE_STATUSES: readonly EnvelopeStatus[] = ['DRAFT', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
export const SIGNER_STATUSES: readonly SignerStatus[] = ['PENDING', 'NOTIFIED', 'VIEWED', 'SIGNED'];

/** Allowed transitions. Source: EA/application/usecase/SendEnvelopeUseCase.kt:40,77; RecordSignatureUseCase.kt:154,169-172,240-243; CancelEnvelopeUseCase.kt:31,39; ExpireEnvelopesUseCase.kt:38-43. */
export const ENVELOPE_TRANSITIONS: readonly { readonly from: EnvelopeStatus; readonly to: EnvelopeStatus; readonly by: string }[] = [
  { from: 'DRAFT', to: 'SENT', by: 'send' },
  { from: 'SENT', to: 'IN_PROGRESS', by: 'first signature' },
  { from: 'IN_PROGRESS', to: 'COMPLETED', by: 'last signature' },
  { from: 'SENT', to: 'COMPLETED', by: 'only signature' },
  { from: 'DRAFT', to: 'CANCELLED', by: 'cancel' },
  { from: 'SENT', to: 'CANCELLED', by: 'cancel' },
  { from: 'IN_PROGRESS', to: 'CANCELLED', by: 'cancel' },
  { from: 'SENT', to: 'EXPIRED', by: 'expiry sweep' },
  { from: 'IN_PROGRESS', to: 'EXPIRED', by: 'expiry sweep' },
];

export const ENVELOPE = {
  /** Signing-link validity in hours (`linkTtlHours`). Bounds signing only, never the signer's later access to the copy. */
  linkTtlHoursDefault: fact(72, 'EA/infrastructure/persistence/entity/EnvelopeEntity.kt:31; EA/presentation/admin/EnvelopeController.kt:124'),
  /** How often the expiry sweep runs, in minutes. */
  expirySweepMinutes: fact(5, 'bb-sign/edge-api/src/main/resources/application.yml:215-218 (cron 0 */5 * * * *)'),
  /** Presigned download URL validity in seconds (documents, envelope page and signer link). */
  downloadUrlSeconds: fact(3600, 'EA/application/service/DocumentDownloads.kt:206; RecordSignatureUseCase.kt:265; GetSignerAccessUseCase.kt:68'),
  /** Days after creation at which COMPLETED, CANCELLED and EXPIRED envelopes move to the "Archivados" view (a database move, not file archiving). */
  archiveAfterDays: fact(30, 'bb-sign/edge-api/src/main/resources/application.yml:205; EA/application/archive/ArchiveEligibility.kt:63-68'),
  /** Archive job time (UTC). */
  archiveCron: fact('02:00 UTC', 'bb-sign/edge-api/src/main/resources/application.yml:210'),
  /** A COMPLETED envelope is never archived before its signed PDFs exist; one still unstamped after this many days is held live and alerted. */
  stampHoldDays: fact(7, 'bb-sign/edge-api/src/main/resources/application.yml:207-209; EA/application/archive/ArchiveEligibility.kt:70-77'),
  /** Seconds within which repeated view-opened beacons count as one open. */
  viewDedupSeconds: fact(30, 'bb-sign/edge-api/src/main/resources/application.yml:219-223; bb-infrastructure/apps/bb-sign/edge-api.yaml:54'),
  /** Envelope list totals are capped. */
  listCountCap: fact(10000, 'EA/infrastructure/persistence/repository/EnvelopeFilterRepository.kt:41 (COUNT_CAP); bb-sign/frontend/src/i18n/locales/en/envelopes.json:52'),
} as const;

/** What an envelope in "Archivados" still offers (plan decision D2: the archived view is not file archiving). */
export const ARCHIVED_ENVELOPES = {
  /** The detail page opens read-only with every download, the evidence certificate and the audit trail. */
  readOnlyWithDownloads: fact(
    true,
    'bb-sign/frontend/src/pages/ArchivedEnvelopes.tsx:156-164; EnvelopeDetail.tsx:165,170-174; bb-sign/frontend/src/i18n/locales/es/envelopes.json:66; EA/infrastructure/persistence/JpaSignedDocumentRegistry.kt:15,30',
  ),
  /** The signer's link keeps serving the signed copy and the signer evidence certificate after archiving, with no expiry check. */
  signerLinkKeepsCopy: fact(
    true,
    'EA/application/usecase/GetSignedCopyUseCase.kt:27-53; EA/application/usecase/SignedCopyGate.kt:5-11',
  ),
  /** No labels, no cancel: an archived envelope has no actions. */
  noActions: fact(true, 'bb-sign/frontend/src/pages/EnvelopeDetail.tsx:71-74'),
} as const;

export const OTP = {
  digits: fact(6, 'bb-sign/auth-challenge-service/.../application/usecase/GenerateOtpUseCase.kt:54'),
  validitySeconds: fact(900, 'bb-sign/auth-challenge-service/src/main/resources/application.yml:52'),
  /** The same validity in minutes, for signer-facing pages. `facts.test.ts` keeps the two equal. */
  validityMinutes: fact(15, 'bb-sign/auth-challenge-service/src/main/resources/application.yml:52 (900 s)'),
  maxAttempts: fact(3, 'bb-sign/auth-challenge-service/src/main/resources/db/migration/V002__create_otp_schema.sql:10'),
  resendCooldownSeconds: fact(60, 'bb-sign/edge-api/src/main/resources/application.yml:229'),
  /**
   * Minutes a verified code stays valid for signing. Past it the sign is refused with 409 OTP_VERIFICATION_EXPIRED and
   * the signing page goes back to the code step by itself and requests a new code (bb-sign#292 D7).
   */
  verifiedValidityMinutes: fact(
    15,
    'EA/domain/signature/SigningEligibility.kt:72,103 (OTP_VALIDITY); EA/domain/signature/SigningErrors.kt:13-17; bb-sign/frontend/src/pages/SigningCeremony.tsx:481-482,435-448 (returnToOtpStep)',
  ),
  /** The schema allows 'SMS', but no SMS sender exists: email is the only channel. */
  channel: fact('email', 'NS/infrastructure/delivery/EmailOtpCodeDeliveryChannel.kt:25; V003__lv209_otp_code_hmac.sql:7,14'),
  /** Plan decision D10: a code works only for the signer it was issued to. */
  boundTo: fact('the signer it was issued to', 'bb-sign/auth-challenge-service/.../application/usecase/VerifyOtpUseCase.kt:46,56 (challenge.signerId != expectedSignerId)'),
  /** Codes are never stored in plain text. */
  storage: fact('an HMAC plus an encrypted hand-off for delivery', 'bb-sign/auth-challenge-service/.../usecase/GenerateOtpUseCase.kt:63-64; V003__lv209_otp_code_hmac.sql:1-23'),
} as const;

export type SignerAuthMethod = 'EMAIL_LINK' | 'EMAIL_LINK_OTP';

export const SIGNER = {
  /** Recorded with every signature and printed in the evidence certificate. */
  authMethods: fact(
    ['EMAIL_LINK', 'EMAIL_LINK_OTP'] as const,
    'bb-sign/platform/contracts/.../events/signer/SignerAuthMethod.kt:11-16; bb-sign/edge-api/src/main/resources/db/migration/V039__lv209_signer_auth_method.sql:2-15',
  ),
  /** What each signature records besides image, time, IP and browser. */
  recordedWithSignature: fact(
    'identification method, OTP channel and masked destination, acceptance time, SHA-256 of the document set signed',
    'bb-sign/audit-service/.../listener/SignerSignedListener.kt:38-43; bb-sign/document-processing-worker/src/main/resources/evidence/messages_es.properties:37-53',
  ),
  /** The review screen shows each document's SHA-256 shortened to its first and last this many characters; the full hash is in the tooltip. */
  fingerprintShownChars: fact(8, 'bb-sign/frontend/src/components/signing/DocumentFingerprint.tsx:4-9 (slice(0, 8) and slice(-8)), :19 (title = full hash); SigningCeremony.tsx'),
  /**
   * The three ways to make the signature mark on the signing page, in button order (bb-sign#292). The page declares
   * the one used; the certificate prints it as the signing client's declaration ("no registrado" when none was sent).
   */
  signatureMethods: fact(
    ['DRAWN', 'TYPED', 'UPLOADED_IMAGE'] as const,
    'bb-sign/platform/contracts/src/main/kotlin/co/binarybridges/sign/platform/events/signer/SignatureMethod.kt:3-17; bb-sign/frontend/src/components/signing/signMode.ts:4,12-16; W/infrastructure/evidence/render/PdfBoxEvidenceRenderer.kt:129-130; bb-sign/document-processing-worker/src/main/resources/evidence/messages_es.properties:40-43',
  ),
} as const;

/**
 * "Subir imagen" on the signing page (bb-sign#292, owner decisions D1 and D3 of 2026-10-28). Read at the bb-sign
 * release tag v0.37.0 (1ef08008, bb-sign#308 with #298 and #292). `FE` here = bb-sign/frontend/src/components/signing.
 */
export const SIGNATURE_UPLOAD = {
  /** Largest file the signer may pick. */
  maxSourceMb: fact(10, 'FE/signatureUpload.ts:12-13 (MAX_SOURCE_BYTES = 10 * 1024 * 1024), :170 (refusal "size"); bb-sign/frontend/src/i18n/locales/es/signing.json:26,86'),
  /** Above this size the page shows an informational notice that the image will be reduced. Never a refusal. */
  resizeNoticeMb: fact(1, 'FE/signatureUpload.ts:14-15 (RESIZE_NOTICE_BYTES = 1024 * 1024), :180-183; FE/SignatureUpload.tsx:129-131; bb-sign/frontend/src/i18n/locales/es/signing.json:92'),
  /** Accepted formats, judged from the file's first bytes, not its name or type. */
  formats: fact('PNG, JPEG', 'FE/signatureUpload.ts:5-6,100-104 (sniffImageType); FE/SignatureUpload.tsx:71 (accept="image/png,image/jpeg")'),
  /** "Quitar el fondo claro" starts switched on. */
  removeBackgroundDefault: fact(true, 'FE/signatureUpload.ts:401-404 (INITIAL_UPLOAD_STATE.removeBackground = true); FE/SignatureUpload.tsx:104-113'),
  /** The image is prepared in the browser; only a re-encoded PNG is sent, so location and device data (EXIF, GPS) are not kept. */
  processedOnDevice: fact(true, 'FE/signatureUpload.ts:7-9; FE/signatureCanvas.ts:35-49 (normalizeToBox, toDataURL("image/png")); FE/SignatureUpload.tsx:24-27'),
  /** No `capture` attribute on the file input, so a phone offers the camera, the photo library and files. */
  cameraOrGallery: fact(true, 'FE/SignatureUpload.tsx:29,68-77'),
} as const;

export const DOCUMENTS = {
  contentType: fact('application/pdf', 'EA/application/usecase/UploadUnassignedDocumentUseCase.kt:59'),
  maxUploadMb: fact(50, 'bb-sign/edge-api/src/main/resources/application.yml:64-65'),
  maxUnassignedPerOrgMb: fact(500, 'bb-sign/edge-api/src/main/resources/application.yml:244'),
  unassignedRetentionHours: fact(24, 'bb-sign/edge-api/src/main/resources/application.yml:245'),
  /** Text marker that positions a signer's seal; N is the signer's order. */
  placementMarker: fact('{{signerN}}', 'W/application/service/PdfPlaceholderLocator.kt:76'),
  /** The SHA-256 of every upload is computed while it streams and the storage version is pinned. */
  originalSha256Recorded: fact(
    true,
    'EA/application/usecase/UploadUnassignedDocumentUseCase.kt:111-113; bb-sign/edge-api/src/main/resources/db/migration/V035__lv211_original_sha256.sql:13-26',
  ),
  /** Send is refused with 409 DOCUMENT_HASH_MISSING while a document has no recorded SHA-256; older drafts are backfilled hourly. */
  hashBackfill: fact('hourly', 'EA/infrastructure/scheduling/DocumentHashBackfillScheduler.kt:10,18 (PT1H); SendEnvelopeUseCase.kt:50-51'),
  /** The signer is refused with DOCUMENT_HASH_MISMATCH when the documents changed while they reviewed them. */
  changedWhileReviewingRefused: fact(true, 'EA/application/usecase/RecordSignatureUseCase.kt:134-147; bb-sign/frontend/src/i18n/locales/es/signing.json:13'),
  /** The SHA-256 of each signed PDF is recorded (audit trail, webhooks, evidence certificate). */
  signedSha256Recorded: fact(true, 'bb-sign/edge-api/src/main/resources/db/migration/V036__lv211_seal_v2_signed_sha256.sql:9-27; W/application/usecase/StampSignedPdfUseCase.kt:239; EA/domain/webhook/WebhookEvent.kt:178-181'),
  /**
   * The release from which the signed SHA-256 is recorded (and seal v2 is made, VERIFY.qrUsesStoredFingerprintSince).
   * Documents signed before it have none, unless the worker later re-read them. It is v0.29.0, not v0.34.0: the
   * migration and the worker code came with cf1af3a (#257), and production runs that worker since 2026-10-16.
   */
  signedSha256Since: fact(
    'v0.29.0',
    'bb-sign/edge-api/src/main/resources/db/migration/V036__lv211_seal_v2_signed_sha256.sql:3-5 (rows before the release stay NULL); W/application/usecase/StampSignedPdfUseCase.kt:101-104,155-156 (redelivery fills older documents); first tag containing cf1af3a: v0.29.0 (GitHub release 2026-10-12); bb-infrastructure 375a475 (worker v0.29.0 in production, 2026-10-16)',
  ),
  /**
   * The worker refuses to seal when a document's stored bytes differ from its recorded SHA-256, or when the documents
   * differ from what a signer signed. No signed PDF is written; the mismatch is counted and logged.
   */
  sealRefusedOnHashMismatch: fact(
    true,
    'W/application/usecase/StampSignedPdfUseCase.kt:232-235 (stored bytes vs recorded hash), :168-176 (document set vs each signer), :143-147 (bbsign_stamp_integrity_mismatch_total, logged)',
  ),
  /** The envelope page never shows the signed SHA-256 line (a bb-sign bug, plan D7): do not promise it. */
  signedSha256OnEnvelopePage: fact(false, 'EA/presentation/admin/EnvelopeController.kt:216-229 (signedSha256 omitted from the response)'),
} as const;

export const LABELS = {
  keyNameMaxChars: fact(50, 'bb-sign/edge-api/src/main/resources/db/migration/V009__key_value_labels.sql:13 (label_keys.name)'),
  keyDescriptionMaxChars: fact(200, 'bb-sign/edge-api/src/main/resources/db/migration/V009__key_value_labels.sql:15 (label_keys.description)'),
  valueMaxChars: fact(200, 'EA/application/usecase/SetEnvelopeLabelsUseCase.kt:44'),
} as const;

export const REMINDERS = {
  /** Hours after the invitation before the first reminder. */
  thresholdHours: fact(48, 'bb-sign/notification-service/src/main/resources/application.yml:79'),
  /** Minimum hours between reminders to the same signer. */
  cooldownHours: fact(24, 'bb-sign/notification-service/src/main/resources/application.yml:80'),
  dailyRunTime: fact('09:00 UTC', 'bb-sign/notification-service/src/main/resources/application.yml:78'),
} as const;

export const QUOTA = {
  warningThresholdPct: fact(80, 'bb-sign/edge-api/src/main/resources/db/migration/V019__create_org_quotas.sql:11 (warning_threshold_pct 80)'),
  /** A quota answers 429 QUOTA_EXCEEDED. 429 is not quota-only any more: see ERROR_CODES (RATE_LIMITED, RESTORE_LIMIT_REACHED). */
  httpStatusWhenExhausted: fact(429, 'EA/application/usecase/CreateEnvelopeUseCase.kt:58-62; bb-sign/platform/starters/starter-web-errors/.../GlobalExceptionHandler.kt:64-69'),
  periodTypes: fact(['MONTHLY', 'YEARLY', 'CUSTOM'] as const, 'bb-sign/edge-api/src/main/resources/db/migration/V019__create_org_quotas.sql:6'),
} as const;

// -------------------------------------------------------------- verify ---

export const VERIFY = {
  /** "Comprobar un archivo": upload a PDF, its SHA-256 is computed on the server and matched against signed PDFs only. */
  filePath: fact('POST /api/v1/verify/file', 'EA/presentation/verify/VerifyController.kt:98,116-151; bb-sign/docs/api/openapi.json (verifyDocumentFile)'),
  fileRatePerMinute: fact(10, 'bb-infrastructure/apps/bb-sign/edge-api.yaml:58; yml:235 (per client key, fixed one-minute windows)'),
  fileMaxConcurrent: fact(4, 'bb-infrastructure/apps/bb-sign/edge-api.yaml:59; yml:236 (in flight across all clients)'),
  fileMaxSeconds: fact(30, 'bb-infrastructure/apps/bb-sign/edge-api.yaml:60; yml:237 (per-request deadline)'),
  fileMaxMb: fact(50, 'bb-infrastructure/apps/bb-sign/edge-api.yaml:61; yml:238 (52428800 bytes)'),
  /** The file is hashed and not stored. */
  fileStored: fact(false, 'EA/application/usecase/VerifyDocumentFileUseCase.kt:5-12,34-45'),
  /** Only signed PDFs match: an unsigned original never does. Archived envelopes are found too. */
  fileMatchesSignedOnly: fact(true, 'EA/application/usecase/VerifyDocumentFileUseCase.kt:34-45; EA/infrastructure/persistence/JpaSignedDocumentRegistry.kt:15,30'),
  /**
   * Seals made since this release are version 2, store the certificate fingerprint and keep verifying after a
   * certificate change. Corrected 2026-10-20: v0.29.0 (cf1af3a, #257), not v0.34.0; see DOCUMENTS.signedSha256Since.
   */
  qrUsesStoredFingerprintSince: fact(
    'v0.29.0',
    'EA/application/usecase/VerifySignatureSealUseCase.kt:49-72; bb-sign/edge-api/src/main/resources/db/migration/V036__lv211_seal_v2_signed_sha256.sql:18-23; W/application/usecase/StampSignedPdfUseCase.kt:61,194-208 (v2 by default, app.seal.v2-enabled not set in production); first tag containing cf1af3a: v0.29.0',
  ),
  /**
   * Plan decision D9 (a product defect, documented until the fix ships): the QR check reads live signers only, so the
   * QR of an envelope moved to "Archivados" answers "Firma no válida". "Comprobar un archivo" reads the archive and
   * gives the right answer. Remove this fact, and the caveat, when the bb-sign fix (VERIFY_QR_ARCHIVED_ISSUE) ships.
   */
  qrFailsForArchivedEnvelopes: fact(
    true,
    'EA/application/usecase/VerifySignatureSealUseCase.kt:40-44 (signerRepo.findByEnvelopeIdAndSealHashStartingWith, live table only); EA/infrastructure/persistence/JpaSignedDocumentRegistry.kt:15,30 (file check reads archived rows); archive threshold ENVELOPE.archiveAfterDays',
  ),
  /** `GET /verify` checks the seal record; it does not read the PDF or validate its CMS signature. */
  qrReadsPdf: fact(false, 'bb-sign/docs/api/reference.md:712'),
} as const;

/** The bb-sign issue that tracks the QR defect (D9). The lead fills the number before deploy (plan R2-5). */
export const VERIFY_QR_ARCHIVED_ISSUE: string = 'bb-sign#277';

// --------------------------------------------------------- certificate ---

export type ChainStatus = 'COMPLETE' | 'NO_ROOT' | 'LEAF_ONLY' | 'SELF_SIGNED';

export const CERTIFICATE = {
  defaultSubject: fact('CN=Binary Bridges SAS, O=Binary Bridges SAS, L=Bogota, C=CO', 'EA/infrastructure/config/GlobalCertificateBootstrap.kt:50'),
  defaultKeyBits: fact(4096, 'EA/infrastructure/config/GlobalCertificateBootstrap.kt:49'),
  defaultValidityYears: fact(10, 'EA/infrastructure/config/GlobalCertificateBootstrap.kt:52'),
  defaultDisplayName: fact('Binary Bridges SAS', 'W/application/service/CertificateResolverService.kt:16'),
  defaultReason: fact('Digital signature by bb-sign', 'W/application/service/CertificateResolverService.kt:17'),
  allowedExtensions: fact(['p12', 'pfx', 'pem'] as const, 'EA/application/usecase/UploadOrgCertificateUseCase.kt:38'),
  maxFileMb: fact(5, 'EA/application/usecase/UploadOrgCertificateUseCase.kt:39'),
  minKeyBits: fact(2048, 'EA/application/usecase/UploadOrgCertificateUseCase.kt:214'),
  requiredKeyUsage: fact('digitalSignature', 'EA/application/usecase/UploadOrgCertificateUseCase.kt:218'),
  /** Minutes the signing worker caches a resolved certificate. */
  cacheMinutes: fact(5, 'W/application/service/CertificateResolverService.kt:53-54'),
  signatureSubFilter: fact('adbe.pkcs7.detached', 'W/application/service/PdfSealer.kt:65,238'),
  signatureAlgorithm: fact('SHA256withRSA', 'W/application/service/PdfSealer.kt:229-230'),
  /** The leaf signs; every certificate of the uploaded PKCS#12 chain is added to the CMS. A reader still has to trust the root. */
  chainEmbedded: fact('full chain from the uploaded file', 'W/application/service/PdfSealer.kt:224-233 (JcaCertStore(certificateChain), addCertificates)'),
  /** A .pem upload is accepted with no warning but cannot sign. */
  pemCanSign: fact(false, 'W/application/service/Pkcs12KeyEntryReader.kt:28-31; EA/application/usecase/UploadOrgCertificateUseCase.kt:38,82'),
  /** Seals made before v0.29.0 (seal version 1). */
  sealHashFormulaV1: fact('SHA-256(name|email|date|documentId|certFingerprint)', 'bb-sign/platform/contracts/.../crypto/SealHashUtil.kt:12,40'),
  /**
   * Default for new seals since v0.29.0 (seal version 2). A formula only, the same in both locales: `<len>` is the
   * field's length in UTF-8 bytes and `signedAt` is ISO-8601 to the second; pages say so in their own language.
   */
  sealHashFormulaV2: fact(
    'SHA-256("bbsign-seal-v2\\n<len>:<name>\\n<len>:<email>\\n<len>:<signedAt>\\n<len>:<envelopeId>\\n<len>:<certFingerprint>\\n<len>:<documentSetSha256>")',
    'bb-sign/platform/contracts/.../crypto/SealHashUtil.kt:95-120; W/application/usecase/StampSignedPdfUseCase.kt:61,194-208',
  ),
  /**
   * The hash of the documents a signature is bound to. A formula only: the entries are ordered by `documentId` as a
   * lower-case string, joined by one line feed, with no trailing one; pages say so in their own language.
   */
  documentSetFormula: fact('SHA-256(join("\\n", ["<documentId>:<originalSha256>", …]))', 'bb-sign/platform/contracts/.../crypto/SealHashUtil.kt:78-93'),
  /** Days before expiry at which org admins are emailed (own certificate only; terms clause 2.4). */
  expiryNoticeDays: fact([30, 7] as const, 'bb-sign/edge-api/src/main/resources/application.yml:184; EA/domain/certificate/ExpiryNoticePolicy.kt:9-13'),
  /** Settings > Certificate highlights the expiry date (warning icon and remaining days) when fewer days than this remain. */
  expiryHighlightDays: fact(30, 'bb-sign/frontend/src/components/OrganizationCertificate.tsx:21 (EXPIRY_WARNING_DAYS), :98, :170-180'),
  expiryCheckTime: fact('13:07 UTC', 'bb-sign/edge-api/src/main/resources/application.yml:187 (0 7 13 * * *); EA/infrastructure/scheduling/CertificateExpiryScheduler.kt:20-21'),
  expiryNoticeScope: fact(
    'the organization\'s own active certificate only (never the testing certificate); every org_admin; one email per admin per threshold',
    'EA/infrastructure/persistence/JdbcCertificateExpiryNotices.kt:46; EA/presentation/admin/InternalEnvelopeController.kt:38-44; NS/application/service/CertificateExpiryEmails.kt:16-20',
  ),
  /** Chain check at upload. Older uploads show UNCHECKED in the app. */
  chainStatuses: fact(['COMPLETE', 'NO_ROOT', 'LEAF_ONLY', 'SELF_SIGNED'] as const, 'EA/domain/certificate/ChainStatus.kt:4-16; bb-sign/frontend/src/i18n/locales/en/organizations.json:104-131'),
  /** The upload is accepted with these warnings. */
  uploadWarnings: fact(['CHAIN_LEAF_ONLY', 'CHAIN_NO_ROOT', 'CHAIN_SELF_SIGNED', 'UNRELATED_CERTIFICATES'] as const, 'EA/domain/certificate/ChainStatus.kt:19-26; EA/application/usecase/UploadOrgCertificateUseCase.kt:144-147'),
  /** The upload is refused, and nothing is deactivated, for any of these. */
  uploadRefusals: fact(
    'a certificate expired or not yet valid anywhere in the chain; a broken or misordered chain; an issuer that is not a CA; more than the maximum chain length; a non-RSA key; a key that does not match the leaf; no private key or more than one',
    'EA/domain/certificate/CertificateChainInspector.kt:22-52,68-83,108; EA/application/usecase/UploadOrgCertificateUseCase.kt:84-90,163-169',
  ),
  maxChainLength: fact(10, 'EA/domain/certificate/CertificateChainInspector.kt:22,108 (MAX_CHAIN_LENGTH)'),
  /** EC, EdDSA and RSA-PSS keys are refused at upload. */
  rsaOnly: fact(true, 'EA/domain/certificate/CertificateChainInspector.kt:65-74,112; bb-sign/frontend/src/i18n/locales/es/organizations.json:84'),
  /** The testing-certificate notice in Settings says sending is not blocked. */
  testingCertificateBlocksSending: fact(false, 'bb-sign/frontend/src/i18n/locales/es/organizations.json:94-97; EA/application/usecase/SendEnvelopeUseCase.kt:40-51 (no certificate check)'),
} as const;

// ------------------------------------------------------------ evidence ---

export type EvidenceStatus = 'ISSUED' | 'PENDING' | 'FAILED' | 'UNAVAILABLE' | 'EXPIRED';

export const EVIDENCE = {
  /** A sealed PDF issued after completion: an organization copy and a signer copy, stored with a frozen audit-trail.json. */
  statuses: fact(['ISSUED', 'PENDING', 'FAILED', 'UNAVAILABLE', 'EXPIRED'] as const, 'EA/domain/evidence/EvidenceCertificate.kt:12'),
  variants: fact(['ORGANIZATION', 'SIGNER'] as const, 'EA/domain/evidence/EvidenceCertificate.kt:15; bb-sign/docs/api/evidence-certificate.md:3-33'),
  /** The signer copy masks emails and leaves out IP, browser and OTP destination. */
  signerCopyMasked: fact(true, 'bb-sign/frontend/src/components/signing/SignerEvidenceDownload.tsx:12-16; bb-sign/docs/api/evidence-certificate.md:3-33'),
  /** A signer never receives the audit trail; the certificate tells them the organization can provide it. */
  signerCopyIncludesAuditTrail: fact(
    false,
    'bb-sign/docs/api/evidence-certificate.md:90; bb-sign/document-processing-worker/src/main/resources/evidence/messages_es.properties:133, messages_en.properties:133 (evidence.verify.signerNote)',
  ),
  /** The certificate is normally issued within minutes of completion (PENDING meanwhile). No time is guaranteed. */
  usuallyIssuedWithinMinutes: fact(true, 'bb-sign/docs/api/evidence-certificate.md:30 (PENDING: "normally within minutes of completion"); bb-sign/frontend/src/i18n/locales/es/signing.json:85'),
  languages: fact(['es', 'en'] as const, 'bb-sign/platform/contracts/.../i18n/OrgLanguage.kt:16-22'),
  defaultLanguage: fact('es', 'bb-sign/platform/contracts/.../i18n/OrgLanguage.kt:22 (DEFAULT = ES)'),
  /** Set per organization by a platform admin; fixed when the certificate is issued. */
  languageSetBy: fact('platform_admin', 'EA/presentation/admin/OrganizationController.kt:117-126; bb-sign/frontend/src/pages/OrganizationDetail.tsx:137-138'),
  /** The completion notice goes out without the certificate after this wait. */
  degradedAfterHours: fact(2, 'bb-sign/edge-api/src/main/resources/application.yml:193 (PT2H)'),
  /** The wait is clamped to this, whatever the configuration. */
  degradedClampHours: fact(24, 'bb-sign/edge-api/src/main/resources/application.yml:192 (clamped to 24 h)'),
  /** Download links last this long. */
  downloadLinkSeconds: fact(300, 'EA/presentation/admin/EvidenceCertificateController.kt:124; EA/application/usecase/GetEvidenceCertificateUseCase.kt:29'),
  /** The same 5 minutes, for non-technical pages. `facts.test.ts` keeps the two equal. */
  downloadLinkMinutes: fact(5, 'EA/application/usecase/GetEvidenceCertificateUseCase.kt:29 (300 s)'),
  /** Kept from issue under a GOVERNANCE Object Lock; never moved to archive storage. */
  retentionDays: fact(365, 'W/application/evidence/IssueEvidenceCertificateUseCase.kt:155 (Retention.DAYS)'),
  archived: fact(false, 'bb-sign/platform/contracts/.../retention/Retention.kt:68,79 (RetainedFile.EVIDENCE -> null); bb-infrastructure/aws/bb-sign-aws.yml:439-441'),
  /** Same permission as the documents. */
  downloadPermission: fact('document:download', 'EA/presentation/admin/EvidenceCertificateController.kt:37-45; bb-sign/frontend/src/i18n/locales/es/envelopes.json:94'),
  /** Every download is recorded as EVIDENCE_CERTIFICATE_ACCESSED; reading the status records nothing. */
  downloadAudited: fact(true, 'EA/application/usecase/GetEvidenceCertificateUseCase.kt:29; bb-sign/audit-service/.../domain/AuditEventType.kt:75'),
  /** Platform staff only; at most this many re-issues per certificate. */
  reissueMax: fact(3, 'EA/domain/evidence/EvidenceReissue.kt:15 (MAX_REISSUES); EA/presentation/admin/EvidenceCertificateController.kt:150-155 (@Hidden platform operation)'),
  /** A failed certificate can be re-issued only within this many days of the failure, and only while the envelope is not archived. */
  reissueWindowDays: fact(
    30,
    'EA/domain/evidence/EvidenceReissue.kt:13-14,41 (REISSUE_WINDOW from failedAt); EA/application/usecase/ReissueEvidenceCertificateUseCase.kt:49-51 (archived: refused); bb-sign/docs/api/evidence-certificate.md:122,129-130',
  ),
  /** Envelopes completed before the rollout show "Completado antes de habilitar los certificados de evidencia". */
  beforeRolloutUnavailable: fact(true, 'bb-sign/frontend/src/i18n/locales/es/envelopes.json:93; bb-infrastructure/docs/runbooks/lv-legal-validity-release.md:80-81'),
  /** In production no agreement is attached: the certificate prints "Sin acuerdos adjuntos". */
  agreementsAttachedInProduction: fact(false, 'bb-infrastructure/apps/bb-sign/edge-api.yaml:64; bb-sign/document-processing-worker/src/main/resources/evidence/messages_es.properties:58 (evidence.agreements.none)'),
} as const;

// --------------------------------------------------------------- audit ---

export const AUDIT = {
  /** Every row belongs to one chain, with a gap-free sequence; the hash (v4) covers 17 fields including chain key and seq. */
  chainScopes: fact(['env:<envelopeId>', 'org:<orgId>', 'global'] as const, 'bb-sign/audit-service/.../application/port/AuditChainAppender.kt:7-31; .../domain/AuditHashV4.kt:38-58'),
  /** No role can UPDATE, DELETE or TRUNCATE audit rows. */
  appendOnly: fact(true, 'bb-sign/audit-service/src/main/resources/db/migration/V006__lv212_audit_append_only.sql:11-84; afterMigrate__lv212_role_grants.sql:54-60'),
  /** Time and time zone of the nightly chain check, kept apart so each locale words them. Not overridden in production. */
  nightlyVerifyTime: fact('03:30', 'bb-sign/audit-service/.../application/verification/NightlyChainVerificationJob.kt:81 (cron 0 30 3 * * *); not set in bb-infrastructure/apps/bb-sign/audit-service.yaml'),
  nightlyVerifyTimeZone: fact('America/Bogota', 'bb-sign/audit-service/.../application/verification/NightlyChainVerificationJob.kt:81 (zone)'),
  /** Chain verification and export only (RATE_LIMITS.auditReadThrottledRoutes); reading events is not throttled. */
  readRatePerMinute: fact(20, RATE_LIMITS.auditReadPerMinutePerCaller.source),
  exportMaxRows: fact(5000, 'EA/presentation/admin/AuditReadController.kt:114 (above: 413 AUDIT_EXPORT_TOO_LARGE)'),
  exportPageMaxRows: fact(1000, 'EA/presentation/admin/AuditReadController.kt:114 (limit at most 1000)'),
  exportFormat: fact('bbsign.audit-export.v1', 'bb-sign/audit-service/.../application/export/AuditTrailExporterV1.kt:13,21'),
  /** API only, and not in the published OpenAPI contract. */
  exportPath: fact('GET /api/v1/audit/envelopes/{id}/export', 'EA/presentation/admin/AuditReadController.kt:105-144; yml:398 (/audit unpublished)'),
  /**
   * `GET /api/v1/audit/org-events` exists (org_admin and platform_admin, `audit:read-org`) but is not in the published
   * OpenAPI contract: pages do not document it as an integration endpoint.
   */
  orgEventsPublished: fact(false, 'EA/presentation/admin/AuditReadController.kt:63-71; yml:398,403 (paths-to-match leaves /audit out); bb-sign/docs/api/openapi.json (no /api/v1/audit path)'),
  verificationStatuses: fact(['VALID', 'BROKEN', 'EMPTY'] as const, 'EA/presentation/admin/AuditReadController.kt:73-103'),
  /** An envelope trail is readable by auditors, contributors and managers (`audit:read`). */
  envelopeTrailReaders: fact(['auditor', 'contributor', 'manager'] as const, 'EA/domain/security/WorkspaceRoleBundles.kt:29-33'),
  /** Recorded actors: a user, an API credential (label, client id, API badge), a signer, "Sistema", or "Actor no registrado". */
  actorKinds: fact(['user', 'api_credential', 'signer', 'system', 'unattributed'] as const, 'bb-sign/frontend/src/api/auditActor.ts:14-25; bb-sign/frontend/src/i18n/locales/es/envelopes.json:131-138'),
} as const;

/** Every audit event type. Source: bb-sign/audit-service/.../domain/AuditEventType.kt:12-97. SIGNER_AGREEMENT_ACCEPTED has no producer in production (D4). */
export const AUDIT_EVENT_TYPES: readonly string[] = [
  'SIGNER_SIGNED', 'SIGNER_ELIGIBLE', 'ENVELOPE_COMPLETED', 'SIGNER_AGREEMENT_ACCEPTED',
  'SIGNING_VIEW_OPENED', 'SIGNING_VIEW_CLOSED', 'SIGNING_LINK_CLICKED', 'SIGNED_COPY_ACCESSED',
  'ENVELOPE_CREATED', 'ENVELOPE_SENT', 'ENVELOPE_CANCELLED', 'ENVELOPE_EXPIRED', 'ENVELOPE_ARCHIVED',
  'DOCUMENTS_SEALED', 'DOCUMENT_ADDED',
  'OTP_REQUESTED', 'OTP_VERIFIED', 'OTP_FAILED', 'OTP_LOCKED',
  'EMAIL_SENT', 'EMAIL_DELIVERED', 'EMAIL_BOUNCED', 'EMAIL_OPENED',
  'API_CREDENTIAL_CREATED', 'API_CREDENTIAL_REVOKED',
  'WEBHOOK_SUBSCRIPTION_CREATED', 'WEBHOOK_SUBSCRIPTION_SECRET_ROTATED', 'WEBHOOK_SUBSCRIPTION_DELETED',
  'WORKSPACE_CREATED', 'WORKSPACE_RENAMED', 'WORKSPACE_DELETED', 'WORKSPACE_MEMBER_GRANTED', 'WORKSPACE_MEMBER_REVOKED',
  'AGREEMENT_COPY_PUBLISHED', 'AUDIT_TRAIL_EXPORTED',
  'EVIDENCE_CERTIFICATE_ISSUED', 'EVIDENCE_CERTIFICATE_FAILED', 'EVIDENCE_CERTIFICATE_ACCESSED', 'EVIDENCE_CERTIFICATE_REISSUE_REQUESTED',
  'DOCUMENT_RESTORE_REQUESTED', 'DOCUMENT_RESTORED',
  'CERTIFICATE_UPLOADED', 'CERTIFICATE_DELETED', 'CERTIFICATE_EXPIRING',
];

// ----------------------------------------------------------- retention ---

/** Binding service terms (terms §3), backed by code constants. Source: bb-sign/platform/contracts/.../retention/Retention.kt. */
export const RETENTION_POLICY = {
  /** Counted per file: the original from upload, the signed copy from completion, the evidence certificate from issue. */
  retentionDays: fact(365, 'bb-sign/platform/contracts/.../retention/Retention.kt:33-34 (DAYS); :59 (per-file creation proxy)'),
  /** From this age a file tagged archivable (signed PDFs, originals of COMPLETED envelopes; evidence never) MAY move to archive storage. */
  archiveAfterDays: fact(90, 'bb-sign/platform/contracts/.../retention/Retention.kt:36-37 (ARCHIVE_AFTER_DAYS); :70-80'),
  /** How long a restored copy stays readable (allowed range 1-30, production 7). */
  restoredCopyDays: fact(7, 'bb-sign/edge-api/src/main/resources/application.yml:265; EA/application/service/RestoreSettings.kt:15,33; bb-infrastructure/apps/bb-sign/edge-api.yaml:72'),
  /** Fixed: `Retention` is a code object with no property behind it. */
  configurable: fact(false, 'bb-sign/platform/contracts/.../retention/Retention.kt:31-37 (const val, no property)'),
} as const;

/** What production does today (plan decision D1: the live read wins over the declared CloudFormation template). */
export const RETENTION_IMPLEMENTED = {
  /** The single live rule on the documents bucket. */
  documentsLifecycleLive: fact('one rule: expiration after 365 days on the whole bucket; no transitions', LIVE_LIFECYCLE_READ),
  documentsExpirationDays: fact(365, LIVE_LIFECYCLE_READ),
  /** Nothing is moved to archive storage today, so in production no file needs a restore. */
  documentsArchiveTransitionLive: fact(false, `${LIVE_LIFECYCLE_READ}; bb-infrastructure/docs/runbooks/lv-retention-restore-iam.md:184-185 (until bb-sign#214 P5)`),
  /** Declared in the CloudFormation template and shown by Storage as the declared policy, but NOT applied in production. */
  documentsStandardIaDaysDeclared: fact(30, 'bb-infrastructure/aws/bb-sign-aws.yml:284-290 (declared, not applied: :275); EA/presentation/admin/LifecycleController.kt:10-15,94-103'),
  documentsGlacierDaysDeclared: fact(90, 'bb-infrastructure/aws/bb-sign-aws.yml:291-295 (declared, not applied: :275, :439-443)'),
  /** Archive dates ("Se archiva a partir del") are hidden in production; "Deja de estar disponible el" is always shown. */
  archiveDatesVisible: fact(false, 'bb-sign/edge-api/src/main/resources/application.yml:261; EA/application/service/RetentionDates.kt:11-29; not set in bb-infrastructure/apps/bb-sign/edge-api.yaml'),
  /**
   * Storage page: platform admins (only) see an expiration field and **Aplicar**. In production that still writes:
   * it replaces the lifecycle of the documents and evidence buckets with one expiration rule (bb-sign#227 removes
   * the action; bb-sign#214 P4b the permission). Org admins see the page read-only.
   */
  storageApplyWritesProduction: fact(
    true,
    'EA/presentation/admin/LifecycleController.kt:14-15,107-117; EA/infrastructure/storage/BucketLifecycleService.kt:56-75,123-127; bb-sign/frontend/src/pages/StorageLifecycle.tsx:19,35-36,99-118; bb-infrastructure/aws/bb-sign-aws.yml:435,476 (s3:PutLifecycleConfiguration); bb-infrastructure/docs/runbooks/documents-lifecycle-guard.md:174-176',
  ),
  /** Local and CI (MinIO): expiration only, no transitions. */
  nonProdLifecycleDefaultDays: fact(365, 'EA/infrastructure/storage/LifecycleInitializer.kt:40,46-47 (@Profile("!prod")); Retention.kt:33-34'),
  evidenceBucketWriter: fact('evidence certificates and their audit trail (365-day GOVERNANCE lock)', 'W/application/evidence/IssueEvidenceCertificateUseCase.kt:155; bb-infrastructure/aws/bb-sign-aws.yml:480-528'),
  backupsRetentionDays: fact(30, 'bb-infrastructure/aws/bb-sign-aws.yml:363-366 (noncurrent versions 7 d)'),
  /** No purge job, and append-only triggers make one impossible without a migration. */
  auditEventsPurge: fact('none', 'bb-sign/audit-service/src/main/resources/db/migration/V006__lv212_audit_append_only.sql:11-17'),
  /** Restore on request is deployed (v0.34.0) and idle: nothing is archived in production. */
  restoreOnRequest: fact(
    'deployed, idle until archiving is enabled (bb-sign#214 P5)',
    'EA/presentation/admin/EnvelopeController.kt:577-591; EA/presentation/signer/SigningController.kt:261-274; bb-infrastructure/apps/bb-sign/edge-api.yaml:72-75; lv-retention-restore-iam.md:184-185',
  ),
} as const;

export type RestoreStatus = 'REQUESTED' | 'IN_PROGRESS' | 'RESTORED' | 'AVAILABLE' | 'EXPIRED' | 'FAILED';
export type FileAvailability = 'AVAILABLE' | 'ARCHIVED' | 'RESTORE_IN_PROGRESS' | 'RESTORED' | 'DELETED';

/** How a restore of an archived file works. Deployed, idle in production (RETENTION_IMPLEMENTED.restoreOnRequest). */
export const RESTORE = {
  days: RETENTION_POLICY.restoredCopyDays,
  /** A Standard-tier Glacier restore: the UI says "usually within a few hours". */
  typicalHours: fact('3-5', 'bb-sign/edge-api/src/main/resources/application.yml:263-264; bb-infrastructure/apps/bb-sign/edge-api.yaml:70-71; bb-sign/frontend/src/i18n/locales/en/envelopes.json:113'),
  firstPollHours: fact(3, 'bb-sign/edge-api/src/main/resources/application.yml:266; bb-infrastructure/apps/bb-sign/edge-api.yaml:73'),
  /** After this, the restore ends FAILED with reason TIMEOUT. */
  timeoutHours: fact(48, 'EA/application/service/RestoreSettings.kt:25-26 (PT48H)'),
  /** Restores in progress per organization (users and API keys; signers are not counted). */
  maxActivePerOrg: fact(50, 'bb-sign/edge-api/src/main/resources/application.yml:269; RestoreSettings.kt:19; bb-infrastructure/apps/bb-sign/edge-api.yaml:75'),
  statuses: fact(['REQUESTED', 'IN_PROGRESS', 'RESTORED', 'AVAILABLE', 'EXPIRED', 'FAILED'] as const, 'EA/application/port/DocumentRestores.kt:70-73'),
  failureReasons: fact(['DELETED', 'TIMEOUT', 'STORAGE_ERROR'] as const, 'EA/application/port/DocumentRestores.kt:76'),
  /** Several requesters of the same file share one restore and are all notified. */
  sharedBetweenRequesters: fact(true, 'bb-sign/docs/guias/conservacion-y-restauracion.md:19 (§2); EA/application/port/DocumentRestores.kt:65-67'),
  /** A restored copy that passed its window goes back to the archive and can be requested again. */
  requestableAgainAfterWindow: fact(true, 'bb-sign/docs/guias/conservacion-y-restauracion.md:19 (§2); EA/infrastructure/persistence/JdbcDocumentRestores.kt:79,158 (EXPIRED opens a new restore)'),
  /** The "your files are back" email names no file and no envelope when the user's download access cannot be confirmed again. */
  emailGenericWithoutConfirmedAccess: fact(true, 'EA/application/service/RestoreNotifications.kt:23-25,92-101; NS/application/service/RestoreEmails.kt:12-17'),
  /** The email links to the envelope page (users) or to the signing page of the link that asked (signers), never to a file. */
  emailLinksToEnvelopeOrSigningPage: fact(
    true,
    'EA/application/service/RestoreNotifications.kt:23,26-27,100 (/envelopes/{id}#documents), :114 (/sign/{token}); NS/application/service/RestoreEmails.kt:15-16,59',
  ),
  /** API credentials are never emailed: an integration learns of its restores only through `document.restored`. */
  apiNotifiedByWebhookOnly: fact(true, 'NS/application/service/RestoreEmails.kt:12-21; EA/domain/webhook/WebhookEventType.kt:39-40'),
  /** Restore rows and requester emails are purged after this. */
  purgeAfterDays: fact(400, 'EA/application/service/RestoreSettings.kt:29-30 (P400D)'),
  /** File availability on GET .../documents (`original.availability`, `signed.availability`). */
  fileAvailability: fact(['AVAILABLE', 'ARCHIVED', 'RESTORE_IN_PROGRESS', 'RESTORED', 'DELETED'] as const, 'EA/application/service/DocumentDownloads.kt:56; bb-sign/frontend/src/i18n/locales/es/envelopes.json:112-116'),
  /** Dates are shown at 00:00 UTC, the earliest across the envelope's files. */
  datesAtUtcMidnight: fact(true, 'bb-sign/platform/contracts/.../retention/Retention.kt:50-53 (ceilToUtcMidnight)'),
} as const;

// ------------------------------------------------------------- emails ---

export interface EmailFact {
  readonly template: string;
  readonly subject: string;
  readonly recipient: 'signer' | 'org_admin' | 'user' | 'requester';
  readonly trigger: string;
  /** `en`: English only; `es+en`: Spanish then English in one email; `realm`: follows the identity service's locale. */
  readonly language: 'en' | 'es+en' | 'realm';
  readonly source: string;
}

/** Every email bb-sign sends. Envelope mail to signers is English only; the certificate and restore notices are Spanish then English. */
export const EMAILS: readonly EmailFact[] = [
  { template: 'signing-invitation', subject: 'You have a document to sign: {title}', recipient: 'signer', trigger: 'envelope.sent', language: 'en', source: 'NS/infrastructure/messaging/listener/EnvelopeCreatedListener.kt:35' },
  { template: 'signing-invitation', subject: "It's your turn to sign: {title}", recipient: 'signer', trigger: 'signer.eligible (sequential signing)', language: 'en', source: 'NS/infrastructure/messaging/listener/SignerEligibleListener.kt:37' },
  { template: 'otp-delivery', subject: 'Your verification code for BB-Sign', recipient: 'signer', trigger: 'otp.ready_for_delivery', language: 'en', source: 'NS/infrastructure/delivery/EmailOtpCodeDeliveryChannel.kt:25' },
  { template: 'reminder', subject: 'Reminder: please sign {title}', recipient: 'signer', trigger: 'daily; invitation older than the threshold', language: 'en', source: 'NS/application/service/ReminderSchedulerService.kt:79' },
  { template: 'envelope-completed', subject: 'Signing complete: {title}', recipient: 'signer', trigger: 'evidence certificate issued, or the degraded wait (without it)', language: 'en', source: 'NS/application/service/CompletionEmails.kt:34-37,64; NS/infrastructure/messaging/listener/EnvelopeCompletionNoticeListener.kt:14-21; yml:193' },
  { template: 'envelope-expired', subject: 'Signing request expired: {title}', recipient: 'signer', trigger: 'envelope.expired', language: 'en', source: 'NS/infrastructure/messaging/listener/EnvelopeExpiredListener.kt:28' },
  { template: 'webhook-disabled', subject: 'Action required: bb-sign disabled a webhook endpoint', recipient: 'org_admin', trigger: 'webhook circuit breaker', language: 'en', source: 'NS/infrastructure/messaging/listener/WebhookSubscriptionDisabledListener.kt:56' },
  { template: 'certificate-expiring', subject: "bb-sign: el certificado de sello de su organización vence en N días · Your organization's sealing certificate expires in N days", recipient: 'org_admin', trigger: 'daily certificate expiry check (own certificate, at each notice threshold)', language: 'es+en', source: 'NS/application/service/CertificateExpiryEmails.kt:90,95-100; bb-sign/notification-service/src/main/resources/templates/email/certificate-expiring.html' },
  { template: 'document-restored', subject: 'Tu solicitud de restauración de documentos / Your document restore request', recipient: 'requester', trigger: 'a restore the person requested ends (restored, or failed with a reason)', language: 'es+en', source: 'NS/application/service/RestoreEmails.kt:12-21,80-96; bb-sign/notification-service/src/main/resources/templates/email/document-restored.html' },
  { template: 'keycloak: invite', subject: '(realm template) set your password', recipient: 'user', trigger: 'user invited', language: 'realm', source: 'bb-sign/infrastructure/configs/keycloak/themes/bbsign/email/html/executeActions.ftl' },
  { template: 'keycloak: password reset', subject: '(realm template) reset your password', recipient: 'user', trigger: 'user request', language: 'realm', source: 'bb-sign/infrastructure/configs/keycloak/themes/bbsign/email/html/password-reset.ftl' },
  { template: 'keycloak: email verification', subject: '(realm template) verify your email', recipient: 'user', trigger: 'realm flow', language: 'realm', source: 'bb-sign/infrastructure/configs/keycloak/themes/bbsign/email/html/email-verification.ftl' },
];

/** Features that exist in planning documents but not on bb-sign `main` (or not in production). Never documented as available. */
export const NOT_SHIPPED: readonly string[] = [
  'templates',
  'bulk send',
  'field placement UI (initials, dates, checkboxes)',
  'declining to sign',
  'resending a signing link',
  'SMS OTP',
  'access codes',
  'consent checkbox',
  'signer acceptance of agreement texts (data-processing authorization)',
  'TSA / PAdES / LTV',
  'legal hold',
  'per-organisation retention',
  'per-organisation branding',
  'billing or self-service plans',
  'free trial',
  'general API rate limits',
  'Python or Go SDKs',
  'Postman collection',
  'sender completion email',
  'cancellation email',
];
