import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import {
  ADMIN_MFA,
  AGREEMENTS,
  ARCHIVED_ENVELOPES,
  AUDIT,
  AUDIT_EVENT_TYPES,
  AUTH,
  CERTIFICATE,
  DOCUMENTS,
  EMAILS,
  ENVELOPE,
  ENVELOPE_STATUSES,
  ENVELOPE_TRANSITIONS,
  ERROR_CODES,
  EVIDENCE,
  LABELS,
  NOT_SHIPPED,
  ORG_API_NEVER,
  ORG_PERMISSIONS,
  ORG_STORAGE,
  OTP,
  PERMISSION_SCOPE,
  PRICING,
  QUOTA,
  RATE_LIMITS,
  REMINDERS,
  RESTORE,
  RETENTION_POLICY,
  SDK,
  SIGN_REQUEST,
  SIGNATURE_UPLOAD,
  SIGNER,
  SIGNING_ORDER,
  STORAGE_NOT_READY,
  URLS,
  VERIFY,
  VERIFY_QR_ARCHIVED_ISSUE,
  WEBHOOKS,
  WEBHOOK_EVENTS,
  WIZARD,
  WORKSPACE_PERMISSIONS,
} from '../../src/content/facts/sign';

/**
 * Relationships between facts that must hold, whatever the individual
 * values are. A value changed in isolation that breaks one of these is a
 * documentation bug waiting to happen.
 */
