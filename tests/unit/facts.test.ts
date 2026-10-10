import { describe, expect, test } from 'vitest';
import {
  AUTH,
  CERTIFICATE,
  EMAILS,
  ENVELOPE,
  ENVELOPE_STATUSES,
  ENVELOPE_TRANSITIONS,
  LIMITS,
  NOT_SHIPPED,
  ORG_API_NEVER,
  ORG_PERMISSIONS,
  OTP,
  RETENTION_IMPLEMENTED,
  RETENTION_POLICY,
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
    expect(walk({ AUTH, ENVELOPE, OTP, WEBHOOKS, CERTIFICATE, RETENTION_POLICY, RETENTION_IMPLEMENTED }, 'facts')).toEqual([]);
    for (const row of LIMITS) expect(row.source.length).toBeGreaterThan(10);
    for (const email of EMAILS) expect(email.source.length).toBeGreaterThan(10);
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

  test('what runs today never claims more than the policy', () => {
    expect(RETENTION_IMPLEMENTED.documentsGlacierDays.value).toBe(RETENTION_POLICY.archiveAfterDays.value);
    expect(RETENTION_IMPLEMENTED.documentsExpirationRule.value).toBe('none');
    expect(RETENTION_IMPLEMENTED.restoreOnRequest.value).toBe(false);
    expect(NOT_SHIPPED).toContain('restore on request');
  });

  test('the webhook ladder is five steps and shorter than the disable rule implies', () => {
    expect(WEBHOOKS.retryLadder.value).toHaveLength(5);
    expect(WEBHOOKS.disableAfterLadders.value).toBeGreaterThanOrEqual(1);
    expect(WEBHOOK_EVENTS).toHaveLength(6);
    expect(WEBHOOKS.deliveryLogRetentionDays.value).toBeGreaterThan(WEBHOOKS.retryLadderHoursApprox.value / 24);
  });

  test('a machine credential can never hold an escalation permission', () => {
    for (const key of ORG_API_NEVER) {
      const row = ORG_PERMISSIONS.find((p) => p.key === key);
      expect(row, key).toBeDefined();
      expect(row?.holders).not.toContain('org_api');
    }
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
    expect(CERTIFICATE.chainEmbedded.value).toBe('leaf only');
    expect(NOT_SHIPPED).toContain('full certificate chain in the seal');
  });

  test('the limits table covers the policy and the auth facts', () => {
    const keys = LIMITS.map((r) => r.key);
    for (const key of ['retentionPolicy', 'archivePolicy', 'tokenLifetime', 'credentialsPerOrg', 'otpValidity', 'linkTtl']) {
      expect(keys).toContain(key);
    }
    expect(new Set(keys).size).toBe(keys.length);
    expect(AUTH.tokenLifetimeSeconds.value).toBe(WEBHOOKS.toleranceSeconds.value);
  });
});
