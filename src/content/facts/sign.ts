/**
 * The bb-sign fact sheet: every number, limit, default and behaviour the
 * documentation states, each with the line in bb-sign (or bb-infrastructure)
 * it was read from. Pages import these values; prose never types them.
 *
 * Verified on 2026-10-07 against bb-sign `main` (d1badc5) and
 * bb-infrastructure `main`. When a value moves in the product, change it
 * here and the whole site follows. `tests/unit/facts.test.ts` checks the
 * relationships between values (an OTP outlives its resend cooldown, the
 * retention outlives the archive threshold, and so on).
 *
 * Two layers are kept apart on purpose:
 *   - RETENTION_POLICY is the binding service term (LV contract §1, D-13, T4–T6).
 *   - RETENTION_IMPLEMENTED is what the infrastructure does today.
 * Pages say "policy" for the first and "today" for the second, and never
 * claim the second does what only the first promises.
 */

export interface Fact<T = number> {
  readonly value: T;
  /** `repo/path:line` where the value was read. */
  readonly source: string;
}

const fact = <T>(value: T, source: string): Fact<T> => ({ value, source });

// ---------------------------------------------------------------- urls ---

export const URLS = {
  app: fact('https://sign.binarybridges.co', 'bb-infrastructure/README.md domains table'),
  api: fact('https://sign-api.binarybridges.co', 'bb-infrastructure/apps/bb-sign/ingress.yaml'),
  tokenUrl: fact(
    'https://auth.binarybridges.co/realms/bbsign/protocol/openid-connect/token',
    'bb-infrastructure/apps/bb-sign/ingress.yaml; bb-sign/docs/api/machine-authentication.md §2',
  ),
  openapiPath: fact('/v3/api-docs', 'bb-sign/edge-api/src/main/resources/application.yml:292'),
  senderAddress: fact('sign@binarybridges.co', 'bb-infrastructure/aws/bb-sign-aws.yml:13-45'),
  identitySenderAddress: fact('no-reply@binarybridges.co', 'bb-infrastructure/aws/bb-sign-aws.yml:13-45'),
} as const;

// ---------------------------------------------------------------- auth ---

export const AUTH = {
  /** Access-token lifetime in seconds; tokens are validated against the JWKS with no introspection. */
  tokenLifetimeSeconds: fact(300, 'bb-sign/docs/api/machine-authentication.md §2; realm accessTokenLifespan'),
  /** Active API credentials per organisation. */
  maxCredentialsPerOrg: fact(10, 'bb-sign/edge-api/.../keycloak/KeycloakApiCredentialAdapter.kt:47'),
  /** Days a revoked credential stays listed. */
  revokedCredentialListedDays: fact(90, 'bb-sign/edge-api/.../keycloak/KeycloakApiCredentialAdapter.kt:48'),
  /** Invitation link validity in hours. */
  invitationLinkHours: fact(72, 'bb-sign/edge-api/src/main/resources/application.yml:149 (259200 s)'),
  /** Workspace memberships per user or API key. */
  maxWorkspaceMembershipsPerPrincipal: fact(50, 'bb-sign/edge-api/src/main/resources/application.yml:119-120'),
} as const;

export type OrgRole = 'platform_admin' | 'org_admin' | 'org_member' | 'org_api';
export type WorkspaceRole = 'viewer' | 'auditor' | 'contributor' | 'manager';

export const ORG_ROLES: readonly OrgRole[] = ['platform_admin', 'org_admin', 'org_member', 'org_api'];
export const WORKSPACE_ROLES: readonly WorkspaceRole[] = ['viewer', 'auditor', 'contributor', 'manager'];

/** Org-scope permissions and who holds them. Source: bb-sign/infrastructure/configs/keycloak/permission-catalog.txt and PermissionCatalog.kt:51-68. */
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
];

/** Workspace-scope permissions per workspace role. Source: bb-sign/edge-api/.../security/WorkspaceRoleBundles.kt:29-33. */
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

/** Permissions a machine credential can never hold. Source: PermissionCatalog.kt:78-85 (ESCALATION_GUARDS). */
export const ORG_API_NEVER: readonly string[] = [
  'credential:manage',
  'webhook:manage',
  'workspace:manage',
  'workspace:manage-members',
  'workspace:access-all',
];

// ------------------------------------------------------------ envelope ---

export type EnvelopeStatus = 'DRAFT' | 'SENT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type SignerStatus = 'PENDING' | 'NOTIFIED' | 'VIEWED' | 'SIGNED';

