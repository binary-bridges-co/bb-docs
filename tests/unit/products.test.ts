import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { contentSlug, openApiFor, PRODUCT_IDS, PRODUCTS, productById, sidebarSlugs, topicFor } from '../../src/config/products';
import { PRODUCT_IDS as SCHEMA_PRODUCT_IDS } from '../../src/config/content-schema';

const DOCS = join(process.cwd(), 'src', 'content', 'docs');
const LOCALE_DIRS = ['', 'en'] as const;

const contentFile = (localeDir: string, slug: string): string => join(DOCS, localeDir, `${slug}.mdx`);
const exists = (localeDir: string, slug: string): boolean =>
  existsSync(contentFile(localeDir, slug)) || existsSync(contentFile(localeDir, slug).replace(/\.mdx$/, '.md'));

/**
 * The registry is the single place a product is declared. Everything else
 * (content folders, sidebar topics, the schema's enum, the hub) must agree
 * with it, so a product cannot be half-added or a page cannot land under
 * the wrong product.
 */
describe('product registry', () => {
  test('ids are unique, kebab-case and match the content schema enum', () => {
    expect(new Set(PRODUCT_IDS).size).toBe(PRODUCT_IDS.length);
    for (const id of PRODUCT_IDS) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect([...SCHEMA_PRODUCT_IDS].sort()).toEqual([...PRODUCT_IDS].sort());
  });

  test('every product has an index page in both locales', () => {
    for (const product of PRODUCTS) {
      for (const localeDir of LOCALE_DIRS) {
        expect(exists(localeDir, `${product.id}/index`), `${localeDir}/${product.id}/index.mdx`).toBe(true);
      }
    }
  });

  test('every content folder is a registered product', () => {
    for (const localeDir of LOCALE_DIRS) {
      const folders = readdirSync(join(DOCS, localeDir)).filter(
        (name) => statSync(join(DOCS, localeDir, name)).isDirectory() && name !== 'en',
      );
      expect(folders.filter((f) => !PRODUCT_IDS.includes(f as never))).toEqual([]);
    }
  });

  test('every sidebar slug resolves to a page in both locales', () => {
    for (const product of PRODUCTS) {
      const missing = sidebarSlugs(product).flatMap((slug) =>
        LOCALE_DIRS.filter((localeDir) => !exists(localeDir, slug)).map((localeDir) => `${localeDir || 'es'}:${slug}`),
      );
      expect(missing).toEqual([]);
    }
  });

  test('sidebar slugs are unique and stay under the product prefix', () => {
    for (const product of PRODUCTS) {
      const slugs = sidebarSlugs(product);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) expect(slug.startsWith(`${product.id}/`)).toBe(true);
    }
  });

  test('topics carry a label in both locales and link to the product prefix', () => {
    for (const product of PRODUCTS) {
      const topic = topicFor(product) as unknown as {
        link: string;
        label: Record<string, string>;
        items: readonly { label: string; translations: Record<string, string>; items: readonly { slug: string }[] }[];
      };
      expect(topic.link).toBe(`/${product.id}/`);
      expect(topic.label).toEqual({ 'es-CO': product.name, en: product.name });
      const groups = topic.items;
      expect(groups.length).toBe(product.sidebar.length);
      for (const group of groups) {
        expect(group.translations['es-CO']).toBeTruthy();
        expect(group.translations.en).toBeTruthy();
        for (const item of group.items) expect(item.slug).not.toMatch(/\/index$/);
      }
    }
  });

  test('a product with a spec publishes its API under <id>/api', () => {
    for (const product of PRODUCTS) {
      const entries = openApiFor(product);
      if (product.sync.openapi) {
        expect(entries).toHaveLength(1);
        expect(entries[0]?.base).toBe(`${product.id}/api`);
        expect(existsSync(join(process.cwd(), entries[0]?.schema ?? ''))).toBe(true);
      } else {
        expect(entries).toEqual([]);
      }
    }
  });

  test('helpers', () => {
    expect(contentSlug('sign/index')).toBe('sign');
    expect(contentSlug('sign/signing/index')).toBe('sign/signing');
    expect(contentSlug('sign/signing/troubleshooting')).toBe('sign/signing/troubleshooting');
    expect(productById('sign')?.name).toBe('bb-sign');
    expect(productById('nope')).toBeUndefined();
  });
});
