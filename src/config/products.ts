import type { StarlightSidebarTopicsUserConfig } from 'starlight-sidebar-topics';
import type starlightOpenAPI from 'starlight-openapi';
import { GITHUB_ORG } from './site';

type StarlightOpenAPIUserConfig = Parameters<typeof starlightOpenAPI>[0];

/**
 * The product registry: the ONLY place a Binary Bridges product is declared.
 *
 * Each product owns a URL prefix (`/<id>/`), a content folder
 * (`src/content/docs/<id>/` in Spanish, `src/content/docs/en/<id>/` in English),
 * one sidebar topic and one card on the hub. `tests/unit/products.test.ts`
 * fails when any of those exists without the others, so adding a product is:
 *
 *   1. an entry here,
 *   2. `index.mdx` in both content folders,
 *   3. the sidebar below, pointing at pages that exist.
 *
 * Products never share pages: a fact about bb-sign lives under `sign/` and
 * nowhere else.
 */
export type Locale = 'es' | 'en';
export type ProductId = 'sign';

/** Starlight's BCP 47 tags for each locale, used for translated labels. */
export const LOCALE_TAGS: Readonly<Record<Locale, string>> = { es: 'es-CO', en: 'en' };

export interface Localized {
  readonly es: string;
  readonly en: string;
}

/** A sidebar link to a page: `slug` is the path without locale, e.g. `sign/signing/index`. */
export interface SidebarPage {
  readonly slug: string;
  readonly label: Localized;
}

export interface SidebarGroup {
  readonly label: Localized;
  readonly pages: readonly SidebarPage[];
  readonly collapsed?: boolean;
}

export interface Product {
  /** URL prefix and content folder. Kebab-case, never translated. */
  readonly id: ProductId;
  /** Display name, never translated. */
  readonly name: string;
  readonly tagline: Localized;
  /** Where the product itself runs. */
  readonly appUrl: string;
  /** GitHub repository, `owner/name`. The sync script reads from it. */
  readonly repo: string;
  /** Node colour on the parent arc (homepage rebrand plan, D3). */
  readonly accent: 'seal';
  /** Files that stay canonical in the product repo and are copied in by `scripts/sync-product.mjs`. */
  readonly sync: {
    readonly openapi?: string;
    readonly extra?: readonly string[];
  };
  /** Starlight icon for the topic switcher. */
  readonly icon: string;
  readonly sidebar: readonly SidebarGroup[];
}

const page = (slug: string, es: string, en: string): SidebarPage => ({ slug, label: { es, en } });

