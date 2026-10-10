# Plan: bb-docs, the Binary Bridges documentation hub, starting with bb-sign

## Summary

Build `bb-docs` as a static Astro 7 + Starlight site at `https://docs.binarybridges.co`, on the exact
toolchain, tokens, tests and container pipeline of `bb-homepage`. The hub is organised **per product**:
every page lives under a product prefix (`/sign/…` today, `/control/…` later), each product has its own
sidebar, and a single registry file is the only place a product is declared. The first and only product
documented in this plan is **bb-sign**: concepts, the sender's path, the signer's path, every org-admin
and org-user operation, the developer platform (API, webhooks, SDKs), the terms and scope of the service
with its fixed retention, and a guide that tells customers to seal with **their own certificate** and
where to buy one.

This plan **supersedes** `bb-homepage/.claude/PRPs/plans/bb-docs-hub.plan.md` (2026-09-26, Docusaurus,
"publish only"). The user's 2026-10-07 brief changes both premises: the stack must mirror bb-homepage,
and bb-docs must *author* product documentation, not only republish `bb-sign/docs/api`.

## User Story

As an **org admin, org user, external signer or integrator of a Binary Bridges product**, I want one
documentation site where I can jump straight to my product and find what I can do, how to sign, what the
service does and does not do, and how to integrate, so that I can use bb-sign without asking anyone and
without confusing it with another Binary Bridges product.

## Problem → Solution

bb-sign's only documentation is six English markdown files in a private repo (`bb-sign/docs/api/`, about
4,300 lines, plus a 2,341-line `openapi.json`), aimed only at developers. Nothing documents the admin UI,
the signing ceremony, roles, retention, the terms, or the certificate. The homepage already links to
`docs.binarybridges.co/sign/` behind a `DOCS_LIVE = false` flag that is waiting for this repo.
→ A bilingual (es root, `/en/`), branded, searchable Starlight site with one topic per product, a
verified fact sheet behind every claim, generated API reference, SDK pages, and legal pages, deployed
through the same GHCR → Flux path as the homepage.

## Metadata
- **Complexity**: XL (new repo, about 60 source/config files, about 90 content files in two languages,
  two small cross-repo PRs). Split into five phases that each ship on their own.
- **Source PRD**: N/A. Free-form brief, 2026-10-07. Predecessor plan: `bb-homepage/.claude/PRPs/plans/bb-docs-hub.plan.md`.
- **PRD Phase**: N/A
- **Estimated Files**: 60 in bb-docs (excluding content), 90 content pages, 6 in bb-infrastructure, 1 in bb-homepage
- **Repo**: `/Users/edward.montoya/code/binarybridges/bb-docs` (empty, one commit, `README.md` only)
- **Verified against**: bb-homepage `origin/main` `e26bef7`, bb-sign `main` working tree (2026-10-07), bb-infrastructure `main` working tree

---

## Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Stack | **Astro `^7.3.5` + `@astrojs/starlight` `^0.42`**, npm, Node 22 (`.nvmrc` = `22`), TypeScript strict, Tailwind v4 via `@tailwindcss/vite` + `@astrojs/starlight-tailwind`, Vitest 5, Playwright 1.63 + axe. Not Docusaurus. | The brief says "similar as bb-homepage". Starlight 0.42 is the release line for Astro 7 (requires astro ≥ 7.2.10) and gives the Stripe-shaped layout (left nav, content, right "On this page", search, dark mode, i18n) without writing it. |
| D2 | Product isolation | **One Starlight "topic" per product** via `starlight-sidebar-topics` (0.9.0, peer `@astrojs/starlight >=0.42.0`, `astro ^7.2.10`). Content lives under `src/content/docs/<productId>/…` (es) and `src/content/docs/en/<productId>/…` (en). `src/config/products.ts` is the **single registry**; a unit test fails the build when a content folder, topic or hub card exists without a registry entry, or the other way round. | "Very well divided and easy to jump between docs" and "you should not confuse the products". The topic switcher sits at the top of the sidebar; the URL prefix names the product everywhere. |
| D3 | Languages | **Spanish at `/`** (`defaultLocale: 'root'`, `lang: 'es-CO'`), **English at `/en/`**. English slugs in both. Untranslated pages fall back to Spanish with Starlight's notice. | Mirrors bb-homepage (`astro.config.mjs:20-25`) and bb-sign's Colombian audience. The legal texts are canonical in Spanish (LV contract D-17). |
| D4 | What bb-docs owns | bb-docs **authors** all product documentation. Two artefacts stay canonical in bb-sign and are **copied in by a script, never edited here**: `docs/api/openapi.json` and `docs/api/webhook-signature-vectors.json`. The copy records the bb-sign commit and the SHA-256 in `src/content/sync/sign.json`. | The brief wants admin, signer and legal docs that do not exist in bb-sign. The API contract is generated from code, so it must keep one source. |
| D5 | Truth gate | Every factual claim about bb-sign is backed by a **fact sheet** (`src/content/facts/sign.ts`, typed constants with a `source` comment: `file:line` in bb-sign or bb-infrastructure). MDX pages import the numbers from it; prose never hardcodes a number. **Only what is on bb-sign `main` is documented as a feature.** Policy decisions that are binding but not yet enforced in code (the 365-day retention) are documented as *terms*, with the words "policy" and never "the system deletes". | The homepage README rule: "Claims about bb-sign must stay verifiable in the bb-sign repo". Section "Fact sheet" below lists what is and is not shipped. |
| D6 | API reference | `starlight-openapi` (0.27.0, peer `@astrojs/starlight >=0.41.0`, `astro >=7.0.2`, `@astrojs/markdown-satteri >=0.3.2`) renders `openapi.json` at `/sign/api/`. English only; the Spanish tree reaches it through fallback. No "try it" console. | PRD decision in `bb-sign/.claude/PRPs/prds/developer-platform-sdk-webhooks.prd.md:53`: "published OpenAPI docs are sufficient for v1". |
| D7 | Brand | bb-homepage `src/styles/tokens.css` copied verbatim and mapped onto Starlight's `--sl-*` variables in `src/styles/starlight-theme.css`. Geist + Geist Mono via fontsource. Logo = homepage `Logo.astro` exported as `src/assets/logo-light.svg` / `logo-dark.svg`. **Brass (`seal`) only inside bb-sign pages that talk about the seal, evidence and verification.** No emoji, no typed arrows (unit test). | Same family as the homepage and the product (`tokens.css:1-16`, bb-sign `DESIGN-GUIDELINES.md` §2, §6). |
| D8 | Theme toggle | Keep Starlight's light/dark toggle. Its inline theme script is whitelisted by hash in `security-headers.conf`, enforced by `scripts/check-csp.mjs` (copied from the homepage). Default follows the system. | Documentation readers expect a toggle (Stripe has one). The homepage's "no toggle" decision was about a marketing page with one inline script; here the CSP hash check keeps the same guarantee. |
| D9 | Deploy | Same container as the homepage: `node:22-slim` build → `nginxinc/nginx-unprivileged:1.30-alpine`, port **3000**, `/healthz`, security headers, immutable `/_astro/`, `no-cache` HTML. CI pushes `ghcr.io/binary-bridges-co/bb-docs:{latest,<sha>,main-<UTC ts>-<sha>}`. **bb-infrastructure** gets `apps/docs/` + `automation/docs/`, copied from `apps/homepage/` and `automation/homepage/`. DNS A record at Namecheap is a user action. | bb-homepage `origin/main` `pipeline.yml`; bb-infrastructure `apps/homepage/*.yaml`, `automation/homepage/*.yaml`. The Swarm deploy in the old plan is gone (`bb-homepage` PR #3). |
| D10 | Terms location | The bb-sign terms are rendered in bb-docs at `/sign/legal/terms/` as a Starlight page carrying the same **version + date + "Pendiente de revisión jurídica"** header. The text is the LV-contract clauses T1–T7 and the Versión 1 draft from bb-sign worktree `lv208-certificate-notice-terms/docs/legal/terminos-y-condiciones.md`. When bb-sign#208 merges, the sync script also copies that file and a test asserts the versions match. | LV contract D-17 makes `bb-sign/docs/legal/terminos-y-condiciones.md` canonical and renders it in the app at `/legal/terminos`. That PR is not merged. bb-docs must not create a second, diverging source, so it mirrors the same text and version. **User decision recorded in Notes.** |
| D11 | Certificate guide | One page, `/sign/admin/own-certificate/`, built from the bb-sign guide draft `docs/guias/certificado-propio.md` (worktree `lv208-certificate-notice-terms`) plus a "where to buy" section: ONAC-accredited ECDs for Colombia, AATL members for other countries, and the hard requirement that the certificate be delivered as a **PKCS#12 file with an exportable RSA ≥ 2048 key**. | The brief: "clearly recommend to use the customer company own signature, and recommend some places where to buy it". bb-sign cannot use USB tokens or cloud HSM keys (`CertificateResolverService.kt:148-163`). |
| D12 | Content format | `.mdx` for every guide page (so `<Tabs>`, `<Aside>`, `<Steps>`, `<Card>` and fact imports work), `.md` only for legal texts. Frontmatter is validated by a Zod schema extension in `src/content.config.ts`: `title`, `description` (50–170 chars), `product` (must equal the folder), `audience` (`admin | user | signer | developer | legal | all`), `source` (optional, a bb-sign path). | Starlight's Stripe-like components; the homepage validates frontmatter the same way (`content.config.ts:28-56`). |

---

## UX Design

### Before
```
┌────────────────────────────────────────────────────────────────┐
│ bb-sign/docs/api/*.md in a private GitHub repo                 │
│ - English only, developers only                                │
│ - no admin, signer, legal or certificate documentation         │
│ homepage: docs links hidden (DOCS_LIVE = false)                │
│ docs.binarybridges.co: does not resolve                        │
└────────────────────────────────────────────────────────────────┘
```

### After
```
docs.binarybridges.co                                     [ES|EN] [search] [light/dark]
┌───────────────────┬──────────────────────────────────────┬────────────────────┐
│ ◇ Productos       │  /                                   │                    │
│   bb-sign  ●brass │  Hub: one card per product           │                    │
│   (bb-control)    │  "bb-sign — firma electrónica…"      │                    │
│                   │                                      │                    │
│ ─ bb-sign ─────── │  /sign/                              │  En esta página    │
│ Introducción      │  Qué es bb-sign y qué no es          │  - Alcance         │
│ Conceptos         │  Alcance: integridad, identificación,│  - Quién lo usa    │
│ Primeros pasos    │  trazabilidad. Conservación: cliente │  - Cómo navegar    │
│ Firmar (firmante) │                                      │                    │
│ Enviar (usuarios) │  /sign/signing/…  paso a paso        │                    │
│ Administrar       │  /sign/admin/…    cada operación     │                    │
│ Desarrolladores   │  /sign/developers/… + /sign/api/     │                    │
│ SDKs              │  /sign/sdks/javascript, /java        │                    │
│ Legal             │  /sign/legal/terms, /retention       │                    │
│ Referencia        │  /sign/reference/limits, /statuses   │                    │
└───────────────────┴──────────────────────────────────────┴────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Find bb-sign docs | Repo access | `docs.binarybridges.co/sign/`, linked from the homepage once `DOCS_LIVE` flips | homepage `src/config/site.ts:11-13` |
| Choose a product | n/a | Topic switcher at the top of the sidebar; URL prefix names the product | starlight-sidebar-topics |
| Language | English only | ES at `/`, EN at `/en/`, switcher in the header | Starlight i18n |
| Search | none | Pagefind, built at `astro build`, no third party | Starlight default |
| API reference | raw `reference.md` | Rendered endpoints and schemas at `/sign/api/` | starlight-openapi |
| Code samples | one language per block | Tabs: curl / JavaScript / Java | Starlight `<Tabs>` |
| Terms and retention | nowhere | `/sign/legal/terms/`, `/sign/legal/retention/` | version header, "Pendiente de revisión jurídica" |
| Certificate | hidden platform-admin screen | Guide with purchase recommendations | `/sign/admin/own-certificate/` |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `../bb-homepage/package.json` | all | Versions and scripts to copy |
| P0 | `../bb-homepage/astro.config.mjs` | 16-75 | `output: 'static'`, i18n, shiki themes, vite tailwind plugin |
| P0 | `../bb-homepage/src/styles/tokens.css` | 17-84 | Copy verbatim; the `--sl-*` mapping is derived from it |
| P0 | `../bb-homepage/Dockerfile`, `nginx.conf`, `security-headers.conf`, `scripts/check-csp.mjs` | all | Copy; change only the CSP hashes and the redirects include |
| P0 | `../bb-homepage/.github/workflows/pipeline.yml` (**`origin/main`**, not the local checkout) | all | The verify → build-and-push pipeline with the `main-<ts>-<sha>` tag |
| P0 | `../bb-infrastructure/apps/homepage/{deployment,ingress,kustomization}.yaml`, `automation/homepage/*.yaml`, `apps/kustomization.yaml`, `automation/kustomization.yaml` | all | Copy for `apps/docs/` |
| P0 | `../bb-sign/docs/api/{quickstart,machine-authentication,webhooks,webhook-signature-spec,migrating-from-adobe}.md` | all | Content to migrate (with the corrections listed in "Fact sheet → Inaccuracies") |
| P0 | `../bb-sign/sdk-js/README.md`, `../bb-sign/sdk-java/README.md`, `../bb-sign/sdk-java/README-INSTALL.md` | all | SDK pages |
| P0 | `../bb-sign/.claude/worktrees/legal-validity-plans/.claude/PRPs/design/legal-validity-evidence-contract.md` | 1-20, 249-262, 281-300, 453-503 | Scope, retention policy, terms clauses T1–T7, legal matrix |
| P0 | `../bb-sign/.claude/worktrees/lv208-certificate-notice-terms/docs/legal/terminos-y-condiciones.md` and `docs/guias/certificado-propio.md` | all | Terms Versión 1 and the certificate guide drafts |
| P1 | `../bb-sign/edge-api/src/main/kotlin/co/binarybridges/sign/edge/domain/security/{Permission,PermissionCatalog,WorkspaceRole,WorkspaceRoleBundles}.kt` | all | Roles and permissions matrix |
| P1 | `../bb-sign/edge-api/src/main/resources/application.yml` | 150-195 | Defaults: archive 30 d, lifecycle 365/30/90, expiration cron, OTP cooldown, unassigned 24 h |
| P1 | `../bb-sign/frontend/src/i18n/locales/en/*.json` and `es/*.json` | all | The UI's own words for every screen (use them verbatim in the guides) |
| P1 | `../bb-sign/frontend/src/App.tsx` | 24-85 | Routes and which roles see which page |
| P1 | `../bb-sign/docs/EMAIL-SPEC.md` | §1, §6, §11 | Email list and copy rules |
| P1 | `../bb-sign/docs/DESIGN-GUIDELINES.md` | §2, §3, §6 | Brass rule, "never colour alone", no emoji, error-message style |
| P1 | `../bb-homepage/tests/unit/i18n.test.ts`, `tests/unit/deploy-contract.test.ts`, `tests/e2e/{smoke,a11y,visual}.spec.ts` | all | Test patterns to mirror |
| P1 | `../bb-homepage/src/components/brand/Logo.astro` | all | The mark; export two SVGs from it |
| P2 | `../bb-homepage/.claude/PRPs/plans/bb-docs-hub.plan.md` | all | The superseded plan; its "Notes" list good follow-ups (Concepts, Recipes, errors page, llms.txt) |
| P2 | `../bb-sign/docs/api/reference.md`, `openapi.json` | headings | Shape of the generated reference to compare against starlight-openapi's output |
| P2 | `../bb-sign/CLAUDE.md` | 1-120 | Worktree + plan → review → report workflow this repo adopts |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Starlight on Astro 7 | https://github.com/withastro/starlight/releases, https://starlight.astro.build/ | `KEY_INSIGHT`: Starlight 0.41 added Astro 7 and dropped Astro 6; 0.42.x is current (0.42.5 at planning time) and requires astro ≥ 7.2.10. `APPLIES_TO`: `package.json`. `GOTCHA`: Starlight 0.41+ defaults to Astro 7's Sätteri markdown processor; homepage remark/rehype plugins are **not** carried over (Starlight has asides, heading anchors and Shiki built in). |
| Starlight config | https://starlight.astro.build/reference/configuration/ | `title` accepts a per-locale object; `logo: { light, dark }`; `customCss: string[]`; `components` overrides; `pagefind: true` default; `tableOfContents` default h2–h3; `lastUpdated`; `editLink.baseUrl`; `disable404Route`. |
| Starlight i18n | https://starlight.astro.build/guides/i18n/ | Root locale: `defaultLocale: 'root', locales: { root: { label: 'Español', lang: 'es-CO' }, en: { label: 'English', lang: 'en' } }`. Root content sits directly in `src/content/docs/`, English in `src/content/docs/en/`. Missing translations fall back to the default with a notice. UI strings via `src/content/i18n/<locale>.json`. |
| Starlight CSS and Tailwind v4 | https://starlight.astro.build/guides/css-and-tailwind/ | `@layer base, starlight, theme, components, utilities; @import '@astrojs/starlight-tailwind'; @import 'tailwindcss/theme.css' layer(theme); @import 'tailwindcss/utilities.css' layer(utilities);` then `@theme { --font-sans; --font-mono; --color-accent-*; --color-gray-* }`. Dark is `:root`, light is `:root[data-theme='light']`. |
| Multi-product sidebars | https://starlight-sidebar-topics.netlify.app/docs/configuration/ | Topic: `{ label: string | Record<locale,string>, link, icon, badge, items, id }`. Plugin option `topics: { <id>: ['/sign/api', '/sign/api/**/*'] }` attaches generated pages to a topic. `exclude` for the hub page. `GOTCHA`: pages not listed in a topic's `items` and not matched by `topics` render with no sidebar; the registry test must catch this. |
| OpenAPI reference | https://starlight-openapi.vercel.app/getting-started/ | `starlightOpenAPI([{ base: 'sign/api', schema: './src/content/sync/openapi.json', label: … }])` plus `...openAPISidebarGroups` in the sidebar. Supports OpenAPI 3.0 (ours is 3.0, version `2026-08-09`). `GOTCHA`: generates English pages only; peer dep `@astrojs/markdown-satteri >=0.3.2` must be installed. |
| Other plugins | https://starlight.astro.build/resources/plugins/ | `starlight-links-validator` (build fails on broken internal links), `starlight-llms-txt` (adds `/llms.txt`). Both are cheap and used in this plan. |
| Colombian law | Ley 527 de 1999 (funcionpublica.gov.co, normativa.colpensiones.gov.co) | Art. 7 (firma), art. 12 (conservación: accesible, formato que reproduce con exactitud, origen/destino/fecha/hora), art. 13 (conservación por terceros), art. 28 (firma digital: presunción). Decreto 2364 de 2012 regulates *firma electrónica* (art. 7 of Ley 527). `APPLIES_TO`: `/sign/legal/*`. `GOTCHA`: bb-sign is *firma electrónica*, **not** *firma digital* (LV T1). The docs never claim art. 28. |
| Where to buy a certificate, Colombia | ONAC ECD directory https://onac.org.co/ (dynamic directory, verify at writing time); viafirma.com/en/digital-certificacion-entities-in-colombia/ | ECDs named in public sources at planning time: Certicámara, GSE (Gestión de Seguridad Electrónica), Andes SCD, Camerfirma Colombia, Olimpia IT, Thomas Signe, Viafirma Colombia. `GOTCHA`: the list must be re-verified against ONAC's directory before publishing and dated in the page. |
| Where to buy, elsewhere | Adobe AATL https://helpx.adobe.com/acrobat/kb/approved-trust-list1.html; globalsign.com AATL FAQ; ssl.com document signing | DigiCert, GlobalSign, Sectigo, Entrust, SSL.com are AATL members issuing organisation document-signing certificates. `GOTCHA`: many AATL products ship on USB tokens or cloud HSMs by default; the customer must ask for a **software (file) certificate with an exportable key**, which bb-sign requires. The page says so explicitly. |

---

## Fact sheet: what the docs may say about bb-sign

Everything below was read in bb-sign on 2026-10-07. The implementer copies these into
`src/content/facts/sign.ts` with the `source` comments and uses them from MDX.

### Identity, roles and permissions

| Fact | Value | Source |
|---|---|---|
| Org roles | `platform_admin`, `org_admin`, `org_member`, `org_api` (machine credential). `service_api` is internal, never documented | `OrgRole.kt:11-15`, `machine-authentication.md` §4 |
| Org-scope grants, admins | `audit:read-org, label:read, label:manage, credential:manage, webhook:manage, workspace:read, workspace:manage, workspace:manage-members, workspace:access-all` | `PermissionCatalog.kt:51-57` |
| Org-scope grants, `org_member` and `org_api` | `label:read, workspace:read` only; envelope abilities come from workspace roles | `PermissionCatalog.kt:59-67` |
| Workspace roles | `viewer` = envelope:read, archive:read · `auditor` = viewer + audit:read, document:download · `contributor` = auditor + envelope:create/update/send, document:upload, label:assign · `manager` = contributor + envelope:cancel. Contributor is implicit for every member in **General** and cannot be granted | `WorkspaceRoleBundles.kt:29-33`, `WorkspaceRole.kt:16-20` |
| Escalation guards | `org_api` can never hold credential:manage, webhook:manage, workspace:manage, workspace:manage-members, workspace:access-all | `PermissionCatalog.kt:78-85` |
| Membership cap | 50 workspace memberships per principal | `edge-api application.yml:120` |
| Denials | org-scope → 403; envelope or workspace you cannot see → 404, indistinguishable from "does not exist" | `RequiresAuthorizationManager.kt`, `quickstart.md` "Choosing a workspace" |
| Pages hidden from members | Users, Labels, Storage, Settings (admin-only routes) | `frontend/src/App.tsx:51-77` |
| Platform-admin only | Organizations CRUD and signature appearance, quota set/renew/suspend/activate, lifecycle update, archive and expiration manual runs, any org's workspaces, raw audit proxy, creating platform admins | `OrganizationController.kt:59-87`, `QuotaController.kt:86-121`, `LifecycleController.kt:77`, `ArchiveController.kt:176` |
| Org admin can | Invite `org_admin`/`org_member` users and resend invitations; upload/view/delete the org certificate; view quota and usage; view lifecycle; API credentials CRUD + rotate + revoke; webhooks CRUD + rotate + test + deliveries; label keys; workspaces and members; org audit events; everything on envelopes via access-all | `UserController.kt:89-253`, `OrgCertificateController.kt`, `Permission.kt` |
| Org member can | Create, edit (before send), send envelopes, upload documents, assign labels, download, read audit of envelopes in workspaces where they are contributor or above; list workspaces and label keys. Cannot cancel (manager only) | `WorkspaceRoleBundles.kt` |

### Envelope and signer lifecycle

| Fact | Value | Source |
|---|---|---|
| Envelope statuses | `DRAFT → SENT → IN_PROGRESS → COMPLETED`; `DRAFT|SENT|IN_PROGRESS → CANCELLED`; `SENT|IN_PROGRESS → EXPIRED` (only when `expiresAt` set, sweep every 5 min). No VOIDED, DECLINED | `SendEnvelopeUseCase.kt:36,71`, `RecordSignatureUseCase.kt:112-176`, `EnvelopeController.kt:528-531`, `ExpireEnvelopesUseCase.kt:40-50`, `application.yml:166-169` |
| Signer statuses | `PENDING → NOTIFIED → VIEWED → SIGNED`. No DECLINED | `SendEnvelopeUseCase.kt:66`, `GetSignerAccessUseCase.kt:60`, `RecordSignatureUseCase.kt:101` |
| Send requires | DRAFT, ≥ 1 signer, ≥ 1 document. Point of no return: documents and signers freeze | `SendEnvelopeUseCase.kt:36-47` |
| Sequential signing | `sequentialSigning` flag; only the first `signOrder` group gets links; the next group is emailed "It's your turn to sign" when the previous one finishes | `SendEnvelopeUseCase.kt:47-79`, `GetSignerAccessUseCase.kt:52` |
| Signing link validity | `linkTtlHours`, default 72 | `EnvelopeEntity.kt:31`, `EnvelopeController.kt:107` |
| Envelope expiry | optional `expiresAt`, must be in the future | `CreateEnvelopeUseCase.kt` |
| OTP | optional per envelope (`otpRequired`, API default `false` in the SDK examples, DB default `true`); 6 digits (`nextInt(900000) + 100000`); valid 900 s; 3 attempts; 60 s resend cooldown; the verification is good for 15 min; email only | auth-challenge `application.yml:45`, V002 `max_attempts 3`, edge `application.yml:180`, `RecordSignatureUseCase.kt:42`, `GenerateOtpUseCase.kt:30` |
| Signature capture | draw on canvas or type the name; submitted as a PNG | `SigningCeremony.tsx:61`, `SignRequest.signatureImage` |
| Review gate | the signer must open every document before continuing ("Open every document before you continue.") | `signing.json review.mustOpenDocuments` |
| View tracking | open/close beacons, deduplicated within 30 s | `application.yml:170-174` |
| Documents | PDF only; 50 MB per upload; up to 500 MB of unattached uploads per org; unattached uploads deleted after 24 h | `UploadUnassignedDocumentUseCase.kt:59`, `application.yml:64-65,186-191` |
| Placement of the seal | `{{signerN}}` text marker in the PDF (N = signOrder); without a marker, seals stack bottom-right on the last page | `PdfPlaceholderLocator.kt:76`, `StampSignedPdfUseCase.kt:144-185` |
| Completion output | per-signer seal image (name, email, date, signature, hash, QR to `/verify`) stamped into the PDF, then one CMS/PKCS#7 detached signature (`adbe.pkcs7.detached`, SHA256withRSA) with a visible widget bottom-right of the last page | `StampSignedPdfUseCase.kt:127-141`, `PdfDigitalSignatureService.kt:44-67` |
| Downloads | sender: presigned URLs valid 1 h, only with `document:download`; signer: `GET /sign/{token}/signed-documents` after completion, and the "Signing complete" email | `RecordSignatureUseCase.kt:193`, `GetSignerAccessUseCase.kt:65`, `GetSignedCopyUseCase` |
| Public verification | `GET /api/v1/verify?id=&h=` recomputes `SHA-256(name|email|date|documentId|certFingerprint)` against the org's **currently active** certificate. It does **not** inspect the PDF. After a certificate change, older seals verify as invalid | `VerifySignatureSealUseCase.kt`, `platform/contracts/src/main/kotlin/co/binarybridges/sign/platform/crypto/SealHashUtil.kt:12,40` |
| Labels | org-defined keys (≤ 50 chars, hex colour, description ≤ 200); values ≤ 200 chars; filterable | `LabelKeyController.kt`, `SetEnvelopeLabelsUseCase.kt:40-44` |
| Archive | COMPLETED, CANCELLED and EXPIRED envelopes older than 30 days **from creation** move to the "Archived envelopes" view nightly at 02:00. **The signer's download link stops working after that** | `application.yml:156-160`, `ArchiveEnvelopesUseCase.kt:32-38`, `GetSignedCopyUseCase` |
| Reminders | daily 09:00 to signers whose invitation is older than 48 h, at most one per 24 h | notification `application.yml:64-68` |
| Emails sent | invitation, "It's your turn", OTP code, reminder, completed, expired (to signers); "webhook disabled" (to org admins); identity emails from Keycloak (invite, password reset, verification). **No** email to the sender on completion, **no** cancellation email | `EMAIL-SPEC.md` §1, notification templates, agent inventory |
| UI languages | English and Spanish (`fallbackLng: 'en'`); envelope emails English only | `frontend/src/i18n/config.ts:77-78` |

### Developer platform

| Fact | Value | Source |
|---|---|---|
| Base URLs (production) | API `https://sign-api.binarybridges.co`; token URL `https://auth.binarybridges.co/realms/bbsign/protocol/openid-connect/token`; app `https://sign.binarybridges.co` | bb-infrastructure `apps/bb-sign/ingress.yaml`, README |
| Auth | OAuth2 client credentials; access token 300 s; no introspection, so revocation is bounded by that window; credential = confidential Keycloak client created from Settings → API credentials; max 10 per org; revoked ones stay listed 90 days; secret shown once; rotation has no grace; the org is always taken from the token | `machine-authentication.md` §2, `KeycloakApiCredentialAdapter.kt:47-48` |
| Published API | 17 paths: documents (1), envelopes (9), signing ceremony (7, public), verify (1, public), workspaces (1); OpenAPI 3.0 `2026-08-09`; served at `/v3/api-docs` | `openapi.json`, `application.yml:292` |
| Not in the public contract | organizations, users, certificates, quota, api-credentials, webhooks management, workspaces admin, labels, archive, audit, lifecycle. Documented as **UI operations**, never as API | agent inventory §7 |
| Webhooks | 6 events `envelope.sent, envelope.completed, envelope.cancelled, envelope.expired, signer.signed, signer.viewed`; headers `X-BBSign-Signature: t=<unix>,v1=<hex>`, `X-BBSign-Event-Id`, `X-BBSign-Event-Type`; HMAC-SHA256 over `t + "." + rawBody`; 300 s tolerance; retries `1m,5m,30m,2h,12h` ±20 %; disabled after 3 exhausted ladders, probe every 6 h; max 20 per org; HTTPS only, private addresses refused; secret rotation grace 24 h; delivery log kept 90 days | `webhooks.md`, `webhook-signature-spec.md`, `WebhookDispatchProperties.kt:20-35`, `WebhookDeliveryRetentionScheduler.kt` |
| Rate limits | none; 429 means quota or allowance cap | agent inventory §7 |
| SDK JS | `@binarybridges/bb-sign-sdk` 0.1.0, **not published**, ESM only, Node ≥ 20, tarball install, `/webhooks` subpath has no browser build by design, GET retried, POST with unknown outcome never retried, `BbSignError.statusCode` (0 = no answer) | `sdk-js/README.md`, `sdk-js/package.json` |
| SDK Java | `co.binarybridges.sign:bb-sign-sdk-java:0.1.0-SNAPSHOT`, Java 17, handover jar + pom (`-DpomFile` required), Retrofit/okhttp/Jackson, `Webhooks.verify(signature, byte[] rawBody, secret)`, `BbSignException.statusCode()` | `sdk-java/README.md`, `README-INSTALL.md`, `pom.xml` |

### Certificate (seal)

| Fact | Value | Source |
|---|---|---|
| Default | self-signed RSA-4096 `CN=Binary Bridges SAS, O=Binary Bridges SAS, L=Bogota, C=CO`, 10 years, generated on first boot; appearance always "Binary Bridges SAS" / "Digital signature by bb-sign" | `GlobalCertificateBootstrap.kt:46-87`, `CertificateResolverService.kt:18-19` |
| Policy | the default is a **testing** certificate; validators show it as untrusted; sending is never blocked | LV §1, T2, T3 |
| Own certificate | `POST /api/v1/organizations/{orgId}/certificate` (multipart `file`, `password`, `label`), org admin or platform admin; `.p12/.pfx/.pem`, ≤ 5 MB; rejects expired, keys < 2048 bits, missing `digitalSignature` KU; a new upload deactivates the previous one; password encrypted AES-256-GCM; resolution org → global; cached 5 min; **PEM uploads cannot sign** ("only PKCS12 supported in signing flow") | `UploadOrgCertificateUseCase.kt:28-29,121-137`, `OrgCertificateController.kt`, `CertificateResolverService.kt:48-63,153-155` |
| Appearance | display name, reason, location: platform-admin setting, applies only with an own certificate | `OrganizationController.kt` signature-appearance |
| Chain | **today only the leaf is embedded** (`JcaCertStore(listOf(x509))`); full-chain embedding, chain validation at upload and expiry emails are bb-sign#208 (unmerged) | `PdfDigitalSignatureService.kt:154`, lv208 plan C1–C3, C11 |
| Not available | TSA / RFC 3161 timestamps, PAdES, LTV, HSM/KMS keys, EC keys | agent inventory §5, PRD non-goals |

### Retention and data lifecycle

Two layers, and the docs keep them apart:

**Policy (binding user decision, LV contract §1, D-13, T4–T6).** Stated in `/sign/legal/retention/` and in the terms:
- Retention is a **fixed, non-configurable 365 days** for signed documents and evidence, then deletion.
- Files older than **90 days** are archived (S3 Glacier Flexible Retrieval) and cannot be downloaded immediately; they are restored on request and the requester is emailed, usually within hours, without a guaranteed time.
- **Conservation after 365 days is the customer's responsibility** (Ley 527 art. 12). Recommended: archive each envelope on completion through the `envelope.completed` webhook and the documents endpoint.

**Implemented today (do not describe as more than this):**

| Item | Value | Source |
|---|---|---|
| Documents bucket, production | STANDARD_IA at 30 d, GLACIER at 90 d, versioning on, **no expiration rule** | bb-infrastructure `aws/bb-sign-aws.yml:284-295` |
| Lifecycle defaults, non-prod only (`@Profile("!prod")`) | expiration 365 d, IA 30 d, Glacier 90 d; the Storage page shows them | `edge-api application.yml:161-165`, `LifecycleInitializer.kt:39-41` |
| Evidence bucket | Object Lock enabled, SSE-KMS, no default retention, **nothing writes to it yet** | `aws/bb-sign-aws.yml:326-338` |
| Envelope archive (database) | 30 days from creation, nightly; rows never deleted | `application.yml:156-160` |
| Audit events, email logs, OTP challenges | no purge | agent inventory §6 |
| Restore on request, evidence certificate, deletion job | **not built** (bb-sign#213, #214) | LV §3.14 |

### Scope and legal (what the terms say)

From LV §1 and §8 (T1–T7), rendered in `/sign/legal/terms/` and `/sign/index`:
- bb-sign provides **integrity, identification, compliance with agreements, inconsistency detection, probative value (valor probatorio) and traceability**. Conservation is the customer's job.
- It is **firma electrónica** (Decreto 2364 de 2012, compiled in Decreto 1074 de 2015), **not firma digital** (Ley 527 art. 28). Each customer's legal office decides whether the method suits its documents.
- The default certificate is a testing certificate (T2); obtaining, configuring with full chain and renewing an own certificate from an ONAC-accredited ECD is the customer's responsibility (T3).
- 365 days fixed (T4); 90-day archive and restore on request (T5); conservation after 365 days is the customer's (T6); each customer is the data controller for its signers (T7).
- Every legal text carries **"Pendiente de revisión jurídica"** until counsel approves it.

### Not shipped: never documented as a feature

Templates, bulk send, field placement UI (initials, dates, checkboxes), uploading a signature image, declining to sign, resending a signing link, SMS OTP, access codes, consent checkbox, evidence certificate PDF or export, TSA/PAdES/LTV, legal hold, per-org retention, per-org branding/logo, billing or self-service plans, a free trial, rate limits, Python/Go SDKs, Postman collection, a sender-completion email, a cancellation email.

### Inaccuracies in the existing bb-sign docs to fix while migrating

| Where | Says | Reality |
|---|---|---|
| `quickstart.md` §1, frontend `settings.json` | the secret "is stored hashed" | the secret lives only in Keycloak; bb-sign stores no secret column (V026) |
| `quickstart.md` §1 | `https://api.bb-sign.example.com` placeholders | production is `https://sign-api.binarybridges.co` and `https://auth.binarybridges.co/realms/bbsign/protocol/openid-connect/token` |
| `machine-authentication.md` §3 | "exactly ten endpoints" | the contract has 17 paths; machine access is decided per workspace role, not by a fixed list (`@Requires`) |
| `machine-authentication.md` §6 | the `@PreAuthorize` role dialect | the `@Requires(permission, on=…)` model |
| `openapi.json` `GET /verify` description | "checks a signed PDF's CMS/PKCS#7 signature" | recomputes the stored seal hash only; the docs describe what it does, and a bb-sign issue is filed for the description |
| `README.md` | "Spanish es-CO default" | `fallbackLng: 'en'`, browser detection |

---

## Patterns to Mirror

### PACKAGE_SCRIPTS
```json
// SOURCE: ../bb-homepage/package.json:9-22 (adapted names)
"scripts": {
  "dev": "astro dev",
  "check": "astro check",
  "build": "astro check && astro build && node scripts/check-csp.mjs",
  "preview": "astro preview",
  "test": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "verify": "npm run build && npm test && npm run test:e2e",
  "sync:sign": "node scripts/sync-product.mjs sign",
  "check:csp": "node scripts/check-csp.mjs",
  "verify:deploy": "bash scripts/verify-deploy.sh"
}
```

### ASTRO_CONFIG (target shape)
```js
// SOURCE pattern: ../bb-homepage/astro.config.mjs:16-27 (output, i18n, vite) + Starlight docs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import { SITE_URL } from './src/config/site.ts';
import { PRODUCTS, topicsFor, openApiFor } from './src/config/products.ts';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    starlight({
      title: { 'es-CO': 'Documentación de Binary Bridges', en: 'Binary Bridges Docs' },
      defaultLocale: 'root',
      locales: { root: { label: 'Español', lang: 'es-CO' }, en: { label: 'English', lang: 'en' } },
      logo: { light: './src/assets/logo-light.svg', dark: './src/assets/logo-dark.svg', alt: 'Binary Bridges' },
      customCss: ['@fontsource-variable/geist', '@fontsource-variable/geist-mono', './src/styles/global.css'],
      components: { Hero: './src/components/hub/Hub.astro' }, // only for the splash hub page
      plugins: [
        starlightOpenAPI(PRODUCTS.flatMap(openApiFor)),          // [{ base: 'sign/api', schema: 'src/content/sync/sign/openapi.json', label: 'API reference' }]
        starlightSidebarTopics(PRODUCTS.map(topicsFor), { exclude: ['/', '/en'] , topics: { sign: ['/sign/api', '/sign/api/**/*'] } }),
        starlightLinksValidator(),
        starlightLlmsTxt(),
      ],
      pagefind: true,
      lastUpdated: true,
      credits: false,
    }),
  ],
  vite: { plugins: [tailwindcss()], build: { assetsInlineLimit: 0 } },
});
```

### PRODUCT_REGISTRY
```ts
// SOURCE pattern: ../bb-homepage/src/config/site.ts:1-16 (one file, typed, no other hardcoding)
export type ProductId = 'sign';
export interface Product {
  readonly id: ProductId;              // URL prefix and content folder
  readonly name: string;               // "bb-sign", never translated
  readonly tagline: Readonly<Record<'es' | 'en', string>>;
  readonly appUrl: string;             // https://sign.binarybridges.co
  readonly repo: string;               // binary-bridges-co/bb-sign
  readonly accent: 'seal';             // node colour on the parent arc (homepage plan D3)
  readonly openapi?: string;           // path inside the product repo
  readonly sidebar: readonly SidebarItem[];
}
export const PRODUCTS: readonly Product[] = [ /* bb-sign */ ];
```

### TOKENS
```css
/* SOURCE: ../bb-homepage/src/styles/tokens.css:17-84 — copied verbatim into src/styles/tokens.css */
@theme {
  --color-ink: #16192b; --color-paper: #fbfaf8; --color-surface: #ffffff;
  --color-muted: #5f6376; --color-line: #e2e0dc; --color-accent: #2c46c4;
  --color-seal: #916216; --color-on-fill: #ffffff;
  --font-sans: 'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'Geist Mono Variable', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  --radius-pill: 999px; --radius-ctl: 10px; --radius-card: 16px; --radius-sheet: 24px;
}
@media (prefers-color-scheme: dark) { :root { --color-ink: #f2f0ec; --color-paper: #16192b; --color-surface: #1d2136;
  --color-muted: #969aaf; --color-line: #2b3049; --color-accent: #8595ff; --color-seal: #e0a94a; --color-on-fill: #16192b; } }
```

### STARLIGHT_THEME_MAPPING (new file `src/styles/starlight-theme.css`)
```css
/* Dark is Starlight's :root; light is :root[data-theme='light']. Values are the token values above. */
:root {
  --sl-color-accent-low: #1d2136; --sl-color-accent: #8595ff; --sl-color-accent-high: #b3bcff;
  --sl-color-white: #f2f0ec; --sl-color-gray-1: #e2e0dc; --sl-color-gray-2: #969aaf; --sl-color-gray-3: #5f6376;
  --sl-color-gray-4: #353b5c; --sl-color-gray-5: #2b3049; --sl-color-gray-6: #1d2136; --sl-color-black: #16192b;
  --sl-color-text: #f2f0ec; --sl-color-bg: #16192b; --sl-color-bg-nav: #1d2136; --sl-color-bg-sidebar: #1d2136; --sl-color-hairline: #2b3049;
  --sl-font: 'Geist Variable', ui-sans-serif, system-ui, sans-serif; --sl-font-mono: 'Geist Mono Variable', ui-monospace, monospace;
  --bb-seal: #e0a94a;
}
:root[data-theme='light'] {
  --sl-color-accent-low: #e8ebff; --sl-color-accent: #2c46c4; --sl-color-accent-high: #1b2c84;
  --sl-color-white: #16192b; --sl-color-gray-1: #2b3049; --sl-color-gray-2: #5f6376; --sl-color-gray-3: #969aaf;
  --sl-color-gray-4: #c9c7c2; --sl-color-gray-5: #e2e0dc; --sl-color-gray-6: #f4f2ee; --sl-color-gray-7: #fbfaf8; --sl-color-black: #ffffff;
  --sl-color-text: #16192b; --sl-color-bg: #fbfaf8; --sl-color-bg-nav: #ffffff; --sl-color-bg-sidebar: #ffffff; --sl-color-hairline: #e2e0dc;
  --bb-seal: #916216;
}
/* Brass is evidence only: a dedicated aside variant, used on seal/verification pages. */
.starlight-aside--seal { border-inline-start-color: var(--bb-seal); }
```
Measure every pair with axe in both themes (homepage rule: aim above 5:1, never 4.51).

### BASE_HEAD_META
```astro
<!-- SOURCE: ../bb-homepage/src/layouts/BaseLayout.astro:85-87 — same theme-color pair, via Starlight `head` -->
head: [
  { tag: 'meta', attrs: { name: 'theme-color', content: '#FBFAF8', media: '(prefers-color-scheme: light)' } },
  { tag: 'meta', attrs: { name: 'theme-color', content: '#16192B', media: '(prefers-color-scheme: dark)' } },
]
```

### CONTENT_FRONTMATTER (extends Starlight's schema)
```ts
// SOURCE pattern: ../bb-homepage/src/content.config.ts:19-56 (Zod, length limits, refine)
import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        description: z.string().min(50).max(170),
        product: z.enum(['sign']),
        audience: z.enum(['admin', 'user', 'signer', 'developer', 'legal', 'all']),
        /** Path in the product repo this page was derived from, when any. */
        source: z.string().regex(/^[a-z0-9./_-]+$/i).optional(),
        /** Legal pages only: "Versión 1 · 2026-10-07". */
        legalVersion: z.string().regex(/^Versión \d+ · \d{4}-\d{2}-\d{2}$/).optional(),
      }),
    }),
  }),
};
```

### CSP_CHECK
```js
// SOURCE: ../bb-homepage/scripts/check-csp.mjs:1-37 — copy unchanged. It hashes every inline executable
// <script> in dist/ and fails unless the sha256 is in security-headers.conf. Starlight's theme script adds
// one more hash next to the homepage's; JSON-LD blocks are skipped.
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;
```

### NGINX
```nginx
# SOURCE: ../bb-homepage/nginx.conf:10-59 — copy; drop the redirects include (no legacy URLs here) and add pagefind.
server {
    listen 3000; listen [::]:3000; server_name _; root /usr/share/nginx/html; server_tokens off;
    absolute_redirect off;
    gzip on; gzip_comp_level 6; gzip_types text/css application/javascript image/svg+xml application/xml text/plain application/manifest+json application/json;
    include /etc/nginx/snippets/security-headers.conf;
    location = /healthz { access_log off; default_type text/plain; return 200 "ok\n"; }
    location /_astro/  { include /etc/nginx/snippets/security-headers.conf; add_header Cache-Control "public, max-age=31536000, immutable" always; try_files $uri =404; }
    location /pagefind/ { include /etc/nginx/snippets/security-headers.conf; add_header Cache-Control "public, max-age=3600" always; try_files $uri =404; }
    location / { include /etc/nginx/snippets/security-headers.conf; add_header Cache-Control "no-cache" always; try_files $uri $uri/index.html $uri.html =404; }
    error_page 404 /404.html; location = /404.html { include /etc/nginx/snippets/security-headers.conf; internal; }
}
```
Pagefind loads `/pagefind/pagefind.js` and WASM from the same origin: `script-src 'self'` is enough; add `wasm-unsafe-eval` to `script-src` only if Chromium rejects the WASM module under the CSP (verify in Task A6).

### DOCKERFILE
```dockerfile
# SOURCE: ../bb-homepage/Dockerfile:1-43 — copy; remove the EmailJS ARGs and the redirects mv.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV ASTRO_TELEMETRY_DISABLED=1
RUN npm run build
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN nginx -t
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
```

### PIPELINE
```yaml
# SOURCE: ../bb-homepage origin/main .github/workflows/pipeline.yml — copy; rename image, drop EmailJS build-args, add the sync check.
- name: Commit timestamp (sortable tag for Flux image automation)
  id: ts
  run: echo "value=$(TZ=UTC git log -1 --format=%cd --date=format-local:%Y%m%dT%H%M%S)" >> "$GITHUB_OUTPUT"
- uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: |
      ghcr.io/binary-bridges-co/bb-docs:latest
      ghcr.io/binary-bridges-co/bb-docs:${{ github.sha }}
      ghcr.io/binary-bridges-co/bb-docs:main-${{ steps.ts.outputs.value }}-${{ github.sha }}
```

### K8S_APP (bb-infrastructure)
```yaml
# SOURCE: ../bb-infrastructure/apps/homepage/deployment.yaml + ingress.yaml — copy to apps/docs/, rename.
image: ghcr.io/binary-bridges-co/bb-docs:main-<ts>-<sha> # {"$imagepolicy": "docs:docs"}
ports: [{name: http, containerPort: 3000}]
readinessProbe: {httpGet: {path: /healthz, port: http}, periodSeconds: 10, timeoutSeconds: 3, failureThreshold: 3}
resources: {requests: {memory: 8Mi}, limits: {memory: 64Mi}}
# ingress: host docs.binarybridges.co, tls secretName docs-binarybridges-co-tls, cert-manager.io/cluster-issuer: letsencrypt
# automation/docs/image-policy.yaml: filterTags pattern '^main-(?P<date>\d{8})T(?P<time>\d{6})-[a-f0-9]+$', extract '${date}${time}', numerical asc
```

### UNIT_TEST_COPY_RULES
```ts
// SOURCE: ../bb-homepage/tests/unit/i18n.test.ts:19-21, 94-107 — reused against content files instead of dictionaries
const EMOJI = /\p{Extended_Pictographic}/u;
const TYPED_ARROWS = /[←-⇿]/u;
test.each(LOCALES)('%s contains no emoji or typed arrows', …);
test('both locales define exactly the same keys', …); // here: same set of content paths, minus an explicit fallback allow-list
```

### E2E_A11Y
```ts
// SOURCE: ../bb-homepage/tests/e2e/a11y.spec.ts:4-25
for (const colorScheme of ['light', 'dark'] as const) for (const path of PATHS)
  test(`${path} has no axe violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  });