export const ENVELOPE_STATUSES: readonly EnvelopeStatus[] = ['DRAFT', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
export const SIGNER_STATUSES: readonly SignerStatus[] = ['PENDING', 'NOTIFIED', 'VIEWED', 'SIGNED'];

/** Allowed transitions. Source: SendEnvelopeUseCase.kt:36,71; RecordSignatureUseCase.kt:112-176; EnvelopeController.kt:528-531; ExpireEnvelopesUseCase.kt:40-50. */
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
  /** Signing-link validity in hours (`linkTtlHours`). */
  linkTtlHoursDefault: fact(72, 'bb-sign/edge-api/.../entity/EnvelopeEntity.kt:31; EnvelopeController.kt:107'),
  /** How often the expiry sweep runs, in minutes. */
  expirySweepMinutes: fact(5, 'bb-sign/edge-api/src/main/resources/application.yml:166-169 (cron 0 */5 * * * *)'),
  /** Presigned download URL validity in seconds. */
  downloadUrlSeconds: fact(3600, 'bb-sign/edge-api/.../usecase/RecordSignatureUseCase.kt:193; GetSignerAccessUseCase.kt:65'),
  /** Days after creation at which COMPLETED, CANCELLED and EXPIRED envelopes move to the archive view. */
  archiveAfterDays: fact(30, 'bb-sign/edge-api/src/main/resources/application.yml:156-160; ArchiveEnvelopesUseCase.kt:32-38'),
  /** Archive job time (UTC). */
  archiveCron: fact('02:00 UTC', 'bb-sign/edge-api/src/main/resources/application.yml:160'),
  /** Seconds within which repeated view-opened beacons count as one open. */
  viewDedupSeconds: fact(30, 'bb-sign/edge-api/src/main/resources/application.yml:170-174'),
  /** Envelope list totals are capped. */
  listCountCap: fact(10000, 'bb-sign/frontend/src/i18n/locales/en/envelopes.json list.countCapped'),
} as const;

export const OTP = {
  digits: fact(6, 'bb-sign/auth-challenge-service/.../usecase/GenerateOtpUseCase.kt:30'),
  validitySeconds: fact(900, 'bb-sign/auth-challenge-service/src/main/resources/application.yml:45'),
  /** The same validity in minutes, for signer-facing pages. `facts.test.ts` keeps the two equal. */
  validityMinutes: fact(15, 'bb-sign/auth-challenge-service/src/main/resources/application.yml:45 (900 s)'),
  maxAttempts: fact(3, 'bb-sign/auth-challenge-service/.../db/migration/V002 (max_attempts DEFAULT 3)'),
  resendCooldownSeconds: fact(60, 'bb-sign/edge-api/src/main/resources/application.yml:180'),
  /** Minutes a verified code stays valid for signing. */
  verifiedValidityMinutes: fact(15, 'bb-sign/edge-api/.../usecase/RecordSignatureUseCase.kt:42'),
  channel: fact('email', 'bb-sign/notification-service templates: otp-delivery; no SMS listener'),
} as const;

export const DOCUMENTS = {
  contentType: fact('application/pdf', 'bb-sign/edge-api/.../usecase/UploadUnassignedDocumentUseCase.kt:59'),
  maxUploadMb: fact(50, 'bb-sign/edge-api/src/main/resources/application.yml:64-65'),
  maxUnassignedPerOrgMb: fact(500, 'bb-sign/edge-api/src/main/resources/application.yml:186'),
  unassignedRetentionHours: fact(24, 'bb-sign/edge-api/src/main/resources/application.yml:187'),
  /** Text marker that positions a signer's seal; N is the signer's order. */
  placementMarker: fact('{{signerN}}', 'bb-sign/document-processing-worker/.../service/PdfPlaceholderLocator.kt:76'),
} as const;

export const LABELS = {
  keyNameMaxChars: fact(50, 'bb-sign/edge-api/.../db/migration/V009 (label_keys.name)'),
  keyDescriptionMaxChars: fact(200, 'bb-sign/edge-api/.../db/migration/V009 (label_keys.description)'),
  valueMaxChars: fact(200, 'bb-sign/edge-api/.../usecase/SetEnvelopeLabelsUseCase.kt:40-44'),
} as const;

export const REMINDERS = {
  /** Hours after the invitation before the first reminder. */
  thresholdHours: fact(48, 'bb-sign/notification-service/src/main/resources/application.yml:67'),
  /** Minimum hours between reminders to the same signer. */
  cooldownHours: fact(24, 'bb-sign/notification-service/src/main/resources/application.yml:68'),
  dailyRunTime: fact('09:00 UTC', 'bb-sign/notification-service/src/main/resources/application.yml:66'),
} as const;