describe('bb-sign fact sheet', () => {
  test('every fact cites a source', () => {
    const walk = (node: unknown, path: string): string[] => {
      if (node && typeof node === 'object') {
        if ('value' in node && 'source' in node) {
          return typeof (node as { source: unknown }).source === 'string' && (node as { source: string }).source.length > 10 ? [] : [path];
        }
        return Object.entries(node).flatMap(([k, v]) => walk(v, `${path}.${k}`));
      }
      return [];
    };
    const groups = {
      URLS, AUTH, ADMIN_MFA, PERMISSION_SCOPE, AGREEMENTS, ENVELOPE, ARCHIVED_ENVELOPES, OTP, SIGNER, DOCUMENTS, LABELS,
      REMINDERS, QUOTA, WEBHOOKS, RATE_LIMITS, SIGN_REQUEST, VERIFY, SDK, CERTIFICATE, EVIDENCE, AUDIT, RETENTION_POLICY,
      RESTORE, WIZARD, SIGNING_ORDER, PRICING, STORAGE_NOT_READY, ORG_STORAGE,
    };
    expect(walk(groups, 'facts')).toEqual([]);
    for (const email of EMAILS) expect(email.source.length).toBeGreaterThan(10);
    for (const error of ERROR_CODES) expect(error.source.length, error.code).toBeGreaterThan(10);
  });

  /** The public-source rule (plan P1): a fact source is one of three forms, never a path into the product. */
  const P1_SOURCE = /^(Sign v\d+\.\d+\.\d+ behaviour: |production configuration, read \d{4}-\d{2}-\d{2}: |owner decision \d{4}-\d{2}-\d{2} in issue #\d+: )/;
  const p1Offenders = (group: Record<string, { source: string }>): string[] =>
    Object.entries(group).filter(([, f]) => !P1_SOURCE.test(f.source)).map(([k]) => k);

  test('prices: every source is an owner decision, and the volume floor < standard < 10 years', () => {
    expect(p1Offenders(PRICING)).toEqual([]);
    for (const f of Object.values(PRICING)) expect(f.source).toMatch(/^owner decision /);
    expect(PRICING.volumeFloorPerEnvelopeCop.value).toBeLessThan(PRICING.standardPerEnvelopeCop.value);
    expect(PRICING.standardPerEnvelopeCop.value).toBeLessThan(PRICING.tenYearPerEnvelopeCop.value);
    expect(PRICING.volumeThresholdEnvelopesPerMonth.value).toBeGreaterThan(0);
    expect(PRICING.billedUnit.value).toContain('drafts and cancelled included');
    expect(PRICING.tenYearTiersManagedByBinaryBridges.value).toBe(true);
    // Prices are published; checkout and self-service plans are still not shipped.
    expect(NOT_SHIPPED).toContain('billing or self-service plans');
  });

  test('an OTP outlives its resend cooldown and its verified window fits the link', () => {
    expect(OTP.validitySeconds.value).toBeGreaterThan(OTP.resendCooldownSeconds.value);
    expect(OTP.validityMinutes.value * 60).toBe(OTP.validitySeconds.value);
    expect(OTP.verifiedValidityMinutes.value * 60).toBeLessThanOrEqual(OTP.validitySeconds.value);
    expect(OTP.verifiedValidityMinutes.value).toBeLessThan(ENVELOPE.linkTtlHoursDefault.value * 60);
  });

  test('every retention period outlives the cold archive and the database archive', () => {
    expect(ORG_STORAGE.minRetentionDays.value).toBeGreaterThanOrEqual(RETENTION_POLICY.archiveAfterDays.value);
    expect(RETENTION_POLICY.archiveAfterDays.value).toBeGreaterThan(ENVELOPE.archiveAfterDays.value);
    expect(ORG_STORAGE.minRetentionDays.value).toBeGreaterThan(ENVELOPE.archiveAfterDays.value);
    expect(RETENTION_POLICY.configurable.value).toBe(true);
  });

  test('restore on request serves files in a tier that needs one; evidence is never archived', () => {
    expect(ORG_STORAGE.restoreOnRequest.value).toMatch(/^live/);
    expect(NOT_SHIPPED).not.toContain('restore on request');
    expect(RESTORE.days.value).toBe(RETENTION_POLICY.restoredCopyDays.value);
    expect(RESTORE.firstPollHours.value).toBeLessThan(RESTORE.timeoutHours.value);
    expect(RESTORE.purgeAfterDays.value).toBeGreaterThan(ORG_STORAGE.defaultRetentionDays.value);
    expect(EVIDENCE.archived.value).toBe(false);
    expect(ORG_STORAGE.evidenceAlwaysImmediate.value).toBe(true);
  });

  test('an archived envelope (the 30-day view) is not an archived file (D2)', () => {
    expect(ENVELOPE.archiveAfterDays.value).toBeLessThan(RETENTION_POLICY.archiveAfterDays.value);
    expect(ARCHIVED_ENVELOPES.readOnlyWithDownloads.value).toBe(true);
    expect(ARCHIVED_ENVELOPES.signerLinkKeepsCopy.value).toBe(true);
    // The QR defect (D9) is documented against the archive threshold and tracked by a bb-sign issue.
    expect(VERIFY.qrFailsForArchivedEnvelopes.source).toContain('VerifySignatureSealUseCase.kt:40-44');
    expect(VERIFY_QR_ARCHIVED_ISSUE).toMatch(/^bb-sign#(\d+|pending)$/);
  });

  test('the webhook ladder is five steps and shorter than the disable rule implies', () => {
    expect(WEBHOOKS.retryLadder.value).toHaveLength(5);
    expect(WEBHOOKS.disableAfterLadders.value).toBeGreaterThanOrEqual(1);
    expect(WEBHOOK_EVENTS).toHaveLength(8);
    expect(WEBHOOK_EVENTS).toContain('envelope.evidence_issued');
    expect(WEBHOOK_EVENTS).toContain('document.restored');
    expect(new Set(WEBHOOK_EVENTS).size).toBe(WEBHOOK_EVENTS.length);
    expect(WEBHOOKS.deliveryLogRetentionDays.value).toBeGreaterThan(WEBHOOKS.retryLadderHoursApprox.value / 24);
  });

  test('a machine credential can never hold an escalation permission', () => {
    for (const key of ORG_API_NEVER) {
      const row = ORG_PERMISSIONS.find((p) => p.key === key);
      expect(row, key).toBeDefined();
      expect(row?.holders).not.toContain('org_api');
    }
    expect(ORG_API_NEVER).toContain('agreement:manage');
    expect(ORG_PERMISSIONS.find((p) => p.key === 'agreement:read')?.holders).toEqual(['platform_admin', 'org_admin', 'org_member', 'org_api']);
    expect(new Set(ORG_PERMISSIONS.map((p) => p.key)).size).toBe(ORG_PERMISSIONS.length);
  });

  test('agreements reach no signer in production (D4)', () => {
    expect(AGREEMENTS.pinAtSendInProduction.value).toBe(false);
    expect(AGREEMENTS.platformDefaultsSeeded.value).toBe(false);
    expect(EVIDENCE.agreementsAttachedInProduction.value).toBe(false);
    expect(NOT_SHIPPED).toContain('signer acceptance of agreement texts (data-processing authorization)');
  });

  test('workspace roles nest: viewer within auditor within contributor within manager', () => {
    const holds = (role: string) => WORKSPACE_PERMISSIONS.filter((p) => p.roles.includes(role as never)).map((p) => p.key);
    const [viewer, auditor, contributor, manager] = ['viewer', 'auditor', 'contributor', 'manager'].map(holds);
    for (const key of viewer ?? []) expect(auditor).toContain(key);
    for (const key of auditor ?? []) expect(contributor).toContain(key);
    for (const key of contributor ?? []) expect(manager).toContain(key);
    expect(manager).toContain('envelope:cancel');
    expect(contributor).not.toContain('envelope:cancel');
  });

  test('every status transition names known statuses', () => {
    for (const tr of ENVELOPE_TRANSITIONS) {
      expect(ENVELOPE_STATUSES).toContain(tr.from);
      expect(ENVELOPE_STATUSES).toContain(tr.to);
    }
  });

  test('certificate rules are consistent with the signing worker', () => {
    expect(CERTIFICATE.defaultKeyBits.value).toBeGreaterThanOrEqual(CERTIFICATE.minKeyBits.value);
    expect(CERTIFICATE.allowedExtensions.value).toContain('p12');
    expect(CERTIFICATE.pemCanSign.value).toBe(false);
    expect(CERTIFICATE.chainEmbedded.value).toBe('full chain from the uploaded file');
    expect(NOT_SHIPPED).not.toContain('full certificate chain in the seal');
    expect(CERTIFICATE.expiryNoticeDays.value).toEqual([30, 7]);
    expect(NOT_SHIPPED).not.toContain('certificate expiry emails');
    expect(CERTIFICATE.chainStatuses.value).toHaveLength(4);
    expect(CERTIFICATE.maxChainLength.value).toBeGreaterThan(1);
    expect(CERTIFICATE.testingCertificateBlocksSending.value).toBe(false);
  });

  test('the shipped items are off the not-shipped list, and only general rate limits remain there', () => {
    for (const shipped of ['evidence certificate PDF or export', 'rate limits', 'restore on request', 'certificate expiry emails', 'full certificate chain in the seal']) {
      expect(NOT_SHIPPED).not.toContain(shipped);
    }
    expect(NOT_SHIPPED).toContain('general API rate limits');
    expect(EVIDENCE.statuses.value).toContain('ISSUED');
    expect(new Set(NOT_SHIPPED).size).toBe(NOT_SHIPPED.length);
  });

  test('uploading a signature image is shipped, with the limits the signing page states (bb-sign#292)', () => {
    expect(NOT_SHIPPED).not.toContain('uploading a signature image');
    expect(SIGNER.signatureMethods.value).toEqual(['DRAWN', 'TYPED', 'UPLOADED_IMAGE']);
    // The resize notice is informational: it must start below the largest file the page accepts.
    expect(SIGNATURE_UPLOAD.resizeNoticeMb.value).toBeLessThan(SIGNATURE_UPLOAD.maxSourceMb.value);
    expect(SIGNATURE_UPLOAD.maxSourceMb.value).toBeLessThan(DOCUMENTS.maxUploadMb.value);
    expect(SIGNATURE_UPLOAD.formats.value).toBe('PNG, JPEG');
    expect(SIGNATURE_UPLOAD.removeBackgroundDefault.value).toBe(true);
    expect(SIGNATURE_UPLOAD.processedOnDevice.value).toBe(true);
    for (const f of Object.values(SIGNATURE_UPLOAD)) expect(f.source).toMatch(/\.(ts|tsx|json):\d/);
  });

  test('values given in two units agree', () => {
    expect(AUTH.bruteForceMaxWaitMinutes.value * 60).toBe(AUTH.bruteForceMaxWaitSeconds.value);
    expect(EVIDENCE.downloadLinkMinutes.value * 60).toBe(EVIDENCE.downloadLinkSeconds.value);
    expect(EVIDENCE.degradedAfterHours.value).toBeLessThan(EVIDENCE.degradedClampHours.value);
    expect(RATE_LIMITS.verifyFilePerMinutePerClient.value).toBe(VERIFY.fileRatePerMinute.value);
    expect(RATE_LIMITS.auditReadPerMinutePerCaller.value).toBe(AUDIT.readRatePerMinute.value);
    expect(VERIFY.fileMaxMb.value).toBe(DOCUMENTS.maxUploadMb.value);
    expect(AUDIT.exportPageMaxRows.value).toBeLessThan(AUDIT.exportMaxRows.value);
    expect(ADMIN_MFA.digits.value).toBe(OTP.digits.value);
    expect(AUTH.passwordMinLength.value).toBeLessThan(AUTH.passwordMaxLength.value);
  });

  test('the OTP is bound to the signer, not to a link (D10)', () => {
    expect(OTP.boundTo.value).toBe('the signer it was issued to');
    expect(SIGNER.authMethods.value).toEqual(['EMAIL_LINK', 'EMAIL_LINK_OTP']);
  });

  test('error codes are unique and carry a real status; 429 is not quota-only', () => {
    const codes = ERROR_CODES.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const e of ERROR_CODES) expect([400, 408, 409, 410, 413, 429, 503]).toContain(e.status);
    const tooMany = ERROR_CODES.filter((e) => e.status === 429).map((e) => e.code);
    expect(tooMany).toEqual(expect.arrayContaining(['QUOTA_EXCEEDED', 'RATE_LIMITED', 'RESTORE_LIMIT_REACHED']));
    expect(QUOTA.httpStatusWhenExhausted.value).toBe(429);
    for (const status of [408, 410, 413, 503]) expect(ERROR_CODES.some((e) => e.status === status), String(status)).toBe(true);
    expect(SDK.honoursRetryAfter.value).toBe(false);
  });

  test('retention per organization: the standard period sits inside the range a policy may take', () => {
    expect(p1Offenders(ORG_STORAGE)).toEqual([]);
    expect(ORG_STORAGE.minRetentionDays.value).toBeLessThan(ORG_STORAGE.defaultRetentionDays.value);
    expect(ORG_STORAGE.defaultRetentionDays.value).toBeLessThan(ORG_STORAGE.maxRetentionDays.value);
    expect(ORG_STORAGE.maxRetentionDays.value).toBe(3650);
    expect(ORG_STORAGE.maxRetentionYears.value * 365).toBe(ORG_STORAGE.maxRetentionDays.value);
    expect(ORG_STORAGE.legacyRetentionDays.value).toBe(ORG_STORAGE.defaultRetentionDays.value);
    expect(ORG_STORAGE.defaultCheaperTierAfterDays.value).toBeLessThan(ORG_STORAGE.defaultRetentionDays.value);
    expect(ORG_STORAGE.defaultAllImmediate.value).toBe(true);
    // A restore from the deepest tier finishes before a restore gives up.
    expect(RESTORE.timeoutHours.value).toBeGreaterThanOrEqual(ORG_STORAGE.deepestRestoreMaxHours.value);
    // A shorter period deletes long before a restored copy would be purged.
    expect(ORG_STORAGE.shortenDeletionDays.value).toBeLessThan(RESTORE.days.value);
    expect(ORG_STORAGE.requestReasonMin.value).toBeLessThan(ORG_STORAGE.requestReasonMax.value);
    expect(ORG_STORAGE.onePendingRequest.value).toBe(true);
    // Evidence is locked and always immediate; documents are versioned, not locked (plan D10).
    expect(ORG_STORAGE.evidenceLocked.value).toBe(true);
    expect(ORG_STORAGE.documentsVersionedNotLocked.value).toBe(true);
    expect(ORG_STORAGE.evidenceAlwaysImmediate.value).toBe(true);
    expect(ORG_STORAGE.onlyCompletedFilesNeedRestore.value).toBe(true);
    expect(ORG_STORAGE.certificateStatesPeriod.value).toBe(true);
    expect(ORG_STORAGE.archiveDatesVisible.value).toBe(false);
    expect(ORG_STORAGE.preparingBlocksUploads.value).toBe(true);
    // The permission is a real org permission, held by both admin roles and never by an API key.
    const row = ORG_PERMISSIONS.find((p) => p.key === ORG_STORAGE.managePermission.value);
    expect(row?.holders).toEqual(['platform_admin', 'org_admin']);
    expect(ORG_API_NEVER).toContain(ORG_STORAGE.managePermission.value);
    // Per-organization retention is shipped; billing and self-service plans are not.
    expect(NOT_SHIPPED).not.toContain('per-organisation retention');
    expect(NOT_SHIPPED).toContain('billing or self-service plans');
    expect(AUDIT_EVENT_TYPES).toEqual(
      expect.arrayContaining(['ORG_STORAGE_PROVISIONED', 'ORG_STORAGE_POLICY_CHANGED', 'ORG_STORAGE_POLICY_REQUESTED', 'ORG_STORAGE_POLICY_REQUEST_DECIDED']),
    );
  });

  test('an upload while the organization storage is being prepared is a 503 with Retry-After and stores nothing', () => {
    const row = ERROR_CODES.find((e) => e.code === 'STORAGE_NOT_READY');
    expect(row?.status).toBe(503);
    expect(row?.source).toMatch(P1_SOURCE);
    expect(STORAGE_NOT_READY.retryAfterSeconds.value).toBeGreaterThan(0);
    expect(STORAGE_NOT_READY.nothingStored.value).toBe(true);
    expect(p1Offenders(STORAGE_NOT_READY)).toEqual([]);
  });

  test('the sign call names every refusal with its own code (bb-sign#298, #292)', () => {
    const status = (code: string) => ERROR_CODES.find((e) => e.code === code)?.status;
    expect(status('SIGNATURE_IMAGE_INVALID')).toBe(400);
    expect(status('SIGNATURE_IMAGE_TOO_LARGE')).toBe(400);
    expect(status('SIGNATURE_METHOD_INVALID')).toBe(400);
    expect(status('SIGNATURE_UPLOAD_TIMEOUT')).toBe(408);
    expect(status('OTP_VERIFICATION_EXPIRED')).toBe(409);
    expect(status('SIGNING_BUSY')).toBe(503);
    // The body cap must hold the largest accepted PNG as a data URL plus 64 KiB of JSON (yml:248-249).
    const mib = 1024 * 1024;
    const dataUrlPrefix = 'data:image/png;base64,'.length;
    const minBody = dataUrlPrefix + Math.ceil((SIGN_REQUEST.maxPngMib.value * mib) / 3) * 4 + 64 * 1024;
    expect(minBody).toBe(SIGN_REQUEST.minBodyBytesForPng.value);
    expect(SIGN_REQUEST.maxBodyMib.value * mib).toBeGreaterThanOrEqual(minBody);
    // The server accepts less than the page lets a signer pick: the page reduces the image first.
    expect(SIGN_REQUEST.maxPngMib.value).toBeLessThan(SIGNATURE_UPLOAD.maxSourceMb.value);
    // Per-task limits hold as one number only while production runs one replica: their sources say so.
    for (const key of ['signPerMinutePerClient', 'signInFlightPerClient', 'signImageAttemptsPerLink'] as const) {
      expect(RATE_LIMITS[key].source, key).toContain('prod:18 (replicas: 1)');
    }
  });

  test('emails: the new notices are bilingual and reach the right people', () => {
    const byTemplate = (t: string) => EMAILS.find((e) => e.template === t);
    expect(byTemplate('certificate-expiring')?.recipient).toBe('org_admin');
    expect(byTemplate('document-restored')?.recipient).toBe('requester');
    expect(byTemplate('certificate-expiring')?.language).toBe('es+en');
    expect(byTemplate('document-restored')?.language).toBe('es+en');
    for (const email of EMAILS.filter((e) => e.recipient === 'signer')) expect(email.language, email.template).toBe('en');
    expect(new Set(AUDIT_EVENT_TYPES).size).toBe(AUDIT_EVENT_TYPES.length);
    expect(AUDIT_EVENT_TYPES).toEqual(expect.arrayContaining(['EVIDENCE_CERTIFICATE_ISSUED', 'DOCUMENT_RESTORED', 'CERTIFICATE_EXPIRING']));
    expect(URLS.verifyPath.value).toBe('/verify');
  });

  test('webhook tolerance matches the access-token lifetime', () => {
    expect(AUTH.tokenLifetimeSeconds.value).toBe(WEBHOOKS.toleranceSeconds.value);
  });

  test('facts rendered in both locales are language-neutral', () => {
    // A <Fact> renders the same text on the Spanish and the English page: formulas and times carry no prose.
    for (const formula of [CERTIFICATE.sealHashFormulaV1, CERTIFICATE.sealHashFormulaV2, CERTIFICATE.documentSetFormula]) {
      expect(formula.value).not.toMatch(/\b(for|sorted|by|and|of|then|joined)\b/i);
      expect(formula.value.startsWith('SHA-256(')).toBe(true);
    }
    expect(AUDIT.nightlyVerifyTime.value).toMatch(/^\d{2}:\d{2}$/);
    expect(AUDIT.nightlyVerifyTimeZone.value).toMatch(/^[A-Za-z]+\/[A-Za-z_]+$/);
    expect(ADMIN_MFA.enrolmentTitleEs.value).not.toBe(ADMIN_MFA.enrolmentTitleEn.value);
  });

  test('seal v2, the stored certificate fingerprint and the signed SHA-256 came with one release', () => {
    expect(DOCUMENTS.signedSha256Since.value).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(VERIFY.qrUsesStoredFingerprintSince.value).toBe(DOCUMENTS.signedSha256Since.value);
    expect(DOCUMENTS.sealRefusedOnHashMismatch.value).toBe(true);
  });

  test('evidence: re-issue window, signers and timing', () => {
    expect(EVIDENCE.reissueWindowDays.value).toBeGreaterThan(0);
    expect(EVIDENCE.reissueMax.value).toBeGreaterThan(0);
    expect(EVIDENCE.signersReceiveCertificate.value).toBe(false);
    expect(EVIDENCE.signerDownloadsUntil.value).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(EVIDENCE.usuallyIssuedWithinMinutes.value).toBe(true);
  });

  test('a shortened fingerprint shows both ends and hides the middle of the hash', () => {
    expect(SIGNER.fingerprintShownChars.value).toBeGreaterThan(0);
    expect(SIGNER.fingerprintShownChars.value * 2).toBeLessThan(64);
  });

  test('restore emails and re-requests', () => {
    expect(RESTORE.requestableAgainAfterWindow.value).toBe(true);
    expect(RESTORE.emailLinksToEnvelopeOrSigningPage.value).toBe(true);
    expect(RESTORE.emailGenericWithoutConfirmedAccess.value).toBe(true);
  });

  test('admin access: invitation, lost authenticator, certificate expiry highlight', () => {
    expect(AUTH.invitationActions.value[0]).toBe('UPDATE_PASSWORD');
    expect(AUTH.invitationActions.value).toContain('CONFIGURE_TOTP');
    expect(ADMIN_MFA.lostAuthenticatorResetBySupport.value).toBe(true);
    expect(ADMIN_MFA.passwordResetClearsSecondFactor.value).toBe(false);
    expect(CERTIFICATE.expiryHighlightDays.value).toBeGreaterThan(0);
    expect(AUDIT.orgEventsPublished.value).toBe(false);
  });

  test('the audit read throttle covers verification and export, never events', () => {
    expect(RATE_LIMITS.auditReadThrottledRoutes.value).toEqual(['verification', 'export']);
    expect(AUDIT.readRatePerMinute.value).toBe(RATE_LIMITS.auditReadPerMinutePerCaller.value);
    expect(AUDIT.readRatePerMinute.source).toBe(RATE_LIMITS.auditReadPerMinutePerCaller.source);
  });

  test('SDK: status-only errors, the Java verify-by-file defect and the jsr310 dependency', () => {
    expect(SDK.errorCarriesStatusOnly.value).toBe(true);
    expect(SDK.javaVerifyFileSendsPath.value).toBe(true);
    expect(SDK.javaVerifyFileSendsPath.source).toContain('bb-sign#281');
    expect(SDK.java.jsr310Dependency.value).toMatch(/^com\.fasterxml\.jackson\.datatype:jackson-datatype-jsr310$/);
  });

  test('signing order: 1-based, refused below 1 with VALIDATION_FAILED, groups are API-only (bb-sign#293, #128)', () => {
    expect(SIGNING_ORDER.minSignOrder.value).toBe(1);
    expect(SIGNING_ORDER.defaultSignOrder.value).toBe(SIGNING_ORDER.minSignOrder.value);
    expect(ERROR_CODES.find((e) => e.code === 'VALIDATION_FAILED')?.status).toBe(SIGNING_ORDER.refusedStatus.value);
    expect(SIGNING_ORDER.refusedInBothModes.value).toBe(true);
    // The API accepts equal values as one turn; the app never sends them.
    expect(SIGNING_ORDER.tiesSignAsGroup.value).toBe(true);
    expect(SIGNING_ORDER.wizardCreatesTies.value).toBe(false);
    expect(SIGNING_ORDER.wizardSendsListPosition.value).toBe(true);
    expect(SIGNING_ORDER.reorderControlsFromCards.value).toBe(2);
    expect(SIGNING_ORDER.removeFromCards.value).toBe(SIGNING_ORDER.reorderControlsFromCards.value);
    expect(SIGNING_ORDER.dragByPointerAndKeyboard.value).toEqual(['mouse', 'touch', 'keyboard']);
    for (const f of Object.values(SIGNING_ORDER)) expect(f.source).toMatch(/\.(ts|tsx|json|kt):\d/);
  });

  test('the wizard asks for the signers before the documents (bb-sign v0.35.0)', () => {
    const steps: readonly string[] = WIZARD.steps.value;
    expect(steps[0]).toBe('details');
    expect(steps.indexOf('signers')).toBeLessThan(steps.indexOf('documents'));
    expect(steps.indexOf('documents')).toBeLessThan(steps.indexOf('review'));
    expect(WIZARD.envelopeCreatedAtSend.value).toBe(true);
  });

  test('every fact module stays under 800 lines', () => {
    for (const file of readdirSync('src/content/facts')) {
      const lines = readFileSync(`src/content/facts/${file}`, 'utf8').split('\n').length;
      expect(lines, file).toBeLessThanOrEqual(800);
    }
  });
});
