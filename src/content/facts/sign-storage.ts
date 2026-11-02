/**
 * Dedicated storage and the retention policy of each organization (Sign v0.42.0, live in production with dedicated
 * storage switched on). Re-exported from `sign.ts`. Every source follows the public-source rule (plan P1): Sign
 * behaviour at a release, production configuration by read date, or an owner decision. No storage names, no
 * vendor names, no tier identifiers: the pages describe tiers by availability, in the app's own words (plan D6).
 */

import { fact } from './fact';

const V = 'Sign v0.42.0 behaviour';
const PROD = 'production configuration, read 2026-11-01';

export const ORG_STORAGE = {
  // ------------------------------------------------ the standard configuration
  /** Days each file is kept in the standard configuration (a new organization's policy), then deleted for good. */
  defaultRetentionDays: fact(365, `${PROD}: the standard policy keeps each file 365 days; ${V}: a new organization starts with it`),
  /** In the standard configuration, files move once to a cheaper tier after this many days. */
  defaultCheaperTierAfterDays: fact(30, `${PROD}: the standard policy moves files once, after 30 days, to a cheaper tier`),
  /** Every tier of the standard configuration keeps "Acceso inmediato": no file ever needs a restore. */
  defaultAllImmediate: fact(true, `${PROD}: the one tier of the standard policy is shown as "Acceso inmediato"`),

  // ------------------------------------------------ what can be changed
  /** Shortest period the Storage editor accepts, so documents of envelopes still being signed stay available. */
  minRetentionDays: fact(90, `${V}: the Storage editor refuses fewer than 90 days, to protect envelopes still being signed`),
  /** Longest period, in days (terms Versión 6 §3.1: at most 10 years, 3650 days). */
  maxRetentionDays: fact(3650, `${V}: the Storage editor accepts at most 3650 days; terms Versión 6 §3.1`),
  /** The same maximum in years, for prose. `facts.test.ts` keeps the two consistent. */
  maxRetentionYears: fact(10, `${V}: the Storage editor shows the 3650-day maximum as 10 years; terms Versión 6 §3.1`),
  /** Tiers a policy may have, each later and cheaper than the one before, with a minimum stay in each. */
  maxTiers: fact(5, `${V}: the Storage editor refuses more than 5 tiers and tiers out of order`),
  /** A restore from the deepest tier is ready in up to this many hours. */
  deepestRestoreMaxHours: fact(12, `${V}: the app labels the deepest tier as restorable in up to 12 hours`),
  /** Files created before the organization's dedicated storage keep the previous rule. */
  legacyRetentionDays: fact(365, `${V}: the Storage tab says files created before the dedicated storage keep the previous policy, 365 days`),
  /** After a shorter period is applied, files older than it are deleted within about this many days. */
  shortenDeletionDays: fact(2, `${V}: the shortening dialog says older files are deleted in about 2 days`),

  // ------------------------------------------------ requesting a change
  /** Shortest reason a change request accepts, in characters. */
  requestReasonMin: fact(10, `${V}: a change request refuses a reason under 10 characters`),
  /** Longest reason a change request accepts, in characters. */
  requestReasonMax: fact(1000, `${V}: a change request accepts a reason of at most 1000 characters`),
  /** One pending request per organization; it can be withdrawn. */
  onePendingRequest: fact(true, `${V}: a second request is refused while one is pending; the pending one can be withdrawn`),
  /** The permission that shows the Storage tab and allows a request (organization and platform admins). */
  managePermission: fact('document-settings:manage', `${V}: the Storage tab and change requests need document-settings:manage, held by platform_admin and org_admin`),

  // ------------------------------------------------ protection and availability
  /** Evidence certificates and their audit trail are locked against deletion until the end of the period in force when issued. */
  evidenceLocked: fact(true, `${V}: each evidence certificate and its audit trail is stored with a deletion lock until issue plus the period in force`),
  /** Documents and signed PDFs are versioned, not locked: kept for the period, then deleted. */
  documentsVersionedNotLocked: fact(true, `${V}: documents and signed PDFs are stored with versioning and no deletion lock`),
  /** Evidence certificates are never moved to a tier that needs a restore. */
  evidenceAlwaysImmediate: fact(true, `${V}: the Storage editor says evidence certificates always stay instantly available`),
  /** Only originals of completed envelopes and signed PDFs can ever need a restore; drafts never. */
  onlyCompletedFilesNeedRestore: fact(true, `${V}: only originals of completed envelopes and signed PDFs move to tiers; drafts and evidence never do`),
  /** The evidence certificate states the retention period of each file. */
  certificateStatesPeriod: fact(true, `${V}: the evidence certificate prints each file's period, one line per period when they differ; terms Versión 6 §3.4`),
  /** "Se archiva a partir del" dates are hidden on the envelope page and in the API. */
  archiveDatesVisible: fact(false, `${PROD}: archive dates are not shown on the envelope page or in the API`),
  /** While the storage is being prepared, uploads are refused and nothing is stored. */
  preparingBlocksUploads: fact(true, `${V}: uploads answer 503 STORAGE_NOT_READY while the organization's storage is being prepared`),
  /** Restore on request serves files in a tier that needs a restore; the standard configuration has none. */
  restoreOnRequest: fact('live, for files in a tier that needs a restore', `${V}: restore on request serves files in a tier that needs a restore`),
} as const;