export const PRODUCTS: readonly Product[] = [
  {
    id: 'sign',
    name: 'bb-sign',
    tagline: {
      es: 'Firma electrónica para organizaciones, con identificación de firmantes, documentos sellados, evidencia completa y API de integración.',
      en: 'Electronic signature for organizations, with signer identification, sealed documents, complete evidence and an integration API.',
    },
    appUrl: 'https://sign.binarybridges.co',
    repo: `${GITHUB_ORG}/bb-sign`,
    accent: 'seal',
    sync: {
      openapi: 'docs/api/openapi.json',
      extra: ['docs/api/webhook-signature-vectors.json'],
    },
    icon: 'document',
    sidebar: [
      {
        label: { es: 'Empezar', en: 'Start here' },
        pages: [
          page('sign/index', 'Qué es bb-sign', 'What bb-sign is'),
          page('sign/getting-started/your-account', 'Tu cuenta', 'Your account'),
          page('sign/getting-started/first-envelope', 'Tu primer sobre', 'Your first envelope'),
        ],
      },
      {
        label: { es: 'Conceptos', en: 'Concepts' },
        pages: [
          page('sign/concepts/organizations-workspaces-roles', 'Organizaciones, espacios y roles', 'Organizations, workspaces and roles'),
          page('sign/concepts/envelopes-and-signers', 'Sobres y firmantes', 'Envelopes and signers'),
          page('sign/concepts/documents', 'Documentos', 'Documents'),
          page('sign/concepts/signature-and-seal', 'Firma electrónica y sello', 'Electronic signature and seal'),
          page('sign/concepts/evidence-and-audit', 'Evidencia y auditoría', 'Evidence and audit'),
          page('sign/concepts/labels', 'Etiquetas', 'Labels'),
          page('sign/concepts/quotas', 'Cuotas', 'Quotas'),
        ],
      },
      {
        label: { es: 'Firmar un documento', en: 'Signing a document' },
        pages: [
          page('sign/signing/index', 'El camino del firmante', "The signer's path"),
          page('sign/signing/receiving-the-email', 'El correo de invitación', 'The invitation email'),
          page('sign/signing/review-and-identity', 'Revisar y verificar identidad', 'Review and verify identity'),
          page('sign/signing/sign-and-download', 'Firmar y descargar', 'Sign and download'),
          page('sign/signing/verify-a-document', 'Verificar un documento firmado', 'Verify a signed document'),
          page('sign/signing/troubleshooting', 'Si algo falla', 'If something goes wrong'),
        ],
      },
      {
        label: { es: 'Enviar a firma', en: 'Sending for signature' },
        pages: [
          page('sign/sending/create-an-envelope', 'Crear un sobre', 'Create an envelope'),
          page('sign/sending/documents', 'Adjuntar documentos', 'Attach documents'),
          page('sign/sending/signers-and-order', 'Firmantes y orden', 'Signers and order'),
          page('sign/sending/send-and-track', 'Enviar y seguir', 'Send and track'),
          page('sign/sending/cancel', 'Cancelar un sobre', 'Cancel an envelope'),
          page('sign/sending/download-signed-documents', 'Descargar documentos firmados', 'Download signed documents'),
          page('sign/sending/archived-envelopes', 'Sobres archivados', 'Archived envelopes'),
        ],
      },
      {
        label: { es: 'Administrar', en: 'Administer' },
        pages: [
          page('sign/admin/index', 'Administrar la organización', 'Administer the organization'),
          page('sign/admin/users-and-invitations', 'Usuarios e invitaciones', 'Users and invitations'),
          page('sign/admin/workspaces-and-members', 'Espacios y miembros', 'Workspaces and members'),
          page('sign/admin/labels', 'Claves de etiqueta', 'Label keys'),
          page('sign/admin/api-credentials', 'Credenciales de API', 'API credentials'),
          page('sign/admin/webhooks', 'Webhooks', 'Webhooks'),
          page('sign/admin/own-certificate', 'Certificado propio', 'Your own certificate'),
          page('sign/admin/storage', 'Almacenamiento', 'Storage'),
          page('sign/admin/quota-and-usage', 'Cuota y uso', 'Quota and usage'),
          page('sign/admin/audit-trail', 'Auditoría', 'Audit trail'),
          page('sign/admin/permissions', 'Matriz de permisos', 'Permissions matrix'),
        ],
      },
      {
        label: { es: 'Desarrolladores', en: 'Developers' },
        pages: [
          page('sign/developers/index', 'Plataforma para desarrolladores', 'Developer platform'),
          page('sign/developers/quickstart', 'Inicio rápido', 'Quickstart'),
          page('sign/developers/authentication', 'Autenticación de máquinas', 'Machine authentication'),
          page('sign/developers/envelope-walkthrough', 'De la credencial al documento firmado', 'From credential to signed document'),
          page('sign/developers/webhooks', 'Webhooks', 'Webhooks'),
          page('sign/developers/webhook-signature-spec', 'Especificación de firma de webhooks', 'Webhook signature specification'),
          page('sign/developers/errors', 'Errores', 'Errors'),
          page('sign/developers/migrating-from-adobe', 'Migrar desde Adobe Acrobat Sign', 'Migrating from Adobe Acrobat Sign'),
        ],
      },
      {
        label: { es: 'SDKs', en: 'SDKs' },
        pages: [
          page('sign/sdks/javascript', 'SDK de JavaScript', 'JavaScript SDK'),
          page('sign/sdks/java', 'SDK de Java', 'Java SDK'),
        ],
      },
      {
        label: { es: 'Legal', en: 'Legal' },
        pages: [
          page('sign/legal/terms', 'Términos y condiciones', 'Terms and conditions'),
          page('sign/legal/retention', 'Alcance y conservación', 'Scope and retention'),
          page('sign/legal/electronic-vs-digital-signature', 'Firma electrónica y firma digital', 'Electronic and digital signature'),
        ],
      },
      {
        label: { es: 'Referencia', en: 'Reference' },
        pages: [
          page('sign/reference/statuses', 'Estados', 'Statuses'),
          page('sign/reference/emails', 'Correos que envía bb-sign', 'Emails bb-sign sends'),
          page('sign/reference/glossary', 'Glosario', 'Glossary'),
        ],
      },
    ],
  },
];

export const PRODUCT_IDS: readonly ProductId[] = PRODUCTS.map((p) => p.id);

export const productById = (id: string): Product | undefined => PRODUCTS.find((p) => p.id === id);

/** `label` objects keyed the way Starlight expects: BCP 47 tags. */
const translated = (text: Localized): Record<string, string> => ({
  [LOCALE_TAGS.es]: text.es,
  [LOCALE_TAGS.en]: text.en,
});

/** `sign/signing/index.mdx` is the entry `sign/signing` in the docs collection. */
export const contentSlug = (fileSlug: string): string => fileSlug.replace(/\/index$/, '');

/** The topic configuration for `starlight-sidebar-topics`. `extraItems` lets a plugin append generated groups. */
export const topicFor = (product: Product, extraItems: readonly unknown[] = []): StarlightSidebarTopicsUserConfig[number] => ({
  id: product.id,
  label: translated({ es: product.name, en: product.name }),
  link: `/${product.id}/`,
  icon: product.icon as never,
  items: [
    ...product.sidebar.map((group) => ({
      label: group.label.es,
      translations: translated(group.label),
      collapsed: group.collapsed ?? false,
      items: group.pages.map((p) => ({ slug: contentSlug(p.slug), label: p.label.es, translations: translated(p.label) })),
    })),
    ...(extraItems as never[]),
  ],
});

/** The `starlight-openapi` schema entries for every product that publishes a spec. */
export const openApiFor = (product: Product): StarlightOpenAPIUserConfig =>
  product.sync.openapi
    ? [
        {
          base: `${product.id}/api`,
          schema: `./src/content/sync/${product.id}/openapi.json`,
          // The generated group label is a plain string (no per-locale object); "API" reads in both languages.
          sidebar: { label: 'API', collapsed: true, operations: { badges: true } },
        },
      ]
    : [];

/** Every path under `src/content/docs/` that belongs to a product, for the locale-parity test. */
export const sidebarSlugs = (product: Product): readonly string[] =>
  product.sidebar.flatMap((group) => group.pages.map((p) => p.slug));