export const QUOTA = {
  warningThresholdPct: fact(80, 'bb-sign/edge-api/.../db/migration/V019 (warning_threshold_pct 80)'),
  httpStatusWhenExhausted: fact(429, 'bb-sign/edge-api/.../QuotaEnforcementService.kt'),
  periodTypes: fact(['MONTHLY', 'YEARLY', 'CUSTOM'] as const, 'bb-sign/edge-api/.../db/migration/V019'),
} as const;

// ------------------------------------------------------------ webhooks ---

export type WebhookEventType =
  | 'envelope.sent'
  | 'envelope.completed'
  | 'envelope.cancelled'
  | 'envelope.expired'
  | 'signer.signed'
  | 'signer.viewed';

export const WEBHOOK_EVENTS: readonly WebhookEventType[] = [
  'envelope.sent',
  'envelope.completed',
  'envelope.cancelled',
  'envelope.expired',
  'signer.signed',
  'signer.viewed',
];

export const WEBHOOKS = {
  signatureHeader: fact('X-BBSign-Signature', 'bb-sign/docs/api/webhook-signature-spec.md §1'),
  eventIdHeader: fact('X-BBSign-Event-Id', 'bb-sign/docs/api/webhook-signature-spec.md §1'),
  eventTypeHeader: fact('X-BBSign-Event-Type', 'bb-sign/docs/api/webhook-signature-spec.md §1'),
  /** Seconds of clock skew a verifier accepts. */
  toleranceSeconds: fact(300, 'bb-sign/docs/api/webhook-signature-spec.md §4'),
  retryLadder: fact(['1m', '5m', '30m', '2h', '12h'] as const, 'bb-sign/edge-api/.../webhook/WebhookDispatchProperties.kt:20-35'),
  retryJitterPct: fact(20, 'bb-sign/edge-api/.../webhook/WebhookDispatchProperties.kt:20-35'),
  /** Approximate span of the whole ladder, in hours. */
  retryLadderHoursApprox: fact(15, 'bb-sign/docs/api/webhooks.md "Delivery behaviour"'),
  /** Consecutive exhausted ladders before the endpoint is disabled. */
  disableAfterLadders: fact(3, 'bb-sign/edge-api/.../webhook/WebhookDispatchProperties.kt:20-35'),
  /** Hours between automatic probes of a disabled endpoint. */
  probeIntervalHours: fact(6, 'bb-sign/edge-api/.../webhook/WebhookDispatchProperties.kt:20-35'),
  maxPerOrg: fact(20, 'bb-sign/edge-api/src/main/resources/application.yml:249'),
  secretRotationGraceHours: fact(24, 'bb-sign/edge-api/src/main/resources/application.yml:250'),
  deliveryLogRetentionDays: fact(90, 'bb-sign/edge-api/.../webhook/WebhookDispatchProperties.kt:34'),
  testVectorCount: fact(16, 'bb-sign/docs/api/webhook-signature-vectors.json'),
} as const;

export type DeliveryStatus = 'PENDING_RENDER' | 'PENDING_SEND' | 'DELIVERED' | 'FAILED_PERMANENT' | 'SKIPPED' | 'DEAD_LETTERED';
export const DELIVERY_STATUSES: readonly DeliveryStatus[] = ['PENDING_RENDER', 'PENDING_SEND', 'DELIVERED', 'FAILED_PERMANENT', 'SKIPPED', 'DEAD_LETTERED'];

// ----------------------------------------------------------------- sdk ---

export const SDK = {
  js: {
    packageName: fact('@binarybridges/bb-sign-sdk', 'bb-sign/sdk-js/package.json'),
    version: fact('0.1.0', 'bb-sign/sdk-js/package.json'),
    tarball: fact('binarybridges-bb-sign-sdk-0.1.0.tgz', 'bb-sign/sdk-js/README.md "Installing"'),
    minNode: fact(20, 'bb-sign/sdk-js/package.json engines'),
    webhookSubpath: fact('@binarybridges/bb-sign-sdk/webhooks', 'bb-sign/sdk-js/package.json exports'),
  },
  java: {
    groupId: fact('co.binarybridges.sign', 'bb-sign/sdk-java/pom.xml'),
    artifactId: fact('bb-sign-sdk-java', 'bb-sign/sdk-java/pom.xml'),
    version: fact('0.1.0-SNAPSHOT', 'bb-sign/sdk-java/pom.xml'),
    minJava: fact(17, 'bb-sign/sdk-java/pom.xml maven.compiler.release'),
  },
} as const;

