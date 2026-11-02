/**
 * Sign prices. Prices are a business decision, so every source is an owner decision (plan D11), in the public-source
 * form "owner decision <date> in issue #<n>: <what was decided>". Re-exported from `sign.ts`; pages render the
 * amounts with `<Price>` and never type them.
 *
 * What is not decided is not written: no minimums, no setup fees, no checkout or self-service plans
 * (`NOT_SHIPPED` keeps "billing or self-service plans").
 */

import { fact } from './fact';

const OWNER = 'owner decision 2026-11-01 in issue #14';

export const PRICING = {
  /** Price per envelope, in Colombian pesos before IVA, with the standard configuration. */
  standardPerEnvelopeCop: fact(1000, `${OWNER}: standard configuration, COP 1000 per envelope plus IVA`),
  /** Price per envelope, in Colombian pesos before IVA, with a 10-year retention; Binary Bridges manages the tiers. */
  tenYearPerEnvelopeCop: fact(1200, `${OWNER}: 10-year retention, COP 1200 per envelope plus IVA, storage tiers managed by Binary Bridges`),
  /** Envelopes per month above which volume discounts apply. */
  volumeThresholdEnvelopesPerMonth: fact(100000, `${OWNER}: volume discounts above 100000 envelopes per month`),
  /** Lowest price per envelope with volume discounts, in Colombian pesos before IVA. */
  volumeFloorPerEnvelopeCop: fact(400, `${OWNER}: volume discounts down to COP 400 per envelope plus IVA`),
  /** What is billed: every envelope created, drafts and cancelled included, as the quota counts them. */
  billedUnit: fact('every created envelope, drafts and cancelled included', `${OWNER}: every created envelope counts, drafts and cancelled included, as the quota counts them`),
  /** With the 10-year price, Binary Bridges manages the storage tiers. */
  tenYearTiersManagedByBinaryBridges: fact(true, `${OWNER}: the 10-year price includes storage tiers managed by Binary Bridges`),
} as const;
