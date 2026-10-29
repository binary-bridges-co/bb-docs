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
  OTP,
  PERMISSION_SCOPE,
  QUOTA,
  RATE_LIMITS,
  REMINDERS,
  RESTORE,
  RETENTION_IMPLEMENTED,
  RETENTION_POLICY,
  SDK,
  SIGNATURE_UPLOAD,
  SIGNER,
  URLS,
  VERIFY,
  VERIFY_QR_ARCHIVED_ISSUE,
  WEBHOOKS,
  WEBHOOK_EVENTS,
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
      REMINDERS, QUOTA, WEBHOOKS, RATE_LIMITS, VERIFY, SDK, CERTIFICATE, EVIDENCE, AUDIT, RETENTION_POLICY,
      RETENTION_IMPLEMENTED, RESTORE,
    };
    expect(walk(groups, 'facts')).toEqual([]);
    for (const email of EMAILS) expect(email.source.length).toBeGreaterThan(10);
    for (const error of ERROR_CODES) expect(error.source.length, error.code).toBeGreaterThan(10);
  });

  test('an OTP outlives its resend cooldown and its verified window fits the link', () => {
    expect(OTP.validitySeconds.value).toBeGreaterThan(OTP.resendCooldownSeconds.value);
    expect(OTP.validityMinutes.value * 60).toBe(OTP.validitySeconds.value);
    expect(OTP.verifiedValidityMinutes.value * 60).toBeLessThanOrEqual(OTP.validitySeconds.value);
    expect(OTP.verifiedValidityMinutes.value).toBeLessThan(ENVELOPE.linkTtlHoursDefault.value * 60);
  });

  test('the retention policy outlives the cold archive and the database archive', () => {
    expect(RETENTION_POLICY.retentionDays.value).toBeGreaterThan(RETENTION_POLICY.archiveAfterDays.value);
    expect(RETENTION_POLICY.archiveAfterDays.value).toBeGreaterThan(ENVELOPE.archiveAfterDays.value);
    expect(RETENTION_POLICY.configurable.value).toBe(false);
  });

  test('what runs today never claims more than the policy (production wins over the template, D1)', () => {
    // Live: one 365-day expiration on the whole bucket, no transition to archive storage.
    expect(RETENTION_IMPLEMENTED.documentsExpirationDays.value).toBe(RETENTION_POLICY.retentionDays.value);
    expect(RETENTION_IMPLEMENTED.documentsArchiveTransitionLive.value).toBe(false);
    expect(RETENTION_IMPLEMENTED.documentsExpirationDays.source).toContain('live read 2026-10-21');
    // The template's numbers are kept as declared, never as what happens.
    expect(RETENTION_IMPLEMENTED.documentsGlacierDaysDeclared.value).toBe(RETENTION_POLICY.archiveAfterDays.value);
    expect(RETENTION_IMPLEMENTED.documentsGlacierDaysDeclared.source).toContain('not applied');
    expect(RETENTION_IMPLEMENTED.archiveDatesVisible.value).toBe(false);
    // Restore is deployed and idle; it is no longer "not shipped".
    expect(RETENTION_IMPLEMENTED.restoreOnRequest.value).toMatch(/^deployed, idle/);
    expect(NOT_SHIPPED).not.toContain('restore on request');
    expect(RESTORE.days.value).toBe(RETENTION_POLICY.restoredCopyDays.value);
    expect(RESTORE.firstPollHours.value).toBeLessThan(RESTORE.timeoutHours.value);
    expect(RESTORE.purgeAfterDays.value).toBeGreaterThan(RETENTION_POLICY.retentionDays.value);
    // Evidence is kept as long as the documents and never archived.
    expect(EVIDENCE.retentionDays.value).toBe(RETENTION_POLICY.retentionDays.value);
    expect(EVIDENCE.archived.value).toBe(false);
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
    for (const e of ERROR_CODES) expect([408, 409, 410, 413, 429, 503]).toContain(e.status);
    const tooMany = ERROR_CODES.filter((e) => e.status === 429).map((e) => e.code);
    expect(tooMany).toEqual(expect.arrayContaining(['QUOTA_EXCEEDED', 'RATE_LIMITED', 'RESTORE_LIMIT_REACHED']));
    expect(QUOTA.httpStatusWhenExhausted.value).toBe(429);
    for (const status of [408, 410, 413, 503]) expect(ERROR_CODES.some((e) => e.status === status), String(status)).toBe(true);
    expect(SDK.honoursRetryAfter.value).toBe(false);
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

  test('evidence: re-issue window, signer copy and timing', () => {
    expect(EVIDENCE.reissueWindowDays.value).toBeGreaterThan(0);
    expect(EVIDENCE.reissueMax.value).toBeGreaterThan(0);
    expect(EVIDENCE.signerCopyIncludesAuditTrail.value).toBe(false);
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

  test('admin access: invitation, lost authenticator, certificate expiry highlight, storage action', () => {
    expect(AUTH.invitationActions.value[0]).toBe('UPDATE_PASSWORD');
    expect(AUTH.invitationActions.value).toContain('CONFIGURE_TOTP');
    expect(ADMIN_MFA.lostAuthenticatorResetBySupport.value).toBe(true);
    expect(ADMIN_MFA.passwordResetClearsSecondFactor.value).toBe(false);
    expect(CERTIFICATE.expiryHighlightDays.value).toBeGreaterThan(0);
    expect(RETENTION_IMPLEMENTED.storageApplyWritesProduction.value).toBe(true);
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

  test('every fact module stays under 800 lines', () => {
    for (const file of readdirSync('src/content/facts')) {
      const lines = readFileSync(`src/content/facts/${file}`, 'utf8').split('\n').length;
      expect(lines, file).toBeLessThanOrEqual(800);
    }
  });
});