// --------------------------------------------------------- certificate ---

export const CERTIFICATE = {
  defaultSubject: fact('CN=Binary Bridges SAS, O=Binary Bridges SAS, L=Bogota, C=CO', 'bb-sign/edge-api/.../config/GlobalCertificateBootstrap.kt:51'),
  defaultKeyBits: fact(4096, 'bb-sign/edge-api/.../config/GlobalCertificateBootstrap.kt:50'),
  defaultValidityYears: fact(10, 'bb-sign/edge-api/.../config/GlobalCertificateBootstrap.kt:53'),
  defaultDisplayName: fact('Binary Bridges SAS', 'bb-sign/document-processing-worker/.../service/CertificateResolverService.kt:18'),
  defaultReason: fact('Digital signature by bb-sign', 'bb-sign/document-processing-worker/.../service/CertificateResolverService.kt:19'),
  allowedExtensions: fact(['p12', 'pfx', 'pem'] as const, 'bb-sign/edge-api/.../usecase/UploadOrgCertificateUseCase.kt:28'),
  maxFileMb: fact(5, 'bb-sign/edge-api/.../usecase/UploadOrgCertificateUseCase.kt:29'),
  minKeyBits: fact(2048, 'bb-sign/edge-api/.../usecase/UploadOrgCertificateUseCase.kt:133'),
  requiredKeyUsage: fact('digitalSignature', 'bb-sign/edge-api/.../usecase/UploadOrgCertificateUseCase.kt:136'),
  /** Minutes the signing worker caches a resolved certificate. */
  cacheMinutes: fact(5, 'bb-sign/document-processing-worker/.../service/CertificateResolverService.kt:51'),
  signatureSubFilter: fact('adbe.pkcs7.detached', 'bb-sign/document-processing-worker/.../service/PdfDigitalSignatureService.kt:46'),
  signatureAlgorithm: fact('SHA256withRSA', 'bb-sign/document-processing-worker/.../service/PdfDigitalSignatureService.kt:157'),
  /** Today only the leaf certificate is embedded; the full chain is bb-sign#208 (unmerged). */
  chainEmbedded: fact('leaf only', 'bb-sign/document-processing-worker/.../service/PdfDigitalSignatureService.kt:154'),
  pemCanSign: fact(false, 'bb-sign/document-processing-worker/.../service/CertificateResolverService.kt:153-155'),
  sealHashFormula: fact('SHA-256(name|email|date|documentId|certFingerprint)', 'bb-sign/platform/contracts/.../crypto/SealHashUtil.kt:12,40'),
} as const;

// ----------------------------------------------------------- retention ---

/** Binding service terms. Source: bb-sign LV contract §1, §3.14 D-13, §8 T4–T6 (worktree legal-validity-plans). */
export const RETENTION_POLICY = {
  retentionDays: fact(365, 'bb-sign LV-contract §1 and D-13 (Retention.DAYS=365)'),
  archiveAfterDays: fact(90, 'bb-sign LV-contract §1 and D-13 (ARCHIVE_AFTER_DAYS=90)'),
  restoredCopyDays: fact(7, 'bb-sign LV-contract §3.14 D-13 (app.restore.days=7)'),
  configurable: fact(false, 'bb-sign LV-contract T4: "fixed, non-configurable 365 days"'),
} as const;

/** What the infrastructure does today. Source: bb-infrastructure/aws/bb-sign-aws.yml and bb-sign application.yml. */
export const RETENTION_IMPLEMENTED = {
  documentsStandardIaDays: fact(30, 'bb-infrastructure/aws/bb-sign-aws.yml:284-290'),
  documentsGlacierDays: fact(90, 'bb-infrastructure/aws/bb-sign-aws.yml:291-295'),
  documentsExpirationRule: fact('none', 'bb-infrastructure/aws/bb-sign-aws.yml:246-300 (no Expiration rule)'),
  nonProdLifecycleDefaultDays: fact(365, 'bb-sign/edge-api/src/main/resources/application.yml:161-165 (@Profile("!prod"))'),
  evidenceBucketWriter: fact('none yet', 'bb-infrastructure/aws/bb-sign-aws.yml:326-338; bb-sign LV-contract P27'),
  backupsRetentionDays: fact(30, 'bb-infrastructure/aws/bb-sign-aws.yml:361-367'),
  auditEventsPurge: fact('none', 'bb-sign/audit-service (no purge job)'),
  restoreOnRequest: fact(false, 'bb-sign LV-contract §3.14 (#214, unmerged)'),
} as const;

