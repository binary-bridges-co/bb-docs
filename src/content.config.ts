import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { AUDIENCES, DESCRIPTION_MAX, DESCRIPTION_MIN, LEGAL_VERSION, PRODUCT_IDS } from './config/content-schema';

/**
 * Every documentation page declares which product it belongs to and who it is
 * for. `tests/unit/content.test.ts` checks that `product` equals the folder
 * the file lives in, so a bb-sign fact cannot end up under another product.
 */
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        description: z.string().min(DESCRIPTION_MIN).max(DESCRIPTION_MAX).optional(),
        product: z.enum(PRODUCT_IDS).optional(),
        audience: z.enum(AUDIENCES).optional(),
        /** Path in the product repo this page was derived from, when any. */
        source: z
          .string()
          .regex(/^[a-z0-9./_-]+$/i, 'source must be a repo-relative path')
          .optional(),
        /** Legal pages only. */
        legalVersion: z.string().regex(LEGAL_VERSION, 'legalVersion must look like "Versión 1 · 2026-10-07"').optional(),
      }),
    }),
  }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
