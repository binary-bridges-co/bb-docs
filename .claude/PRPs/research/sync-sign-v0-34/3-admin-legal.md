# Docs audit 3: admin and legal pages (bb-docs vs bb-sign main)

- bb-docs worktree: `bb-docs/.claude/worktrees/sync-sign-v0-34` (HEAD 92077ba). Paths below are relative to it: `src/content/docs/sign/...` (es) and `src/content/docs/en/sign/...` (en).
- bb-sign ground truth: `bb-sign/.claude/worktrees/audit-main` (df6a2a6). Cited as `bb-sign/<path>`.
- Production: `bb-infra-worktrees/audit-main` (5a8468f, every bb-sign service on v0.34.0, FrontendVersion v0.34.1). Cited as `bb-infra/<path>`.
- Severity: **WRONG** = false on main/prod today (including things that were never true); **OUTDATED** = true at d1badc5, changed since; **MISSING** = a shipped feature the page does not cover.
- The English twins have the same structure. Where the line numbers differ, the en line is given after a slash.

Production caveats that limit what the docs may promise (each one checked in bb-infra):

| Caveat | Proof |
|---|---|
| No Glacier transition is live on the documents bucket. Nothing is archived in production yet, so "Solicitar restauración" never shows in practice. | `bb-infra/aws/bb-sign-aws.yml:439-443` ("No Glacier transition is live ... until #214 P5"), `:264-281` |
| Archive dates are hidden ("Se archiva a partir del" never shows). `APP_RETENTION_ARCHIVE_DATES_VISIBLE` is unset, so it defaults to false. | `bb-sign/edge-api/src/main/resources/application.yml:261`; not set in `bb-infra/apps/bb-sign/edge-api.yaml` |
| Agreement pinning at send is OFF. Signers do not accept the published authorization yet, and platform default texts are never seeded. | `bb-infra/apps/bb-sign/edge-api.yaml:62-68`, `bb-infra/docs/runbooks/agreements.md:3-8` |
| Admin MFA is ON for `platform_admin` and `org_admin` | `bb-infra/apps/platform/keycloak.yaml:73`, `bb-infra/apps/platform/configs/keycloak/kc-init.sh:726-743` |
| Evidence certificates are issued (worker has the evidence bucket, audit key and tagging) | `bb-infra/apps/bb-sign/document-processing-worker.yaml:48-58` |

---

## sign/admin/index.mdx (en/sign/admin/index.mdx)

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 OUTDATED | 29 / 28 | Certificate: "Sección **Certificado de firma**, junto con Binary Bridges" | Org admins upload, replace and delete it themselves in **Configuración**, tab **Certificado**. | `bb-sign/frontend/src/pages/Settings.tsx:39,183-186`; `frontend/src/auth/permissions.ts:59`; `edge-api/.../presentation/admin/OrgCertificateController.kt:49` | "**Configuración**, pestaña **Certificado**" |
| 2 MISSING | table 20-33 / 19-32 | no row for agreements | New tab **Configuración → Acuerdos**: the organization's identity (razón social, NIT, privacy email, URL, address, phone) and published versions of the data-processing authorization | `Settings.tsx:39,187-190`; `i18n/locales/es/settings.json:209-314` | Row "Datos personales / Identificación de la organización y autorización de tratamiento de datos / Configuración, pestaña Acuerdos", linking to the new page (see "New pages proposed") |
| 3 MISSING | table | no evidence row | Envelope page: **Certificado de evidencia (PDF)** and **Registro de auditoría (JSON)** downloads, for anyone with document download in the workspace | `frontend/src/components/EvidenceCertificateRow.tsx:17-39`; `envelopes.json:85-96` | Row "Supervisión / Descargar el certificado de evidencia y el registro de auditoría de un sobre / Detalle del sobre" |
| 4 MISSING | table | no restore row | Envelope page: **Conservación** block (dates) and per-file **Solicitar restauración** | `frontend/src/pages/EnvelopeDetail.tsx:300-316`; `envelopes.json:98-118` | Row "Datos / Consultar las fechas de conservación y restaurar un archivo archivado / Detalle del sobre, Conservación". Note that nothing is archived in production yet. |
| 5 MISSING | 39-51 / 38-50 | BB task list | The evidence certificate language is set only by a platform admin, on the organization page | `frontend/src/pages/OrganizationDetail.tsx:137-138`; `organizations.json:59-71` | Add "Definir el idioma de los certificados de evidencia (español o inglés) / Página de la organización, Idioma de la evidencia" |
| 6 OUTDATED | 50 / 49 | "Entregar los eventos de auditoría de la organización / A solicitud, por soporte" | Each envelope's trail is downloadable from the envelope page (JSON). Org-scope events exist behind `GET /api/v1/audit/org-events` (`audit:read-org`, admins), with no UI and outside the published OpenAPI. | `EvidenceCertificateRow.tsx:39`; `edge-api/.../admin/AuditReadController.kt:63-65` | Keep the row for organization-level events only, and add that envelope trails are self-service. Decide (owner) whether to document org-events. |
| 7 MISSING | 14-16 / 13-15 | nothing on sign-in | Admins must use an authenticator app (TOTP) to sign in | see users-and-invitations #1 | One sentence plus a link: "Las cuentas de administrador entran con un segundo factor; ver Usuarios e invitaciones." |