// ------------------------------------------------------------- emails ---

export interface EmailFact {
  readonly template: string;
  readonly subject: string;
  readonly recipient: 'signer' | 'org_admin' | 'user';
  readonly trigger: string;
  readonly source: string;
}

/** Every email bb-sign sends. Envelope mail is English only; identity mail follows the realm locale. */
export const EMAILS: readonly EmailFact[] = [
  { template: 'signing-invitation', subject: 'You have a document to sign: {title}', recipient: 'signer', trigger: 'envelope.sent', source: 'bb-sign/notification-service/.../EnvelopeCreatedListener.kt:35' },
  { template: 'signing-invitation', subject: "It's your turn to sign: {title}", recipient: 'signer', trigger: 'signer.eligible (sequential signing)', source: 'bb-sign/notification-service templates' },
  { template: 'otp-delivery', subject: 'Your verification code for BB-Sign', recipient: 'signer', trigger: 'otp.ready_for_delivery', source: 'bb-sign/notification-service templates' },
  { template: 'reminder', subject: 'Reminder: please sign {title}', recipient: 'signer', trigger: 'daily; invitation older than the threshold', source: 'bb-sign/notification-service/.../ReminderSchedulerService.kt' },
  { template: 'envelope-completed', subject: 'Signing complete: {title}', recipient: 'signer', trigger: 'envelope.completed', source: 'bb-sign/notification-service templates' },
  { template: 'envelope-expired', subject: 'Signing request expired: {title}', recipient: 'signer', trigger: 'envelope.expired', source: 'bb-sign/notification-service templates' },
  { template: 'webhook-disabled', subject: 'Action required: bb-sign disabled a webhook endpoint', recipient: 'org_admin', trigger: 'webhook circuit breaker', source: 'bb-sign/notification-service templates' },
  { template: 'keycloak: invite', subject: '(realm template) set your password', recipient: 'user', trigger: 'user invited', source: 'bb-sign/infrastructure/configs/keycloak/themes/bbsign/email/' },
  { template: 'keycloak: password reset', subject: '(realm template) reset your password', recipient: 'user', trigger: 'user request', source: 'bb-sign/infrastructure/configs/keycloak/themes/bbsign/email/' },
  { template: 'keycloak: email verification', subject: '(realm template) verify your email', recipient: 'user', trigger: 'realm flow', source: 'bb-sign/infrastructure/configs/keycloak/themes/bbsign/email/' },
];

// -------------------------------------------------------------- limits ---

export interface LimitRow {
  readonly key: string;
  readonly value: string;
  readonly source: string;
}