```
Starlight sets `data-theme` from `localStorage`; the e2e sets it with `page.addInitScript(() => localStorage.setItem('starlight-theme', scheme))` so the emulated scheme and the toggle agree.

### DEPLOY_CONTRACT_TEST
```ts
// SOURCE: ../bb-homepage/tests/unit/deploy-contract.test.ts:1-60 — same shape; asserts port 3000 in nginx.conf,
// EXPOSE 3000 and /healthz in the Dockerfile, and that no EmailJS variable survived the copy.
```

### SDK_CODE_TABS (content pattern)
```mdx
import { Tabs, TabItem } from '@astrojs/starlight/components';
<Tabs syncKey="lang">
  <TabItem label="curl">…</TabItem>
  <TabItem label="JavaScript">…</TabItem>
  <TabItem label="Java">…</TabItem>
</Tabs>
```
`syncKey="lang"` keeps the chosen language across pages, as Stripe does.

### COPY_RULES (from bb-sign DESIGN-GUIDELINES §6 and EMAIL-SPEC §11)
- No emojis, no typed arrows anywhere, including code comments shown to readers.
- Error messages and troubleshooting rows say **what happened and what to do**.
- Use the UI's own strings for buttons and tabs, quoted from `frontend/src/i18n/locales/<lang>/*.json`.
- Never imply the reader did something they did not.

---

## Files to Change

### bb-docs (new repo)

| File | Action | Justification |
|---|---|---|
| `package.json`, `package-lock.json`, `.nvmrc` (`22`), `tsconfig.json` (`astro/tsconfigs/strict`), `.gitignore`, `.dockerignore`, `.editorconfig` | CREATE | Toolchain parity with bb-homepage |
| `astro.config.mjs` | CREATE | ASTRO_CONFIG pattern |
| `src/config/site.ts` | CREATE | `SITE_URL = 'https://docs.binarybridges.co'`, `HOMEPAGE_URL`, `CONTACT_EMAIL = 'soporte@binarybridges.co'`, `LEGAL_NAME = 'Binary Bridges S.A.S.'`, `GITHUB_ORG` |
| `src/config/products.ts` | CREATE | PRODUCT_REGISTRY; sidebars per product per locale |
| `src/content.config.ts` | CREATE | CONTENT_FRONTMATTER |
| `src/content/facts/sign.ts` | CREATE | Fact sheet constants with `source` comments |
| `src/content/sync/sign/{openapi.json,webhook-signature-vectors.json}`, `src/content/sync/sign.json` | GENERATED, committed | Copied from bb-sign by `scripts/sync-product.mjs`; the json records `{ repo, ref, commit, files: { path: sha256 } }` |
| `src/content/i18n/{es-CO,en}.json` | CREATE | Starlight UI string overrides (search label, "On this page", fallback notice wording) |
| `src/styles/tokens.css`, `src/styles/starlight-theme.css`, `src/styles/global.css` | CREATE | TOKENS, STARLIGHT_THEME_MAPPING, Tailwind v4 layers |
| `src/assets/logo-light.svg`, `src/assets/logo-dark.svg` | CREATE | Exported from homepage `Logo.astro` (`ARC_FULL` path, 1/0 nodes) |
| `src/components/hub/Hub.astro`, `src/components/hub/ProductCard.astro` | CREATE | Hub page: one card per registry entry, product accent on the arc nodes |
| `src/components/facts/Fact.astro`, `src/components/facts/LimitsTable.astro`, `src/components/facts/RolesMatrix.astro`, `src/components/facts/StatusFlow.astro` | CREATE | Render fact-sheet data so numbers are single-sourced; `StatusFlow` is inline SVG, no emoji |
| `src/components/legal/LegalHeader.astro` | CREATE | Renders `legalVersion` + "Pendiente de revisión jurídica" banner |
| `src/components/overrides/Footer.astro` | CREATE | Starlight `Footer` override: © LEGAL_NAME, homepage link, contact, product app link |
| `public/favicon.svg`, `public/favicon-16.svg`, `public/apple-touch-icon.png`, `public/robots.txt`, `public/og-es.png`, `public/og-en.png` | CREATE | Copied from bb-homepage `public/`; robots points to `https://docs.binarybridges.co/sitemap-index.xml` |
| `scripts/sync-product.mjs` | CREATE | `node scripts/sync-product.mjs sign [ref]`: sparse clone of `binary-bridges-co/bb-sign` (token from `PRODUCT_REPO_TOKEN`, or a local path via `--from ../bb-sign`), copies the registry's `openapi` and vectors into `src/content/sync/sign/`, writes `sign.json`, writes to a temp dir and renames atomically, exits 1 with the list on any missing file |
| `scripts/check-csp.mjs`, `scripts/verify-deploy.sh` | CREATE | Copied from bb-homepage; verify-deploy paths adapted (hub, `/sign/`, `/en/sign/`, `/sign/api/`, `/pagefind/pagefind.js`, `/sitemap-index.xml`, `/llms.txt`) |
| `Dockerfile`, `nginx.conf`, `security-headers.conf` | CREATE | DOCKERFILE, NGINX; CSP hashes for Starlight's inline theme script |
| `.github/workflows/pipeline.yml` | CREATE | PIPELINE: verify → build-and-push-image |
| `vitest.config.ts` | CREATE | include `tests/unit/**/*.test.ts`; coverage over `src/config/**`, `src/content/facts/**`, `src/lib/**`, thresholds 80 |
| `playwright.config.ts`, `playwright.prod.config.ts` | CREATE | Copied; `PROD_URL ?? 'https://docs.binarybridges.co'` |
| `tests/unit/products.test.ts` | CREATE | Registry ↔ content folders ↔ topics ↔ hub cards all agree; every doc has `product` equal to its folder |
| `tests/unit/content.test.ts` | CREATE | ES/EN path parity (with fallback allow-list), no emoji or arrows, description lengths, every `source` exists in the synced tree or is a known bb-sign path, no hardcoded fact numbers in prose (regex over a denylist: `365`, `90 d`, `72`, `900`, `300`, `50 MB`) |
| `tests/unit/facts.test.ts` | CREATE | Fact sheet internal consistency (retention 365 ≥ archive 90; OTP ttl 900 > resend 60; link ttl 72) and `sync/sign.json` hashes match the files |
| `tests/unit/legal.test.ts` | CREATE | Every legal page has `legalVersion`, the banner text, and ES/EN versions carry the same version string |
| `tests/unit/deploy-contract.test.ts` | CREATE | DEPLOY_CONTRACT_TEST |
| `tests/e2e/smoke.spec.ts` | CREATE | hub lists exactly the registry products; `/sign/`, `/en/sign/`, `/sign/api/`, `/sign/legal/terms/` render one h1 with the right `lang`; topic switcher present; no horizontal overflow at 320 px; 404 |
| `tests/e2e/search.spec.ts` | CREATE | Pagefind returns a result for "webhook" and "OTP" in both locales |
| `tests/e2e/a11y.spec.ts` | CREATE | E2E_A11Y over hub, overview, a guide, the API reference index, terms, 404, both themes |
| `tests/e2e/i18n.spec.ts` | CREATE | Language switch keeps the page; `hreflang` alternates present; fallback notice shows on an intentionally untranslated fixture |
| `tests/e2e/visual.spec.ts` + `*-snapshots/` | CREATE | hub, overview, a guide, API page at 320/768/1024/1440 × light/dark (Chromium, macOS baselines) |
| `README.md` | UPDATE | Develop, add a product, add a page, sync, deploy, the fact-sheet rule |
| `CLAUDE.md` | CREATE | Adopt bb-sign's worktree + plan/review/report workflow (§0–§7), minus the Docker-stack parts; "Golden rule: no fact without a source" |
| `.claude/PRPs/{plans,plans/completed,reviews,reports}/` | CREATE | Workflow folders |
| `src/content/docs/**` | CREATE | See "Information architecture" |

### bb-infrastructure (separate PR, after the first image is pushed)

| File | Action |
|---|---|
| `apps/docs/{deployment,ingress,kustomization}.yaml` | CREATE (K8S_APP) |
| `apps/kustomization.yaml` | UPDATE: add `- docs` |
| `automation/docs/{image-policy,image-automation,kustomization}.yaml` | CREATE, namespace `docs`, push branch `flux/docs-updates`, commit `chore(docs): bump image` |
| `automation/kustomization.yaml` | UPDATE: add `- docs` |
| `README.md` domains table | UPDATE: `docs.binarybridges.co → VPS (bb-docs)` |

### bb-homepage (separate PR, after DNS resolves and `verify-deploy.sh` passes)

| File | Action |
|---|---|
| `src/config/site.ts:11` | UPDATE `DOCS_LIVE = true` (smoke tests and `verify-deploy.sh` follow the flag) |

## NOT Building
- Documentation for bb-control or any product other than bb-sign (the registry and tests make adding one a content task).
- A live "try it" API console against production.
- Versioned docs per bb-sign release (the old plan's versioning). One version, "current", tracked by `sync/sign.json`.
- Hosted search (Algolia) or analytics (CSP forbids third parties, as on the homepage).
- Authoring the OpenAPI spec or the webhook vectors in bb-docs.
- Editing bb-sign code or its `docs/api/*.md` (a follow-up issue in bb-sign replaces them with pointers once bb-docs is live).
- Documenting anything in the "Not shipped" list as a feature.
- The bb-sign terms' legal review. The pages carry "Pendiente de revisión jurídica" until counsel approves.
- A theme-toggle removal or any Starlight component rewrite beyond `Footer` and the hub `Hero`.

---

## Information architecture (bb-sign topic)

Spanish files at `src/content/docs/sign/<path>.mdx`, English at `src/content/docs/en/sign/<path>.mdx`. Slugs
are English in both. `audience` in frontmatter drives a small badge in the page header. Pages marked
**(migrate)** start from an existing bb-sign file; the rest are new.

| Slug | Title (es / en) | Audience | Content and sources |
|---|---|---|---|
| `sign/index` | Qué es bb-sign / What bb-sign is | all | Scope from LV §1 (six capabilities; conservation is the customer's); who uses it (admin, user, signer, developer); "not firma digital" in one line with a link to legal; how the docs are organised; links to the three paths |
| `sign/concepts/organizations-workspaces-roles` | Organizaciones, espacios y roles | all | Org, General workspace, workspace roles table (`RolesMatrix`), org roles, what members cannot do (cancel), 404-not-403 rule |
| `sign/concepts/envelopes-and-signers` | Sobres y firmantes | all | `StatusFlow` for envelope and signer statuses, sequential vs parallel, link TTL, expiry, cancel |
| `sign/concepts/documents` | Documentos | user | PDF only, 50 MB, pre-upload and 24 h reaper, `{{signerN}}` markers, where seals land |
| `sign/concepts/signature-and-seal` | Firma electrónica y sello | all | Signer's mark (draw/type) vs the organisation's certificate seal; what the visible widget shows; the hash and QR; brass aside |
| `sign/concepts/evidence-and-audit` | Evidencia y auditoría | all | Hash-chained audit events (the list actually recorded), view tracking, email tracking, `/verify` and what it does and does not check |
| `sign/concepts/labels` | Etiquetas | user | Keys, values, limits, filtering |
| `sign/concepts/quotas` | Cuotas | admin | Limits, periods, 80 % warning, 429, who sets them (platform admin) |
| `sign/getting-started/your-account` | Tu cuenta | user | Invitation email (72 h), first login, language, theme, what you see per role |
| `sign/getting-started/first-envelope` | Tu primer sobre | user | The wizard's five steps with the UI's own labels (`create.json` steps.*), ending in "Send" and what "point of no return" means |
| `sign/signing/index` | Firmar un documento | signer | The whole path in one page with `<Steps>`: email → link → review every document → (OTP) → sign → download; the three screens' titles from `signing.json` |
| `sign/signing/receiving-the-email` | El correo de invitación | signer | Subject lines, who sends it (`sign@binarybridges.co`), reminders at 48 h, "It's your turn" |
| `sign/signing/review-and-identity` | Revisar y verificar identidad | signer | Must open every document; OTP: 6 digits, 15 min, 3 attempts, resend after 60 s; what the messages mean |
| `sign/signing/sign-and-download` | Firmar y descargar | signer | Draw or type; what is recorded (IP, browser, time); the signed copy and the completion email; the copy is available until the envelope is archived (30 days from creation) |
| `sign/signing/verify-a-document` | Verificar un documento firmado | all | QR → `/verify`; "valid" means the seal hash matches the current certificate; limits of that check; Acrobat signature panel for the certificate |
| `sign/signing/troubleshooting` | Si algo falla | signer | Table: link unavailable, waiting for previous signers, already signed, code not valid, "no longer available for download", archived; each with what happened and what to do |
| `sign/sending/create-an-envelope` | Crear un sobre | user | Title, message, workspace, labels, OTP, link validity, expiry, sequential order |
| `sign/sending/documents` | Adjuntar documentos | user | Upload, remove before send, size and type limits |
| `sign/sending/signers-and-order` | Firmantes y orden | user | Parallel vs sequential, `signOrder`, adding signers to a draft |
| `sign/sending/send-and-track` | Enviar y seguir | user | Statuses, filters (status, text, dates, labels, workspace), the detail page (signers, documents, audit), stats on the dashboard |
| `sign/sending/cancel` | Cancelar un sobre | user | Who can (manager / admin), from which statuses, what signers see afterwards (no cancellation email) |
| `sign/sending/download-signed-documents` | Descargar documentos firmados | user | Original vs signed PDF, 1-hour links, viewer role gets no bytes, after 90 days in production the file is in cold storage |
| `sign/sending/archived-envelopes` | Sobres archivados | user | The 30-day archive view, what changes for signers |
| `sign/admin/index` | Administrar la organización | admin | Map of every admin operation with links; which require platform admin |
| `sign/admin/users-and-invitations` | Usuarios e invitaciones | admin | Invite, roles you may assign, resend, 72 h link, enabled/disabled |
| `sign/admin/workspaces-and-members` | Espacios y miembros | admin | Create, rename, delete (not when it has envelopes), General, grant viewer/auditor/manager to people and API keys, 50-membership cap, propagation delay |
| `sign/admin/labels` | Claves de etiqueta | admin | Create, rename, colour, delete and what happens to values |
| `sign/admin/api-credentials` | Credenciales de API | admin | Create with workspace + role, secret shown once, rotate (no grace), revoke, 90-day listing, max 10 |
| `sign/admin/webhooks` | Webhooks | admin | Create (HTTPS, events), secret once, rotate (24 h grace), test, enable/disable, history statuses (`deliveries.status.*` from `settings.json`), auto-disable after 3 ladders and the email |
| `sign/admin/own-certificate` | Certificado propio de la organización | admin | **(migrate `docs/guias/certificado-propio.md`)** + "Why you must not stay on the testing certificate" (T2) + "What to buy" (PKCS#12 file, exportable RSA ≥ 2048, KU firma digital/no repudio, in the organisation's name) + "Where to buy" (Colombia: ONAC ECD list, dated; elsewhere: AATL members, dated) + export with full chain (certmgr, OpenSSL `-legacy`) + verify with `openssl pkcs12 -info` + upload in Settings + renewal (5-min cache) + never email the `.p12` + today's limitation: leaf-only embedding until bb-sign#208 |
| `sign/admin/storage` | Almacenamiento | admin | What the Storage page shows (non-prod defaults) and what production actually does (IA 30 d, Glacier 90 d); link to retention |
| `sign/admin/quota-and-usage` | Cuota y uso | admin | Reading the usage panel; who changes limits |
| `sign/admin/audit-trail` | Auditoría | admin | Envelope audit, org events (credentials, webhooks, workspaces), hash chain |
| `sign/admin/permissions` | Matriz de permisos | admin | `RolesMatrix` over the full catalog; the escalation guards explained |
| `sign/developers/index` | Plataforma para desarrolladores | developer | Map: quickstart, auth, webhooks, SDKs, API reference, errors |
| `sign/developers/quickstart` | Inicio rápido | developer | **(migrate `quickstart.md`)** with production URLs, "stored in Keycloak, shown once", `<Tabs>` curl/JS/Java |
| `sign/developers/authentication` | Autenticación de máquinas | developer | **(migrate `machine-authentication.md` §1, §2, §5)**; §3/§4 rewritten as "what a credential can reach is its workspace roles"; token 300 s; claims table |
| `sign/developers/envelope-walkthrough` | De la credencial al documento firmado | developer | Create → upload → attach → signers → send → webhook → download, with tabs; "list before you retry" |
| `sign/developers/webhooks` | Webhooks | developer | **(migrate `webhooks.md`)** |
| `sign/developers/webhook-signature-spec` | Especificación de firma de webhooks v1 | developer | **(migrate `webhook-signature-spec.md` Part 1 and Part 2 P1–P4)**; vectors file linked from `sync/` |
| `sign/developers/errors` | Errores | developer | Status table from the SDK READMEs; `ErrorResponse` and `QuotaViolation` schemas; 404-not-403 |
| `sign/developers/migrating-from-adobe` | Migrar desde Adobe Acrobat Sign | developer | **(migrate)** |
| `sign/api/**` | API reference | developer | **generated** by starlight-openapi from `sync/sign/openapi.json` |
| `sign/sdks/javascript` | SDK de JavaScript | developer | **(migrate `sdk-js/README.md`)**: install from tarball, quickstart, pagination, webhooks (Express/Next/Fastify), retries, errors, "what it will not do" |
| `sign/sdks/java` | SDK de Java | developer | **(migrate `sdk-java/README.md` + `README-INSTALL.md`)** |
| `sign/legal/terms` | Términos y condiciones del servicio bb-sign | legal | **Versión 1 text verbatim** (`.md`), `LegalHeader`, plus the retention clauses T4–T6 as a clearly marked "Versión 2 (borrador)" section until bb-sign#214 publishes them; English page is a courtesy translation that says the Spanish text prevails |
| `sign/legal/retention` | Alcance y conservación | legal | Six capabilities; **non-negotiable retention table** (365 d fixed, 90 d archive and restore on request, customer conserves afterwards, Ley 527 art. 12 and 13); what to do: archive on `envelope.completed`; what is implemented today (honest table from the fact sheet) |
| `sign/legal/electronic-vs-digital-signature` | Firma electrónica y firma digital | legal | Ley 527 art. 7 and 28, Decreto 2364; what bb-sign is and is not; the customer's legal office decides |
| `sign/reference/limits-and-defaults` | Límites y valores por defecto | all | `LimitsTable` from the fact sheet: every number in one place |
| `sign/reference/statuses` | Estados | all | Envelope, signer, webhook delivery and credential statuses with the UI's labels |
| `sign/reference/emails` | Correos que envía bb-sign | all | Table of every email, subject, recipient, trigger |
| `sign/reference/glossary` | Glosario | all | Envelope/sobre, signer/firmante, workspace/espacio, seal/sello, OTP, label/etiqueta, ECD, ONAC, AATL |

Hub and shared pages: `index.mdx` (es) and `en/index.mdx` with `template: splash` and the `Hub` override; `404` from Starlight with the homepage's wording ("Este puente no llega a ninguna parte.").

---

## Step-by-Step Tasks

Phases A–E are separate PRs. Each phase ends green on `npm run verify`. Phases B, C and D are content-heavy
and may each be split by audience (admin / user / signer / developer / legal) if a PR grows past about 25
pages, keeping the registry test green at every commit.

### Phase A: scaffold, brand, pipeline (no product content yet)

#### Task A1: Scaffold the Astro + Starlight project
- **ACTION**: `npm create astro@latest -- --template starlight --typescript strict --no-install .` in the repo root, then align `package.json` with the PACKAGE_SCRIPTS pattern and pin `astro ^7.3.5`, `@astrojs/starlight ^0.42.5`, `@astrojs/starlight-tailwind`, `@tailwindcss/vite ^4.3.3`, `tailwindcss ^4.3.3`, `@fontsource-variable/geist ^5.3.0`, `@fontsource-variable/geist-mono ^5.3.0`, `starlight-sidebar-topics ^0.9.0`, `starlight-openapi ^0.27.0`, `@astrojs/markdown-satteri`, `starlight-links-validator`, `starlight-llms-txt`; dev: `@astrojs/check ^0.9.10`, `typescript ^6.0.3`, `vitest ^5.0.2`, `@vitest/coverage-v8 ^5.0.2`, `@playwright/test ^1.63.0`, `@axe-core/playwright ^4.13.0`.
- **IMPLEMENT**: `.nvmrc` = `22`; `engines.node >= 22.12.0`; `tsconfig.json` extends `astro/tsconfigs/strict` and excludes `dist`, `playwright-report`, `test-results`, `coverage`; `.gitignore` from bb-homepage plus `src/content/sync/**/*.tmp`; delete the template's sample content.
- **MIRROR**: PACKAGE_SCRIPTS.
- **GOTCHA**: run `npm view @astrojs/starlight peerDependencies` and `npm view starlight-openapi peerDependencies` before pinning; the versions above were read on 2026-10-07 and may have moved. Starlight 0.42 needs astro ≥ 7.2.10.
- **VALIDATE**: `npm ci && npm run check && npm run build` succeeds with a placeholder `src/content/docs/index.mdx`.

#### Task A2: Site config, product registry, content schema
- **ACTION**: create `src/config/site.ts`, `src/config/products.ts`, `src/content.config.ts`.
- **IMPLEMENT**: PRODUCT_REGISTRY with one entry: `{ id: 'sign', name: 'bb-sign', tagline: { es: 'Firma electrónica para organizaciones…', en: '…' }, appUrl: 'https://sign.binarybridges.co', repo: 'binary-bridges-co/bb-sign', accent: 'seal', openapi: 'docs/api/openapi.json', vectors: 'docs/api/webhook-signature-vectors.json', sidebar: [...] }`. Export `topicsFor(product, locale)` returning the starlight-sidebar-topics object with `label: { 'es-CO': …, en: … }`, `link: '/sign/'`, `icon: 'document'`, `items` = the sidebar groups (slugs from the IA table), and `openApiFor(product)` returning `[{ base: 'sign/api', schema: './src/content/sync/sign/openapi.json', label: { 'es-CO': 'Referencia de la API', en: 'API reference' } }]`. CONTENT_FRONTMATTER as in Patterns.
- **MIRROR**: `../bb-homepage/src/config/site.ts`, `content.config.ts`.
- **IMPORTS**: `import type { StarlightSidebarTopicsUserConfig } from 'starlight-sidebar-topics'`.
- **GOTCHA**: the sidebar `items` must reference slugs that exist, or Starlight fails the build with "sidebar reference not found". Keep the IA table as the source of truth for slugs.
- **VALIDATE**: `npm run check` passes; `tests/unit/products.test.ts` (Task A7) passes.

#### Task A3: Brand
- **ACTION**: copy `tokens.css` verbatim; write `starlight-theme.css` and `global.css`; export the logo SVGs; copy favicons and OG images from bb-homepage `public/`.
- **IMPLEMENT**: `global.css` = `@layer base, starlight, theme, components, utilities; @import '@astrojs/starlight-tailwind'; @import 'tailwindcss/theme.css' layer(theme); @import 'tailwindcss/utilities.css' layer(utilities); @import './tokens.css'; @import './starlight-theme.css';`. Logo SVGs: `viewBox="0 0 48 48"`, path `M4 34C4 17 13 8 24 8s20 9 20 26c0 6-6 8-10 4` stroke 4 round, the `1` rect and `0` circle nodes (`Logo.astro:60-63`); light file uses `#2c46c4` arc / `#16192b` nodes, dark file `#8595ff` / `#f2f0ec`. `head` adds the two `theme-color` metas (BASE_HEAD_META) and the font preload for `geist-latin-wght-normal.woff2`.
- **MIRROR**: TOKENS, STARLIGHT_THEME_MAPPING, `../bb-homepage/src/components/brand/Logo.astro`.
- **GOTCHA**: Tailwind v4 preflight does not run under Starlight's layer setup; use `--sl-*` for Starlight chrome and tokens only in bb-docs components. Brass never appears as a generic accent.
- **VALIDATE**: `npm run dev`, inspect both themes at 375 px and 1440 px; `tests/e2e/a11y.spec.ts` (Task A8) clean in both themes.