## sign/admin/own-certificate.mdx (en/sign/admin/own-certificate.mdx)

Frontmatter `source: docs/guias/certificado-propio.md`, but the page is an adaptation, not a mirror (compare with "Legal mirror" §C).

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 OUTDATED | 102-106 / 100-104 | Section on the organization page, reached from **Organizaciones**; "Si su menú no muestra Organizaciones, coordine la carga con Binary Bridges" | Org admins use **Configuración → Certificado**. The org page section is the platform admin's route. | `Settings.tsx:39,185-186`; `OrganizationDetail.tsx:108-111`; guide `docs/guias/certificado-propio.md:41` | "Vaya a **Configuración**, pestaña **Certificado**" (guide wording), with the org page mentioned as the platform admin's route |
| 2 WRONG | 110-112 / 107-109 | Without a certificate you see «No hay certificado configurado — se usará el certificado global de reserva» | That string is gone. With the default certificate the tab shows the notice **Certificado de pruebas predeterminado**, the body text, "No se bloquea el envío...", and links **Cómo configurar su certificado** / **Términos del servicio**. "No hay certificado configurado" alone shows only when no certificate exists at all. | `frontend/src/components/OrganizationCertificate.tsx:110-131,201-205`; `organizations.json:75,94-100` | Replace step 1 with the testing-certificate notice and quote `defaultTesting.title` |
| 3 MISSING | after 117 / after 114 | upload result = label + expiry | After upload the card shows **Titular**, **Emisor**, **Expira:** (amber with "(N días)" under 30 days, red **Venció:** once expired), the fingerprint and a chain chip: **Cadena completa / Sin raíz / Solo el certificado / Autofirmado / Sin revisar**. Warnings show under «El certificado se subió, con advertencias». | `OrganizationCertificate.tsx:21,156-199,208-227`; `organizations.json:101-132` | New subsection "Estado de la cadena" with a table of the 5 chips and the 4 warnings (`CHAIN_LEAF_ONLY`, `CHAIN_NO_ROOT`, `CHAIN_SELF_SIGNED`, `UNRELATED_CERTIFICATES`), in the guide's wording (`certificado-propio.md:41-47`) |
| 4 OUTDATED | 121-133 / 117-130 | Rules table: extensions, 5 MB, expired, key < 2048, key usage, replaces, password, PEM | Also refused: a broken chain, a private key that does not match the certificate, no private key, more than one private key, and any non-RSA key (EC, EdDSA, RSA-PSS). Nothing is deactivated before every check passes. | `edge-api/.../usecase/UploadOrgCertificateUseCase.kt:84-90,163-168,210-218`; `domain/certificate/CertificateChainInspector.kt:42-49,65-73,112`; guide `:49` | Add the rows. Change "Las llaves de curva elíptica (EC) no son compatibles" (35 / 34) to "Solo se admiten llaves RSA: se rechazan EC, EdDSA y RSA-PSS". UI hint: «Máximo 5 MB. Solo se admiten llaves RSA.» (`organizations.json:84`) |
| 5 OUTDATED | 98-100 / 96-98 | "El sello incluye el certificado de la organización" | The signature embeds the whole chain (leaf, intermediates, root as uploaded) | `document-processing-worker/.../PdfDigitalSignatureService.kt:12-16,226-227` (8cc60b80) | "El sello incluye la cadena completa que usted subió; para verla como válida, Acrobat debe confiar en la raíz" (guide §7 `:57-59`). The fact `CERTIFICATE.chainEmbedded = 'leaf only'` (`src/content/facts/sign.ts:253-254`) is WRONG too. |
| 6 MISSING | 138-142 / 135-139 | Renewal: "Anote la fecha de vencimiento" | Daily job sends org admins a bilingual email 30 and 7 days before expiry, subject "bb-sign: el certificado de sello de su organización vence en N días · Your organization's sealing certificate expires in N days". Terms clause 2.4 states it is an aid only. | `edge-api/src/main/resources/application.yml:179-181`; `notification-service/.../CertificateExpiryEmails.kt:95-99`; terms `docs/legal/terminos-y-condiciones.md:21`; guide `:55` | Add the guide paragraph (`certificado-propio.md:55`) and an Aside quoting clause 2.4. Add the email to `EMAILS` facts / reference page. |
| 7 OUTDATED | 144-147 / 141-144 | QR verification compares with the **active** certificate; after a change, earlier seals no longer verify | Since seal v2 (#211 P2) each signature stores its certificate fingerprint and document-set hash. Only legacy v1 seals without a stored fingerprint fall back to the active certificate. | `edge-api/.../usecase/VerifySignatureSealUseCase.kt:49-72` (cf1af3a5) | "Las firmas recientes guardan la huella del certificado con que se sellaron y siguen verificando después de un cambio. Solo los sellos antiguos..." Confirm the cut-over release with the signing audit (scope 2). |
| 8 MISSING | — | — | Certificate upload and deletion, and each expiry notice, are audit events (`CERTIFICATE_UPLOADED`, `CERTIFICATE_DELETED`, `CERTIFICATE_EXPIRING`) with the actor | `audit-service/.../domain/AuditEventType.kt:90-97`; `UploadOrgCertificateUseCase.kt:118-119` | One line plus a link to audit-trail |
| 9 MISSING | 13-23 / 13-23 | — | Guide §1 sentence: the certificate "No es la firma digital de las personas que firman" | guide `:7-9` | Add it. It is a key legal distinction. |

## sign/admin/audit-trail.mdx (en/sign/admin/audit-trail.mdx)

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 OUTDATED | 19-20 / 19-20 | Each event shows "quién lo originó (el correo de la persona o «Sistema»)" | The actor is the person's name (or email). An API credential shows its label and client id with an **API** badge. Fallbacks: «Sistema», «Actor no registrado», «Usuario desconocido», «Credencial de API». | `frontend/src/api/auditActor.ts:14-25`; `pages/EnvelopeDetail.tsx:29-43`; `envelopes.json:131-138` | Rewrite the sentence and add a short table of actor labels with the API badge |
| 2 OUTDATED | 26-34 / 26-34 | 8 event rows (signing view, email) | The trail now also records envelope life cycle (`ENVELOPE_CREATED/SENT/CANCELLED/EXPIRED/ARCHIVED`), `DOCUMENT_ADDED` (SHA-256 of the original), `DOCUMENTS_SEALED`, `OTP_REQUESTED/VERIFIED/FAILED/LOCKED`, `SIGNER_AGREEMENT_ACCEPTED`, `EVIDENCE_CERTIFICATE_ISSUED/FAILED/ACCESSED/REISSUE_REQUESTED`, `DOCUMENT_RESTORE_REQUESTED`, `DOCUMENT_RESTORED`. The UI shows Spanish labels for the known types (e.g. "Sobre creado"). | `audit-service/.../domain/AuditEventType.kt:10-97`; `auditActor.ts:27-44`; `envelopes.json:139-162` | Rebuild the table from `AuditEventType` with the UI labels, and add the hash lines (`hashes.*`, `envelopes.json:156-162`) |
| 3 WRONG | 36-37 / 36-37 | Envelope status (created, sent, cancelled, expired) "se consulta en el propio sobre" (implies not audited) | They are audit rows with the actor (#73) | `AuditEventType.kt:23-28` | Delete the paragraph or say they appear in the trail with who did them |
| 4 OUTDATED | 41-48 / 41-48 | Config events: credentials, webhooks, workspaces, members; "solicítelos al soporte" | Also certificate upload/delete/expiry, `AGREEMENT_COPY_PUBLISHED`, `AUDIT_TRAIL_EXPORTED`. Every row carries its actor (#73 PR D2). | `AuditEventType.kt:48-66,90-97`; commit 36c25f08 | Extend the list. Note the actor. See index #6 on support vs API. |
| 5 OUTDATED | 52-55 / 52-55 | Hash over content plus previous event of the same envelope; config events "llevan también su propio hash" | Chain v4: every row belongs to one chain, `env:<id>`, `org:<id>` or `global`, with gap-free `seq`. Org config events are chained on `org:<id>`. A completed envelope gets a checkpoint copied into the evidence certificate. A nightly verifier checks the chains, and an anomalies register exists for signed-off legacy issues. | `docs/audit/hash-chain-v4.md:13-40,247-252`; commits 055d504b, f3adf545 | Rewrite in plain terms: three chain kinds, checkpoint anchored in the evidence certificate, nightly verification |
| 6 OUTDATED | 57-58 / 57-58 | "Si necesita presentar la evidencia ... solicítela al soporte" | Self-service: **Certificado de evidencia (PDF)** and **Registro de auditoría (JSON)** (frozen `bbsign.audit-export.v1` up to the checkpoint) on the envelope page, for users with document download. API: `GET /api/v1/audit/envelopes/{id}/export` (`audit:read`, records `AUDIT_TRAIL_EXPORTED`; not in published OpenAPI) and `/evidence-certificate[/download]` (published). | `EvidenceCertificateRow.tsx:17-39`; `envelopes.json:85-96`; `AuditReadController.kt:66-83`; `docs/api/openapi.json` paths | New section "Descargar la evidencia de un sobre", with the 300 s link and each download being audited |
| 7 MISSING | — | — | States of the evidence row: processing, failed, «Completado antes de habilitar los certificados de evidencia», expired, restricted | `envelopes.json:89-94` | Table of states with what to do |

## sign/admin/storage.mdx (en/sign/admin/storage.mdx)

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 WRONG | 35 / 34 | "Paso a almacenamiento de archivo: A los 90 días" (as current behavior, from `RETENTION_IMPLEMENTED.documentsGlacierDays`) | Production has no live Glacier transition. Terms 3.2 says documents "pueden trasladarse" after 90 days. | `bb-infra/aws/bb-sign-aws.yml:439-443`; terms `:31` | "Pueden pasar a almacenamiento de archivo después de 90 días (términos, 3.2)". Correct the fact `RETENTION_IMPLEMENTED.documentsGlacierDays` source/meaning (`facts/sign.ts:272`) too. |
| 2 OUTDATED | 23-28 / 22-27 | **Configuración** shows the days for tiers and **Expiración de objetos** | `GET /lifecycle` now returns the declared policy from code constants (365 / 30 / 90) and, separately, the real bucket rules (transitions and tag filters). It is a drift view. | `edge-api/.../admin/LifecycleController.kt:10-15,94-103` | Say the Configuración numbers are the product's declared policy, and the rules list is what the bucket actually has |
| 3 OUTDATED | 34 / 33 | "Conservación de los documentos firmados: 365 días" | Terms 3.1: originals, signed documents and evidence, 365 days each, counted from when each file is uploaded or generated. Erased in the following days, unrecoverable. | terms `:29`; guide `conservacion-y-restauracion.md:9-10` | Expand the row |
| 4 OUTDATED | 37-39 / 36-37 | "su recuperación toma más tiempo" | Self-service restore on the envelope page (**Solicitar restauración**), by API, and by the signer (**Solicitar mi copia**). Email when ready, `document.restored` webhook, copy available 7 days. Evidence certificate and audit trail are never archived. | `frontend/src/components/retention/DocumentFiles.tsx:81`; `EnvelopeDetail.tsx:300-316`; `bb-infra/apps/bb-sign/edge-api.yaml:69-75`; guide `:17-58` | Replace with a short summary and a link to the new retention-and-restore page. Add "en producción todavía no se archiva ningún archivo". |
| 5 MISSING | — | — | Envelope page **Conservación** block: «Deja de estar disponible el …» (00:00 UTC), «Se archiva a partir del …» only when archive dates are enabled (off in prod), links to terms and guide | `envelopes.json:98-104`; `edge-api/src/main/resources/application.yml:261` | Section "Fechas de conservación de cada sobre" |
| 6 OUTDATED | 49-51 / 47-49 | Platform admin can change **Expiración de objetos** with **Aplicar** | PUT still exists, but in production CloudFormation owns the rules and edge-api does not write lifecycle under `prod`. Removal of PUT is tracked in #227. | `LifecycleController.kt:14-15`; `edge-api/.../storage/LifecycleInitializer.kt` (`@Profile("!prod")`) | Drop "Cambiar el ciclo de vida" as a support task (index 49 / 48) or mark it as not applicable in production. Confirm with the owner. |

## sign/admin/users-and-invitations.mdx (en/...)

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 MISSING | 48-52 / 47-51 | Invitation = set password | An admin invitation (org admin, platform admin) also forces **authenticator app (TOTP) enrolment** before the person reaches the app. Every admin sign-in asks for the 6-digit code (30 s, not reusable). Password reset asks for the code after the new password, so a mailbox alone never gets past it. Members are not asked. | `edge-api/.../admin/UserController.kt:87-91,136`; `bb-infra/apps/platform/keycloak.yaml:73`; `bb-infra/.../kc-init.sh:663-664,726-743`; `bb-sign/infrastructure/configs/keycloak/kc-dev-init.sh:827-845` | New section "Segundo factor para administradores" in es/en, also cross-linked from getting-started/your-account (other auditor) |
| 2 MISSING | — | — | Password policy: at least 12 characters (max 128), not the username or email, not one of the last 5. Brute-force protection: after 10 failures, waits grow by 60 s up to 15 min (no permanent lockout). | `bb-infra/.../kc-init.sh:658-662` | Add to the invitation section, or to the account page if the other auditor covers it there |
| 3 MISSING | 40-43 / 39-42 | Admin role list | Org admin also manages the certificate and the agreements/identity | `permissions.ts:59,68-69`; `PermissionCatalog.kt:59` | Add "certificado y acuerdos" to the Org Admin row |

## sign/admin/permissions.mdx (en/...)

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 WRONG | 44 / 42 | "Estos cinco permisos nunca se conceden a una credencial" | Six: `agreement:manage` was added to the API escalation guards, "a key that can rewrite the signers' legal text or the controller's identity" | `edge-api/.../security/PermissionCatalog.kt:82-90` | "seis"; item 6 "Gestionar acuerdos e identificación (`agreement:manage`)". Update `ORG_API_NEVER` (`facts/sign.ts:90-96`). |
| 2 WRONG (facts) | RolesMatrix (30) | matrix from `ORG_PERMISSIONS` | Missing `agreement:read` (all four roles) and `agreement:manage` (admins) | `PermissionCatalog.kt:59,67,71`; `facts/sign.ts:63-73` | Add both rows to the fact |
| 3 OUTDATED | 24-26 / 23-25 | org_member / org_api scope "Consultar espacios y claves de etiqueta" | Plus reading agreement copies | `PermissionCatalog.kt:67,71` | Add "y copias de acuerdos" |
| 4 OUTDATED | 24 / 23 | org_admin scope list | Plus certificate and agreements | `OrgCertificateController.kt:49`; `PermissionCatalog.kt:59` | Add |

## sign/admin/webhooks.mdx (en/...)

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 OUTDATED | 38-45 / 37-44 | 6 events | 8 events: also `envelope.evidence_issued` («Certificado de evidencia listo (después de una finalización sin él)») and `document.restored` («Documento archivado restaurado (o no se pudo restaurar)») | `frontend/src/api/types.ts:474-487`; `settings.json` `webhooks.events.*`; commit 8c48c78d (#214 P3 T15) | Add the 2 rows. `WEBHOOK_EVENTS` fact (`facts/sign.ts:187`). The payload changes (`data.retention`, evidence, `signedSha256`) belong to the developer audit. |

## sign/admin/api-credentials.mdx, workspaces-and-members.mdx, labels.mdx, quota-and-usage.mdx

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 MISSING | api-credentials 67-69 / 66-68 | creation and revocation are audited | Envelope actions made by a credential show as that credential (label, client id, **API** badge) in each envelope's trail | `auditActor.ts:18-22`; `EnvelopeDetail.tsx:29-43` | One sentence: "Lo que hace una credencial queda en el registro de auditoría a su nombre, con la insignia API" |
| 2 MISSING | workspaces-and-members (no audit mention) | — | Workspace create/rename/delete and member grant/revoke are audited with the actor (`WORKSPACE_*`) | `AuditEventType.kt:55-60`; commit 36c25f08 | One sentence plus a link |
| — | labels, quota-and-usage | — | No UI or i18n change since d1badc5 (`git log d1badc5..HEAD` on quota.json, labels.json, users.json, QuotaUsageCard, LabelKeys, Users: empty) | — | none |

## sign/legal/terms.mdx (en/sign/legal/terms.mdx)

The page is not a byte-for-byte mirror of `bb-sign/docs/legal/terminos-y-condiciones.md`, not even of the Versión 1 it claims (`git show f5a7e5ed:docs/legal/terminos-y-condiciones.md`).

| # | docs file:line (es = en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 OUTDATED | 7 | `legalVersion: "Versión 1 · 2026-10-07"` | Main: Versión 3 · 2026-10-19. Owner decision: Versión 4 · 2026-10-20. | terms `:3` | `"Versión 4 · 2026-10-20"` in both locales |
| 2 OUTDATED | 3 | description "(Versión 1) y cláusulas ... Versión 2" | All three sections are in force | — | e.g. "Términos vigentes del servicio bb-sign: naturaleza del servicio, certificado de sello y conservación de documentos y evidencias." |
| 3 WRONG | 17 | "forman parte del contrato de prestación de servicios entre ... Se publican en la aplicación como referencia y no requieren aceptación en línea. Cada cambio genera una nueva versión, que queda registrada en el historial al final de esta página." | "hacen parte del contrato de prestación de servicios suscrito entre ... Se publican en la aplicación para consulta; no requieren aceptación en línea. Cada cambio incrementa la versión y queda en el historial al final del documento." (identical since V1) | terms `:5`; f5a7e5ed `:5` | Copy verbatim |
| 4 MISSING | after 31 | — | Clause **2.4** (30/7-day expiry emails, an aid only) | terms `:21` | Insert verbatim |
| 5 OUTDATED | 33, 35 | 2.4 / 2.5 | Now 2.5 / 2.6 | terms `:23,25` | Renumber |
| 6 WRONG | 35 | "...y los usa exclusivamente para sellar los documentos de esa organización." | "...y los usa para sellar los documentos de esa organización y la evidencia que bb-sign genera para ellos, y para ningún otro fin." (same in V1) | terms `:25`; f5a7e5ed `:23` | Verbatim. `tests/unit/legal.test.ts:43` checks only the prefix, which is why this was missed. |
| 7 OUTDATED | 41-54 | "Conservación de documentos (borrador de la Versión 2)", caution Aside "Borrador", clauses 3.1-3.4 in bb-docs' own words, numbers through `<Fact>` | Section **3. Conservación de documentos y evidencias** is in force: 3.1 Plazo fijo, 3.2 Archivo después de 90 días, 3.3 Conservación a cargo del cliente. The text is much longer: per-file counting, deletion, restore by user/API/signer, email plus `document.restored`, 7-day copy, evidence and audit never archived. Numbers are written "trescientos sesenta y cinco (365)". | terms `:27-33` | Replace with the verbatim §3. Remove the Aside and the `<Fact>` components inside legal text. |
| 8 WRONG | 54 | **3.4** data-processing authorization clause | No clause 3.4 exists in any version | terms `:27-33` | Delete |
| 9 OUTDATED | 37-39 | History: only "Versión 1 (2026-10-07): secciones 1 y 2.", placed before §3 | History at the end, 4 lines (see Legal mirror §A) | terms `:35-39` | Replace and move to the end |
| 10 note | 31 (2.3), §3.3 | links rewritten to `/sign/admin/own-certificate/`, `/sign/legal/retention/` | Canonical `/guias/certificado-propio`, `/guias/conservacion-y-restauracion` | terms `:19,33` | Allowed rewrite, but record it as the only permitted transform. Point 3.3 at the new guide mirror page. |
| 11 OUTDATED (en) | en 1-54 | Courtesy translation of V1 plus draft | — | — | Retranslate V4 in full: 2.4, 2.6 wording, §3, 4-line history. Keep "The Spanish version prevails". |

## sign/legal/retention.mdx (en/sign/legal/retention.mdx)

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 OUTDATED | 34-35 / 32-33 | "...recogidos en la cláusula de conservación ... (borrador de la Versión 2)" | Section 3 of the terms in force | terms `:27-33` | "...en la sección 3 de los Términos y condiciones" |
| 2 OUTDATED | 39-42 / 37-40 | Policy table: signed documents and evidence; cold archive "A los 90 días"; restore "A solicitud" | Originals too, counted per file; archive "pueden trasladarse"; restore by an authorized user (app/API) or the signer (own copy); email plus `document.restored`; 7 days; evidence certificate and audit trail never archived | terms `:29-31` | Align the wording with 3.1-3.2 (or quote them) |
| 3 WRONG | 51 / 49 | Current behavior: "paso a archivo en frío a los 90 días" | No Glacier transition live in production | `bb-infra/aws/bb-sign-aws.yml:439-443` | "Hoy: ningún archivo pasa a archivo en frío; la transición se activará más adelante (#214 P5)" |
| 4 OUTDATED | 50 / 48 | Standard-IA at 30 days as current behavior | The CloudFormation block is frozen and not applied (same comment). Live state unverified from the repo. | `bb-infra/aws/bb-sign-aws.yml:264-281,439-443` | Remove the row or verify against AWS before claiming it (owner / ops) |
| 5 OUTDATED | 52 / 50 | "Restauración a solicitud: se gestiona con Binary Bridges; no se descarga desde la aplicación" | Self-service in the app, the API (`POST .../documents/{docId}/restore`, 202/200/410/429/503) and for the signer. Production config: 7 days, first poll after 3 h, max 50 active per org. | `docs/api/openapi.json` path `/api/v1/envelopes/{id}/documents/{docId}/restore`; `bb-infra/apps/bb-sign/edge-api.yaml:69-75`; guide `:17-52` | Rewrite the row and link the new guide page |
| 6 OUTDATED | 55-56 / 53-54 | "Fuera de producción, la página Almacenamiento muestra valores por defecto de pruebas" | The page shows the declared policy (code constants) in every environment, plus the real bucket rules | `LifecycleController.kt:10-15,94-103` | Rewrite |
| 7 WRONG | 207-211 / 211-215 | The signer's copy is available only until the envelope moves to "Archivados" | Archived envelopes and their documents stay readable and downloadable; a returning signer's link serves the signed copy after archiving (and can request a restore even if the link expired for signing) | commit e020ddd0 (#122, #214 P0); guide `:52` | Delete the Aside, or state the 365-day rule for the signer copy |
| 8 OUTDATED | 93-109 / 95-113 | Archive steps: list documents, download `signedUrl` | Guide §4: also subscribe to `envelope.evidence_issued`, use `data.documentsPath`, compare SHA-256 with `data.documents[].signedSha256`, download the evidence certificate (`data.evidenceCertificate.downloadPath`, 300 s), store `data.retention.deletesAt`, handle `signedDocumentsStatus: PREPARING` | guide `conservacion-y-restauracion.md:60-76` | Update the steps and the three code tabs. Coordinate with the developer audit. |
| 9 OUTDATED | 19-27 / 18-26 | "Valor probatorio: la evidencia se puede consultar y descargar" | Now true via the evidence certificate. Signature binding to document hashes and auth method per signature. | `EvidenceCertificateRow.tsx`; commit 8c48c78d (#209 P4) | Name the evidence certificate explicitly |

## sign/legal/electronic-vs-digital-signature.mdx (en/...)

| # | docs file:line (es / en) | currently says | reality on main | proof file:line | proposed change |
|---|---|---|---|---|---|
| 1 OUTDATED (owner decision) | 15-18 / 15-18 | caution Aside titled "Pendiente de revisión jurídica" / "Pending legal review", "...aún no ha sido revisada por un abogado" | Banner removed everywhere (2026-10-20) | owner decision | Remove the Aside, or keep only "Esta página describe el mecanismo de bb-sign y cita la norma aplicable; no constituye una opinión jurídica." under a neutral title (e.g. "Alcance de esta página"). Owner to confirm the disclaimer stays. |
| 2 MISSING | 76-89 / 81-91 | Method list (email, OTP, approval, integrity, audit) | Each signature records how the signer was identified (`EMAIL_LINK` / `EMAIL_LINK_OTP`, challenge id, masked destination). A sealed **evidence certificate** (org copy and signer copy) is issued per completed envelope and anchors the audit checkpoint. | commit 8c48c78d (#209 P4, #213 P3); `hash-chain-v4.md:33-40` | Add an "Certificado de evidencia" bullet and "el método de identificación queda en cada firma" |
| 3 OUTDATED | 97-104 / 100-106 | Seal paragraph | Full chain embedded; testing-certificate notice in the app; expiry emails (2.4) | `PdfDigitalSignatureService.kt:226-227`; terms `:21` | Mention the chain and link clause 2.4 |

---

## Legal mirror and banner removal

### How legal texts are mirrored today

- **Not synced.** `scripts/sync-product.mjs:36-41` and `src/config/products.ts:79-82` copy only `docs/api/openapi.json` and `docs/api/webhook-signature-vectors.json`; the manifest `src/content/sync/sign/sign.json` lists only those 2 files (commit d1badc5). Plan D10 (`.claude/PRPs/plans/completed/bb-docs-sign-documentation.plan.md:59`) promised that "the sync script also copies that file and a test asserts the versions match". That was never done.
- **The terms are hand-written MDX** (`src/content/docs/sign/legal/terms.mdx`, frontmatter `source: docs/legal/terminos-y-condiciones.md`, `legalVersion`), rendered with `LegalHeader`. The only guard is `tests/unit/legal.test.ts`: same `legalVersion` in both locales, `<LegalHeader` present, `source: docs/legal/`, and 3 substring checks. Clause 2.5's wrong ending and the paraphrased intro pass.
- **Guides.** `docs/guias/certificado-propio.md` has no mirror. `sign/admin/own-certificate.mdx` is an adaptation with a `source:` pointing at it, missing guide §1, §5 chain statuses and rejections, §6 email, §8. `docs/guias/conservacion-y-restauracion.md` has **no page at all**. `sign/legal/retention.mdx` overlaps partly and is outdated.
- Facts inside legal text: `terms.mdx:48,50` render 365/90 through `<Fact>`, so the canonical "trescientos sesenta y cinco (365) días" cannot be verbatim. The CLAUDE.md rule "numbers come from the fact sheet" conflicts with "verbatim".

### A. Exact canonical text bb-docs must carry (after the bb-sign owner change)

Header: `**Versión 4** · 2026-10-20` (no banner). Body = `docs/legal/terminos-y-condiciones.md:5-33` as on main. History:

```
- Versión 1 (2026-10-07): secciones 1 y 2.
- Versión 2 (2026-10-19): sección 3, conservación de documentos y evidencias.
- Versión 3 (2026-10-19): avisos de vencimiento del certificado (2.4); las cláusulas 2.4 y 2.5 pasan a ser 2.5 y 2.6.
- Versión 4 (2026-10-20): publicación final; las cláusulas no cambian.
```

Guides: `certificado-propio.md:3` becomes "Esta guía acompaña a los [Términos y condiciones del servicio](/legal/terminos)." and `conservacion-y-restauracion.md:3` becomes "Esta guía acompaña la sección 3 de los [Términos y condiciones del servicio](/legal/terminos)." (prefix "**Pendiente de revisión jurídica.** " dropped).

### B. Files and lines to change in bb-docs

| File:line | Change |
|---|---|
| `src/components/legal/LegalHeader.astro:2-5` | Docblock: "version and date (LV contract D-17)". Drop "the 'Pendiente de revisión jurídica' notice until counsel approves it". |
| `src/components/legal/LegalHeader.astro:16-25` | Remove the `pending` key from both locales. Keep `prevails` (en). |
| `src/components/legal/LegalHeader.astro:29` | `<span><strong>{version}</strong></span>` (drop ` · <strong>{t.pending}</strong>`) |
| `src/styles/starlight-theme.css:101` | Comment "the legal banner" becomes "the legal version header" (optional; styles stay) |
| `src/content/docs/sign/legal/terms.mdx:3,7,10-54` | Description, `legalVersion: "Versión 4 · 2026-10-20"`, verbatim body V4 (see the terms table rows 3-10), remove the `Aside`/`Fact`/`RETENTION_POLICY` imports (10-11, 13) |
| `src/content/docs/en/sign/legal/terms.mdx:3,7,10-54` | Same, as a courtesy translation of V4 |
| `src/content/docs/sign/legal/electronic-vs-digital-signature.mdx:15-18` | Remove the "Pendiente de revisión jurídica" Aside (or retitle it neutrally, see the electronic-vs-digital table row 1) |
| `src/content/docs/en/sign/legal/electronic-vs-digital-signature.mdx:15-18` | Same ("Pending legal review") |
| `CLAUDE.md:52-53` | "Legal texts are mirrored verbatim from the product repo with their version header (`legalVersion`). The only allowed transform is rewriting in-app links (`/legal/terminos`, `/guias/...`) to docs routes. No `<Fact>` inside legal text. Do not improve legal wording here; change it at the source." |
| `README.md:82-83` | "Legal pages carry `legalVersion: "Versión N · YYYY-MM-DD"` and mirror the product's text verbatim." (drop "and the 'Pendiente...' banner until counsel approves the text") |
| `tests/unit/legal.test.ts:26` | Rename the test: "...carries the same legal version in both locales and the version header" |
| `tests/unit/legal.test.ts:38-47` | Add V4 sentences, e.g. "bb-sign envía avisos por correo a los administradores de la organización 30 y 7 días antes del vencimiento", "y para ningún otro fin.", "**3.1 Plazo fijo.**", "- Versión 4 (2026-10-20): publicación final; las cláusulas no cambian." Better: compare against a synced copy (C). |
| `tests/unit/legal.test.ts` (new test) | Guard: no file under `src/` or `src/content/docs/` contains "revisión jurídica" or "Pending legal review" |
| `tests/unit/legal.test.ts:9` | Add the new guide mirror slug(s) to `LEGAL_PAGES` if they get `legalVersion` |
| `src/config/content-schema.ts:9` | Comment only ("the header every legal text carries"), no change needed |
| `src/content/i18n/{en,es-CO}.json` | No banner strings (checked). No change. |
| `tests/e2e/*` | No assertion on the banner (smoke checks h1 and lang on `/sign/legal/terms/`, a11y runs it via `helpers.ts:30`). No visual snapshot of legal pages. No change. |
| `.claude/PRPs/plans/completed/*.md`, `.claude/PRPs/reports/*` | Historical. Leave as is. |

### C. Recommended mechanism fix (so this drift cannot recur)

1. Add `docs/legal/terminos-y-condiciones.md`, `docs/guias/certificado-propio.md` and `docs/guias/conservacion-y-restauracion.md` to `sync.extra` (`src/config/products.ts:81`) and `files` (`scripts/sync-product.mjs:36-39`), and re-sync from main after the bb-sign V4 PR merges.
2. Either render the synced Markdown directly in the MDX page (import with a rewrite of the 4 in-app links), or add a unit test that strips MDX and Markdown markup and asserts the Spanish page body equals the synced file paragraph by paragraph. Also assert `legalVersion` equals the synced file's header line.
3. Keep `own-certificate.mdx` as the adapted admin how-to, but add a verbatim mirror page per guide (below) and link it from the admin pages.

---

## New pages proposed

| Slug (es / en) | Content | Sources |
|---|---|---|
| `sign/admin/agreements` / `en/sign/admin/agreements` ("Acuerdos e identificación de la organización") | **Configuración → Acuerdos**: identity form (Razón social, NIT with check-digit validation, privacy email, https URL, address, phone; fallbacks), the signer-facing preview, effective authorization (Plataforma vs Organización, version, hash), versions table (Vigente/Retirada), publishing a version (Spanish first, English optional, Markdown subset, placeholders, permanent copy, applies only to envelopes sent afterwards), the identity-incomplete notice, who can read (`agreement:read`) and manage (`agreement:manage`, never an API key). **Production caveat**: acceptance at send is not active yet and the platform publishes no default text. | `settings.json:209-314`; `Settings.tsx:32-36,66-83`; `components/settings/*`; `PermissionCatalog.kt:59-90`; `bb-infra/apps/bb-sign/edge-api.yaml:62-68`; `bb-infra/docs/runbooks/agreements.md:3-8` |
| `sign/legal/retention-and-restore` / `en/...` ("Guía de conservación y restauración de documentos") | Verbatim mirror of `docs/guias/conservacion-y-restauracion.md` (V4, no banner), with links rewritten. The en page is a courtesy translation. Linked from terms 3.3, storage, retention. | guide `:1-81` |
| `sign/legal/own-certificate-guide` / `en/...` (optional; or make `admin/own-certificate` carry the guide verbatim as its first part) | Verbatim mirror of `docs/guias/certificado-propio.md` | guide `:1-63` |
| `sign/admin/sign-in-security` / `en/...` (optional; the alternative is a section in users-and-invitations plus getting-started/your-account) | Admin MFA: enrolment at invitation, OTP at every admin sign-in, reset flow, lost authenticator (ask Binary Bridges), password policy, brute-force waits | `UserController.kt:87-91,136`; `bb-infra/.../kc-init.sh:658-664,726-743`; `bb-infra/apps/platform/keycloak.yaml:73` |

Sidebar: add the new slugs to `src/config/products.ts` (admin group, and the legal group at 165-172).

Cross-scope facts to fix (used by these pages): `src/content/facts/sign.ts:253-254` (`chainEmbedded` 'leaf only' is now the full chain), `:278` (`restoreOnRequest: false` is now shipped), `:272` (Glacier at 90 is "current"; not live in prod), `:63-73` (agreement permissions), `:90-96` (6 never-permissions), `:187` (8 webhook events), `EMAILS` (`:292-303`, add certificate-expiring and document-restored).