/** One table of every number, for `/sign/reference/limits-and-defaults/`. Labels are translated by the page. */
export const LIMITS: readonly LimitRow[] = [
  { key: 'linkTtl', value: `${ENVELOPE.linkTtlHoursDefault.value} h`, source: ENVELOPE.linkTtlHoursDefault.source },
  { key: 'expirySweep', value: `${ENVELOPE.expirySweepMinutes.value} min`, source: ENVELOPE.expirySweepMinutes.source },
  { key: 'otpDigits', value: `${OTP.digits.value}`, source: OTP.digits.source },
  { key: 'otpValidity', value: `${OTP.validitySeconds.value / 60} min`, source: OTP.validitySeconds.source },
  { key: 'otpAttempts', value: `${OTP.maxAttempts.value}`, source: OTP.maxAttempts.source },
  { key: 'otpResend', value: `${OTP.resendCooldownSeconds.value} s`, source: OTP.resendCooldownSeconds.source },
  { key: 'otpVerifiedValidity', value: `${OTP.verifiedValidityMinutes.value} min`, source: OTP.verifiedValidityMinutes.source },
  { key: 'uploadMax', value: `${DOCUMENTS.maxUploadMb.value} MB`, source: DOCUMENTS.maxUploadMb.source },
  { key: 'unassignedMax', value: `${DOCUMENTS.maxUnassignedPerOrgMb.value} MB`, source: DOCUMENTS.maxUnassignedPerOrgMb.source },
  { key: 'unassignedRetention', value: `${DOCUMENTS.unassignedRetentionHours.value} h`, source: DOCUMENTS.unassignedRetentionHours.source },
  { key: 'downloadUrl', value: `${ENVELOPE.downloadUrlSeconds.value / 60} min`, source: ENVELOPE.downloadUrlSeconds.source },
  { key: 'archiveAfter', value: `${ENVELOPE.archiveAfterDays.value} d`, source: ENVELOPE.archiveAfterDays.source },
  { key: 'reminderThreshold', value: `${REMINDERS.thresholdHours.value} h`, source: REMINDERS.thresholdHours.source },
  { key: 'reminderCooldown', value: `${REMINDERS.cooldownHours.value} h`, source: REMINDERS.cooldownHours.source },
  { key: 'labelKeyName', value: `${LABELS.keyNameMaxChars.value}`, source: LABELS.keyNameMaxChars.source },
  { key: 'labelValue', value: `${LABELS.valueMaxChars.value}`, source: LABELS.valueMaxChars.source },
  { key: 'listCap', value: `${ENVELOPE.listCountCap.value}`, source: ENVELOPE.listCountCap.source },
  { key: 'tokenLifetime', value: `${AUTH.tokenLifetimeSeconds.value} s`, source: AUTH.tokenLifetimeSeconds.source },
  { key: 'credentialsPerOrg', value: `${AUTH.maxCredentialsPerOrg.value}`, source: AUTH.maxCredentialsPerOrg.source },
  { key: 'revokedListed', value: `${AUTH.revokedCredentialListedDays.value} d`, source: AUTH.revokedCredentialListedDays.source },
  { key: 'invitationLink', value: `${AUTH.invitationLinkHours.value} h`, source: AUTH.invitationLinkHours.source },
  { key: 'membershipsPerPrincipal', value: `${AUTH.maxWorkspaceMembershipsPerPrincipal.value}`, source: AUTH.maxWorkspaceMembershipsPerPrincipal.source },
  { key: 'webhooksPerOrg', value: `${WEBHOOKS.maxPerOrg.value}`, source: WEBHOOKS.maxPerOrg.source },
  { key: 'webhookTolerance', value: `${WEBHOOKS.toleranceSeconds.value} s`, source: WEBHOOKS.toleranceSeconds.source },
  { key: 'webhookRetries', value: WEBHOOKS.retryLadder.value.join(', '), source: WEBHOOKS.retryLadder.source },
  { key: 'webhookDisable', value: `${WEBHOOKS.disableAfterLadders.value}`, source: WEBHOOKS.disableAfterLadders.source },
  { key: 'webhookRotationGrace', value: `${WEBHOOKS.secretRotationGraceHours.value} h`, source: WEBHOOKS.secretRotationGraceHours.source },
  { key: 'webhookLog', value: `${WEBHOOKS.deliveryLogRetentionDays.value} d`, source: WEBHOOKS.deliveryLogRetentionDays.source },
  { key: 'certFile', value: `${CERTIFICATE.maxFileMb.value} MB`, source: CERTIFICATE.maxFileMb.source },
  { key: 'certKeyBits', value: `${CERTIFICATE.minKeyBits.value}`, source: CERTIFICATE.minKeyBits.source },
  { key: 'certCache', value: `${CERTIFICATE.cacheMinutes.value} min`, source: CERTIFICATE.cacheMinutes.source },
  { key: 'quotaWarning', value: `${QUOTA.warningThresholdPct.value} %`, source: QUOTA.warningThresholdPct.source },
  { key: 'retentionPolicy', value: `${RETENTION_POLICY.retentionDays.value} d`, source: RETENTION_POLICY.retentionDays.source },
  { key: 'archivePolicy', value: `${RETENTION_POLICY.archiveAfterDays.value} d`, source: RETENTION_POLICY.archiveAfterDays.source },
];

/** Features that exist in planning documents but not on bb-sign `main`. Never documented as available. */
export const NOT_SHIPPED: readonly string[] = [
  'templates',
  'bulk send',
  'field placement UI (initials, dates, checkboxes)',
  'uploading a signature image',
  'declining to sign',
  'resending a signing link',
  'SMS OTP',
  'access codes',
  'consent checkbox',
  'evidence certificate PDF or export',
  'TSA / PAdES / LTV',
  'legal hold',
  'per-organisation retention',
  'per-organisation branding',
  'billing or self-service plans',
  'free trial',
  'rate limits',
  'Python or Go SDKs',
  'sender completion email',
  'cancellation email',
  'restore on request',
  'certificate expiry emails',
  'full certificate chain in the seal',
];