#### Task A4: Hub page and footer override
- **ACTION**: `src/content/docs/index.mdx` and `en/index.mdx` with `template: splash`; `src/components/hub/Hub.astro` as the `Hero` override; `src/components/overrides/Footer.astro`.
- **IMPLEMENT**: `Hub.astro` reads `PRODUCTS` and renders one `ProductCard` per product (name in mono, tagline for `Astro.currentLocale`, "Abrir documentación / Open docs", app link). The arc nodes use the product accent (brass for bb-sign) via the `product` prop of a copied `Logo.astro`. `Footer.astro`: `© {year} Binary Bridges S.A.S.` · binarybridges.co · `soporte@binarybridges.co` · last-updated slot from Starlight's default footer (`import Default from '@astrojs/starlight/components/Footer.astro'`).
- **MIRROR**: `../bb-homepage/src/components/footer/SiteFooter.astro:18-37`, `Products.astro` grid.
- **GOTCHA**: the `Hero` override applies to every `template: splash` page; the hub is the only one. Starlight's `components` option is global, so guard with `Astro.locals.starlightRoute.entry.id` and fall back to the default `Hero` otherwise.
- **VALIDATE**: `tests/e2e/smoke.spec.ts` "hub lists exactly the registry products" passes.

#### Task A5: Sync script and the first sync
- **ACTION**: `scripts/sync-product.mjs`.
- **IMPLEMENT**: args `<productId> [ref=main] [--from <localPath>]`; validates `productId` against the registry and `ref` against `^[A-Za-z0-9._/-]{1,80}$`; with `--from`, copies from the local checkout (used locally and in this plan's first run: `--from ../bb-sign`); otherwise `git clone --depth 1 --branch <ref> --filter=blob:none --sparse https://x-access-token:$PRODUCT_REPO_TOKEN@github.com/<repo>` into a temp dir and `git sparse-checkout set docs/api`; copies `openapi` and `vectors` into `<tmp>/sign/`, writes `sign.json` `{ repo, ref, commit, syncedAt, files: { 'openapi.json': '<sha256>', 'webhook-signature-vectors.json': '<sha256>' } }`, then `fs.rename` over `src/content/sync/sign/`. Exit 1 listing missing files. Never writes into the source clone.
- **MIRROR**: input validation style of `../bb-homepage/src/lib/articles/paths.ts:19-41` (regex + fixable message).
- **GOTCHA**: `openapi.json` `servers[0].url` is `http://localhost:8080`; the script rewrites it to `https://sign-api.binarybridges.co` in the copy and records that it did (`"rewrites": ["servers[0].url"]`) so the reference shows production URLs. Nothing else is modified.
- **VALIDATE**: `npm run sync:sign -- --from ../bb-sign && git status --short src/content/sync` shows the three files; `tests/unit/facts.test.ts` hash check passes; `npm run build` renders `/sign/api/`.

#### Task A6: Container, nginx, CSP, pipeline
- **ACTION**: `Dockerfile`, `nginx.conf`, `security-headers.conf`, `scripts/check-csp.mjs`, `.github/workflows/pipeline.yml`, `scripts/verify-deploy.sh`.
- **IMPLEMENT**: DOCKERFILE, NGINX, PIPELINE patterns. CSP: `default-src 'self'; script-src 'self' 'sha256-<starlight-theme-script>'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`. Get the hash by running `node scripts/check-csp.mjs` once with an empty whitelist: it prints the missing hashes.
- **MIRROR**: `../bb-homepage/{Dockerfile,nginx.conf,security-headers.conf,scripts/check-csp.mjs}`, `origin/main` `pipeline.yml`.
- **GOTCHA**: (1) Pagefind fetches a WASM module; if Chromium logs a CSP WASM error in `tests/e2e/search.spec.ts`, add `'wasm-unsafe-eval'` to `script-src`. (2) Starlight may emit more than one inline script (theme init, and `<script is:inline>` in some components); whitelist each hash the check prints, and only those. (3) The image tag format `main-<YYYYMMDDTHHMMSS>-<sha>` is what Flux's `ImagePolicy` orders on; keep it byte-identical.
- **VALIDATE**: `docker build -t bb-docs . && docker run --rm -p 3300:3000 bb-docs` then `bash scripts/verify-deploy.sh http://localhost:3300` passes; `curl -sI localhost:3300/ | grep -i content-security-policy`.

#### Task A7: Unit tests for the skeleton
- **ACTION**: `vitest.config.ts`, `tests/unit/{products,deploy-contract,facts}.test.ts`.
- **IMPLEMENT**: `products.test.ts`: for each `PRODUCTS[i]`, `src/content/docs/<id>/index.mdx` and `src/content/docs/en/<id>/index.mdx` exist; every folder directly under `src/content/docs/` (except `en`, `index.mdx`) is a registry id; every sidebar slug resolves to a file; `topicsFor` labels exist for both locales. `deploy-contract.test.ts` as DEPLOY_CONTRACT_TEST. `facts.test.ts`: hashes in `sync/sign.json` equal `sha256(file)`.
- **MIRROR**: `../bb-homepage/tests/unit/{i18n,deploy-contract}.test.ts`.
- **VALIDATE**: `npm run test:coverage` meets 80 % on `src/config/**`, `src/content/facts/**`, `src/lib/**`.

#### Task A8: E2E skeleton
- **ACTION**: `playwright.config.ts` (copied; web server `npx astro preview --port 4321 --ignore-lock`), `tests/e2e/{smoke,a11y,i18n,search,visual}.spec.ts`.
- **IMPLEMENT**: PATHS = `['/', '/en/', '/sign/', '/en/sign/', '/sign/api/', '/404.html']` at this phase; extend in Phases B–D. Theme is set with `addInitScript` (see E2E_A11Y note).
- **MIRROR**: `../bb-homepage/tests/e2e/*.spec.ts`, `playwright.config.ts:1-29`.
- **GOTCHA**: visual baselines are macOS Chromium only and excluded in CI (`--grep-invert visual`), exactly like the homepage.
- **VALIDATE**: `npm run build && npm run test:e2e` green on chromium, firefox, webkit.

#### Task A9: README and CLAUDE.md
- **ACTION**: rewrite `README.md`; create `CLAUDE.md` and the `.claude/PRPs/*` folders.
- **IMPLEMENT**: README sections: What this is (all Binary Bridges products, one topic each) · Develop · Add a product (registry entry + two `index.mdx` + sidebar; the test tells you what is missing) · Write a page (frontmatter fields, the fact-sheet rule, no numbers in prose, `<Tabs syncKey="lang">`) · Sync from a product repo · Legal pages (version header rule) · Deploy (image → Flux; DNS by hand) · Brand rules (brass, on-fill, no emoji). CLAUDE.md = bb-sign's §0–§7 adapted: worktrees under `.claude/worktrees/<slug>`, plan → review (`status: APPROVED`) → implement → report, plus "every claim cites `file:line` in the product repo".
- **VALIDATE**: a reader can add a fake product `demo` following the README and the registry test reports exactly the missing pieces; then revert.

### Phase B: bb-sign concepts, sender's path, signer's path (ES + EN)

#### Task B1: Fact sheet
- **ACTION**: `src/content/facts/sign.ts` and the `facts/*` components.
- **IMPLEMENT**: every row of the "Fact sheet" section as typed constants grouped by area (`AUTH`, `ENVELOPE`, `OTP`, `DOCUMENTS`, `WEBHOOKS`, `SDK`, `CERTIFICATE`, `RETENTION_POLICY`, `RETENTION_IMPLEMENTED`, `LIMITS`), each with `{ value, unit?, source: 'bb-sign/<path>:<line>' }`. `LimitsTable.astro` renders `LIMITS`; `RolesMatrix.astro` renders the catalog (`permission-catalog.txt` rows + workspace bundles); `StatusFlow.astro` draws envelope and signer flows as inline SVG with text labels (never colour alone, bb-sign §3).
- **MIRROR**: `../bb-homepage/src/i18n/references.ts` (typed data with ids, tested for dangling references).
- **GOTCHA**: `otpRequired` defaults differ: DB default `TRUE` (V002), API request default handled in `EnvelopeController.kt:107` region, SDK examples pass `false`. Document "set it explicitly".
- **VALIDATE**: `facts.test.ts` consistency assertions pass; `content.test.ts` finds no denylisted numbers in prose.

#### Task B2: Overview and concepts (9 pages × 2)
- **ACTION**: write `sign/index`, `sign/concepts/*` per the IA table.
- **IMPLEMENT**: Spanish first, English second; the `product`, `audience`, `description` frontmatter; `<Aside type="caution">` for the two surprising facts (signer download stops at archive; `/verify` checks the hash, not the PDF); `StatusFlow` in envelopes-and-signers; `RolesMatrix` in organizations-workspaces-roles.
- **MIRROR**: COPY_RULES; the UI's labels from `common.json` `status.*` and `roles.*`.
- **GOTCHA**: do not write "firma digital" for the signer's mark anywhere. bb-sign is *firma electrónica* (T1).
- **VALIDATE**: `npm run build` (links validator), `content.test.ts` parity, `a11y.spec.ts` on `/sign/concepts/envelopes-and-signers/` both themes.

#### Task B3: Getting started and sending (9 pages × 2)
- **ACTION**: `sign/getting-started/*`, `sign/sending/*`.
- **IMPLEMENT**: `<Steps>` for the wizard, using `create.json` `steps.*` and `step4.*` labels verbatim as the UI shows them; cancel page states manager/admin only; download page states 1-hour links and the 90-day cold storage in production.
- **GOTCHA**: filters: the envelope list total is capped at 10,000 (`list.countCapped`); say so.
- **VALIDATE**: as B2, plus `smoke.spec.ts` extended with `/sign/sending/send-and-track/`.

#### Task B4: The signer's path (6 pages × 2)
- **ACTION**: `sign/signing/*`.
- **IMPLEMENT**: `sign/signing/index` is the single page a signer can follow end to end; the troubleshooting table maps each `signing.json` message (`error.*`, `waiting.*`, `alreadySigned.*`, `done.archived`, `verify.invalid`) to what happened and what to do. Verification page explains the QR, the `/verify` result and its limits in neutral words ("this does not mean the signature is invalid", from `verify.unavailable`).
- **GOTCHA**: signers have no account and no support channel (bb-sign §1 "Which surface is this?"); every sentence must work for a first-time reader on a phone. Keep the page under about 900 words and test at 320 px.
- **VALIDATE**: `visual.spec.ts` adds `/sign/signing/` at 320 and 1440; `a11y.spec.ts` adds it in both themes.

### Phase C: admin operations and developer platform

#### Task C1: Admin pages (11 pages × 2)
- **ACTION**: `sign/admin/*` except `own-certificate`.
- **IMPLEMENT**: each page opens with "Who: org admin (and platform admin)" and the route in the app (`/users`, `/labels`, `/settings` tabs, `/storage/lifecycle`); webhook history statuses from `settings.json` `deliveries.status.*` and `deliveries.outcome.*`; `permissions` renders `RolesMatrix` plus the five escalation guards in prose.
- **GOTCHA**: `sign/admin/storage` must say the Storage page's numbers are the application defaults, and production tiers at 30/90 days with no expiration rule today (bb-infrastructure `aws/bb-sign-aws.yml:284-295`). Link to `/sign/legal/retention/` for the policy.
- **VALIDATE**: B2 checks plus `smoke.spec.ts` for `/sign/admin/`.

#### Task C2: Developer pages (8 pages × 2) and SDKs (2 × 2)
- **ACTION**: migrate the five `docs/api/*.md` files and the two SDK READMEs into `sign/developers/*` and `sign/sdks/*`.
- **IMPLEMENT**: apply every row of "Inaccuracies to fix"; convert per-language sections into `<Tabs syncKey="lang">`; replace `example.com` URLs with the fact-sheet URLs; link the vectors file at `/sync/sign/webhook-signature-vectors.json` (copy it to `public/sync/sign/` in the build via the sync script or an Astro `publicDir` copy, so the link is downloadable); `errors` page from the SDK status tables plus `ErrorResponse`/`QuotaViolation` from the spec.
- **MIRROR**: SDK_CODE_TABS; the existing files' voice (they already follow COPY_RULES).
- **GOTCHA**: the English originals are the source; write the Spanish translation from them, keeping code identical. `webhook-signature-spec` is normative: translate the prose, never the grammar, header names or the algorithm.
- **VALIDATE**: `search.spec.ts` finds "webhook" in both locales; `links-validator` passes; `/sign/api/` lists 17 operations (assert the count in `smoke.spec.ts` by reading `sync/sign/openapi.json`).

### Phase D: legal, scope, retention, certificate

#### Task D1: Terms, retention, electronic vs digital (3 pages × 2)
- **ACTION**: `sign/legal/terms.md`, `sign/legal/retention.mdx`, `sign/legal/electronic-vs-digital-signature.mdx`; `LegalHeader.astro`; `tests/unit/legal.test.ts`.
- **IMPLEMENT**: `terms.md` (es) = the Versión 1 text verbatim from the bb-sign worktree file, `legalVersion: 'Versión 1 · 2026-10-07'`, then a section "Conservación (borrador para la Versión 2)" with T4–T6 wording, clearly marked as draft and not yet part of the published version. `terms.md` (en) = courtesy translation with the banner "The Spanish text prevails". `retention.mdx`: the two-layer structure (policy table, implemented-today table), Ley 527 art. 12 quoted in Spanish with the three conditions and art. 13 (conservation through third parties), the recommendation to archive on `envelope.completed` with a tabbed code sample that downloads the signed documents. `electronic-vs-digital-signature.mdx`: art. 7, art. 28, Decreto 2364, T1, with a "we do not claim" list (eIDAS, ESIGN/UETA, qualified signatures; PRD `prd.md:221,546-549`).
- **MIRROR**: `LegalHeader` wording from the worktree file header; bb-homepage `LEGAL_NAME`.
- **GOTCHA**: the terms are a legal text under review. Do not improve the wording. Changes go to bb-sign's canonical file first (D-17), then sync. Add `source: docs/legal/terminos-y-condiciones.md` in frontmatter so the future sync can replace the body.
- **VALIDATE**: `legal.test.ts` passes (version present, banner present, ES/EN versions equal); `a11y.spec.ts` on `/sign/legal/terms/`.

#### Task D2: Own-certificate guide with purchase recommendations (1 page × 2)
- **ACTION**: `sign/admin/own-certificate.mdx`.
- **IMPLEMENT**: structure from `docs/guias/certificado-propio.md` §1–§8, plus: (a) an opening `<Aside type="caution">` "Your documents are being sealed with Binary Bridges' testing certificate. Validators show it as untrusted. Configure your own." (T2, T3); (b) "What to buy" checklist: certificate in the organisation's name (persona jurídica / función pública), delivered as a **PKCS#12 (.p12/.pfx) file with an exportable private key**, RSA ≥ 2048 (EC not supported), KU `digitalSignature` and preferably `nonRepudiation`, with the full chain; **not** a USB token, **not** a cloud-only key; (c) "Where to buy, Colombia": "Entidades de Certificación Digital acreditadas por el ONAC. Verifique la acreditación vigente en el directorio del ONAC antes de comprar." followed by the list (Certicámara, GSE, Andes SCD, Camerfirma Colombia, Olimpia IT, Thomas Signe, Viafirma) with official URLs and a "Lista verificada el YYYY-MM-DD" line; (d) "Where to buy, other countries": AATL members (DigiCert, GlobalSign, Sectigo, Entrust, SSL.com) with the same file-delivery warning and a dated line; (e) today's limitation aside: only the leaf certificate is embedded until bb-sign#208 ships, so validators need the ECD's root installed to show the chain; (f) upload steps using `organizations.json` `certificate.*` labels; (g) renewal (5-minute cache), security (never email the file), Acrobat check.
- **MIRROR**: COPY_RULES; brass aside only for "what the seal proves".
- **GOTCHA**: (1) Re-verify each provider's accreditation and that they sell file-based certificates before publishing; record the date on the page. (2) Say "recommend" for the product choice and "required" for the file format, never the reverse. (3) Do not quote prices; they change.
- **VALIDATE**: manual checklist below; `links-validator` passes for every external URL (use `starlight-links-validator` `errorOnRelativeLinks` default and a separate `scripts/check-external-links.mjs` run locally, not in CI).

#### Task D3: Reference pages (4 pages × 2)
- **ACTION**: `sign/reference/*`.
- **IMPLEMENT**: `limits-and-defaults` = `<LimitsTable />` only, plus one paragraph; `statuses` with the UI labels in both languages; `emails` table (7 envelope emails + 3 identity emails, sender address, recipient, trigger); glossary.
- **VALIDATE**: `content.test.ts` denylist confirms the numbers appear only through the component.

### Phase E: ship

#### Task E1: bb-infrastructure PR
- **ACTION**: `apps/docs/`, `automation/docs/`, both kustomizations, README domain row.
- **IMPLEMENT**: K8S_APP pattern; namespace `docs`; `imagePullSecrets: ghcr-pull`; first pin the image tag that the bb-docs pipeline pushed from `main`.
- **GOTCHA**: Flux's `ImageUpdateAutomation` must sit in the `docs` namespace next to its `ImagePolicy` (comment in `automation/homepage/image-automation.yaml:1-3`). The `ghcr-pull` secret exists per namespace; copy how `homepage` gets it (`secrets/` SOPS files) before applying.
- **VALIDATE**: `flux get kustomizations` healthy; `kubectl -n docs get pods` 2/2 ready; `curl -sI https://docs.binarybridges.co/healthz` once DNS resolves.

#### Task E2: DNS and go-live
- **ACTION**: user adds the `docs` A record at Namecheap to the VPS IP (same as `binarybridges.co`); then run `bash scripts/verify-deploy.sh https://docs.binarybridges.co` and `npm run test:prod`.
- **VALIDATE**: all checks pass, including security headers and `/sign/api/`.

#### Task E3: bb-homepage flag
- **ACTION**: PR to bb-homepage setting `DOCS_LIVE = true` (`src/config/site.ts:11`).
- **VALIDATE**: homepage `npm run verify` green (its smoke tests count the docs links from the flag); after deploy `scripts/verify-deploy.sh https://binarybridges.co` reports "docs links present".

#### Task E4: Follow-up issues in bb-sign (filed, not implemented here)
- Replace `docs/api/*.md` bodies with a pointer to `docs.binarybridges.co/sign/developers/…` and keep `openapi.json` + vectors canonical.
- Fix the `GET /verify` OpenAPI description.
- Fix the "stored hashed" wording in `quickstart.md` and `settings.json`.
- Add a `repository_dispatch` or workflow step so that a change to `docs/api/openapi.json` on `main` runs bb-docs' sync (optional; manual `npm run sync:sign` is acceptable for v1).

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| registry ↔ folders | `PRODUCTS`, `src/content/docs/*` | every product has es+en `index.mdx`; no unregistered folder | folder `en` ignored |
| sidebar slugs resolve | `PRODUCTS[0].sidebar` | every slug is a file in both locales or in the fallback allow-list | generated `sign/api/**` excluded |
| topic labels | `topicsFor('sign')` | labels for `es-CO` and `en`, link `/sign/` | |
| ES/EN parity | content tree | same relative paths, except allow-list (`sign/api/**`) | legal pages must exist in both |
| copy rules | every `.md/.mdx` | no emoji, no typed arrows, description 50–170 | code fences excluded from the emoji check? No: they are included, bb-sign bans them there too |
| facts denylist | prose outside components | none of `365`, `90 días`, `72 h`, `900`, `300 s`, `50 MB`, `5 MB`, `10 000` appear as literals | numbers inside `<Fact>` props allowed |
| facts consistency | `sign.ts` | 365 ≥ 90; OTP 900 > cooldown 60; token 300; link 72 | |
| sync hashes | `sync/sign.json` vs files | equal | missing file → fail with path |
| sync input validation | `sync-product.mjs foo`, `sign 'x; rm -rf'` | exit 1, message lists valid ids / regex | |
| legal version | legal pages | `legalVersion` present and equal across locales; banner text present | |
| deploy contract | `nginx.conf`, `Dockerfile` | port 3000, `/healthz`, HEALTHCHECK, no `EMAILJS` | |

### E2E
- smoke: hub cards = registry; h1 count 1 and `lang` per locale; topic switcher visible; 17 operations under `/sign/api/`; no horizontal overflow at 320; 404.
- search: "webhook" and "OTP" return results in `/` and `/en/`.
- a11y: axe WCAG 2.2 AA, light and dark, on hub, `/sign/`, `/sign/signing/`, `/sign/admin/own-certificate/`, `/sign/api/`, `/sign/legal/terms/`, 404.
- i18n: switcher keeps the page; `hreflang` alternates; fallback notice on the fixture.
- visual: 320/768/1024/1440 × light/dark for hub, `/sign/`, `/sign/signing/`, one API page.

### Edge Cases Checklist
- [ ] Empty registry entry (no sidebar) fails the unit test with the missing path
- [ ] A page with `product: sign` placed outside `sign/` fails
- [ ] A translated page missing in one locale is either in the allow-list or fails
- [ ] Sync with the product repo unreachable leaves `src/content/sync/` untouched (atomic rename)
- [ ] Build with `onBrokenLinks`-equivalent (links validator) fails on a dead internal link
- [ ] CSP: a new inline script fails `npm run build` until its hash is whitelisted
- [ ] Reduced motion: no animation (Starlight respects `prefers-reduced-motion`; assert no `[data-reveal]` leftovers)
- [ ] JavaScript disabled: content and sidebar visible (search button hidden is acceptable)

---

## Validation Commands

### Static Analysis
```bash
npm run check
```
EXPECT: Zero type errors (strict), content schema valid for every page.

### Unit Tests
```bash
npm run test:coverage
```
EXPECT: All pass; 80 % lines/functions/branches/statements on `src/config/**`, `src/content/facts/**`, `src/lib/**`.

### Build, links and CSP
```bash
npm run sync:sign -- --from ../bb-sign && npm run build
```
EXPECT: `astro build` succeeds, links validator reports 0 broken links, "CSP: every inline script is whitelisted."

### Full Test Suite
```bash
npm run verify
```
EXPECT: build + unit + Playwright (chromium, firefox, webkit) green; visual snapshots unchanged or reviewed.

### Container
```bash
docker build -t bb-docs . && docker run --rm -d -p 3300:3000 --name bb-docs bb-docs && sleep 2 \
  && bash scripts/verify-deploy.sh http://localhost:3300; docker rm -f bb-docs
```
EXPECT: "All checks passed."

### Browser Validation
```bash
npm run dev   # http://localhost:4321
```
EXPECT: both themes, 375 px and 1440 px, every page in the IA table reachable from the sidebar; the topic switcher shows bb-sign; brass appears only on seal/verification content.

### Production (after E1–E2)
```bash
bash scripts/verify-deploy.sh https://docs.binarybridges.co && npm run test:prod
```
EXPECT: 200 on every listed path, security headers present, `/sign/api/` renders.

### Manual Validation
- [ ] Read `/sign/signing/` on a phone as a first-time signer: every step is actionable without an account
- [ ] Read `/sign/admin/own-certificate/`: the "what to buy" checklist can be handed to a purchasing department as is
- [ ] Each provider in the "where to buy" lists: accreditation (ONAC) or AATL membership confirmed on the provider's or ONAC's page on the date written on the page; file-based (PKCS#12) delivery confirmed or marked "ask before buying"
- [ ] `/sign/legal/terms/` text equals the bb-sign worktree file byte for byte (Spanish)
- [ ] `/sign/legal/retention/` says "policy" for 365 days and "today" for what the infrastructure does; no sentence claims restore-on-request exists
- [ ] Nothing from the "Not shipped" list is described as available
- [ ] Every `source` in frontmatter and every fact-sheet `source` opens to the quoted line in bb-sign

---

## Acceptance Criteria
- [ ] `docs.binarybridges.co` serves the hub (es, en), `/sign/**` and `/sign/api/**` with the homepage's security headers
- [ ] The hub lists exactly the registry's products; adding a product is a registry entry plus content, and the tests say what is missing
- [ ] Every org-admin and org-user operation in bb-sign's UI has a page or section, with the role that can perform it
- [ ] A signer can follow `/sign/signing/` from email to signed copy, and the troubleshooting table covers every signer-facing message
- [ ] The developer section contains the migrated guides with the listed inaccuracies fixed, SDK pages for JavaScript and Java, and the generated reference
- [ ] `/sign/legal/terms/` and `/sign/legal/retention/` state the scope of bb-sign and the fixed, non-configurable 365-day retention, with Ley 527 art. 12 and the "conservation is the customer's" rule, and carry "Pendiente de revisión jurídica"
- [ ] `/sign/admin/own-certificate/` recommends the customer's own certificate, states the PKCS#12 requirement, and lists dated ONAC and AATL providers
- [ ] All validation commands pass; axe clean in both themes; coverage ≥ 80 %
- [ ] `DOCS_LIVE = true` merged in bb-homepage after `verify-deploy.sh` passes against production

## Completion Checklist
- [ ] Code follows the homepage patterns (tokens, CSP check, nginx, Dockerfile, pipeline, test shapes)
- [ ] Every fact in prose comes from `src/content/facts/sign.ts` with a `source`
- [ ] No emoji or typed arrows; brass only for evidence; `on-fill` on filled surfaces
- [ ] Both locales complete except the documented fallback allow-list
- [ ] Legal pages versioned and banner-marked
- [ ] README explains how to add a product and a page
- [ ] `.claude/PRPs/reports/bb-docs-sign-documentation-report.md` written per phase
- [ ] No unnecessary scope additions (no versioning, no console, no other products)
- [ ] Self-contained: no question needed during implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Starlight plugin versions move or conflict with Astro 7.3 (`starlight-openapi` peer `@astrojs/markdown-satteri`) | Medium | Medium | Pin exact minors; run `npm view … peerDependencies` in A1; Renovate grouping later |
| Docs claim a feature bb-sign does not have (restore on request, evidence certificate, expiry emails, full chain) | High without the gate | High | D5 fact sheet with sources; "Not shipped" list; manual checklist item; `content.test.ts` denylist |
| Terms diverge from bb-sign's canonical file (D-17) | Medium | High | Verbatim copy, `source` frontmatter, `legal.test.ts`, sync once #208 merges; user decision recorded in Notes |
| Provider list goes stale or names a non-accredited vendor | Medium | Medium | Dated list; "verify in ONAC's directory" sentence; manual checklist; no prices |
| Customers buy a token or cloud-HSM certificate bb-sign cannot use | Medium | High | The PKCS#12-file requirement is the first bullet of "What to buy" and repeated in "Where to buy" |
| CSP breaks Pagefind (WASM) or a Starlight inline script | Medium | Low | A6 gotchas; `check-csp.mjs` fails the build before deploy |
| `starlight-sidebar-topics` leaves generated API pages without a sidebar | Medium | Low | `topics: { sign: ['/sign/api', '/sign/api/**/*'] }` plus the smoke test |
| Spanish translations drift from the English developer originals | Medium | Medium | Code blocks identical by construction (shared snippets in `src/content/snippets/` imported by both locales); parity test |
| XL scope stalls | Medium | Medium | Phase A ships alone; B–D split by audience; each PR green on `npm run verify` |
| DNS/Flux steps need the user | Certain | Low | E1–E3 isolate them; bb-docs is complete and verifiable in a container before they happen |

## Notes

**Decisions recorded for the user (no blocker, defaults chosen):**
1. **Stack change from the 2026-09-26 plan.** Docusaurus → Astro + Starlight, because the brief asks for parity with bb-homepage. Everything else that plan got right (product registry, atomic sync, "no console", brass rule, the DX follow-ups) is kept.
2. **Terms canonical location.** The LV contract (D-17) makes `bb-sign/docs/legal/terminos-y-condiciones.md` canonical and renders it in the app. bb-docs mirrors it verbatim with the same version header rather than becoming a second source. If the user prefers bb-docs to be canonical for public legal texts, amend the LV contract in bb-sign and drop the `source` sync; nothing else in this plan changes.
3. **Retention wording.** The fixed 365-day retention is a binding policy (LV §1, D-13, T4–T6) that the infrastructure does not yet enforce (no expiration rule in production, no restore job). The docs state it as the service's terms and describe what runs today separately. When bb-sign#214 ships, only the "implemented today" table changes.
4. **English API reference only.** starlight-openapi generates one language; Spanish readers reach it through fallback with Starlight's notice.
5. **No per-release versioning.** One current version with `sync/sign.json` recording the bb-sign commit. Revisit when a second major API version exists.

**Follow-ups worth a later plan (from the superseded plan's notes):** recipes page per use case, an errors page generated from `starter-web-errors` codes, a changelog per product from GitHub Releases, bb-control once it has public docs.

**Sources consulted outside the repos (2026-10-07):** Starlight configuration, i18n and CSS guides and plugin directory; `starlight-sidebar-topics` and `starlight-openapi` configuration pages and `package.json` peer dependencies; Ley 527 de 1999 text (Función Pública, Colpensiones); ONAC ECD scheme page; Viafirma's list of Colombian certification entities; Adobe AATL program page; GlobalSign AATL FAQ; SSL.com document-signing pages.
