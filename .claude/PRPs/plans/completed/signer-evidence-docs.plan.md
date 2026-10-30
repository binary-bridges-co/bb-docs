# Plan: signers no longer get the evidence certificate; the new signature capture screen (bb-sign v0.37.1)

## Summary

bb-sign v0.37.1 (release tag `v0.37.1` = daa783ec; `main` e1519854 adds only the plan archive) went live in
production on 2026-10-29: bb-infrastructure `main` 38d2910 runs edge-api and notification-service `v0.37.1`
(`apps/bb-sign/edge-api.yaml:29`, `apps/bb-sign/notification-service.yaml:26`) and the frontend
`FrontendVersion v0.37.1` (commit 4a5333e). It carries two changes:

1. **bb-sign#310.** The evidence certificate is for organization members and API credentials only. Signers lose
   the download on the "done" screen, the two signer routes (`/api/v1/sign/{token}/evidence-certificate` and
   `/download`, now 404) and the certificate sentences in the completion email. Members keep the envelope-detail
   download and `/api/v1/envelopes/{id}/evidence-certificate[/download]`, with the same permission.
2. **bb-sign#311.** The signature capture step was redesigned: Draw / Type / Upload image tabs with icons, a white
   sheet that holds only the mark, controls and notices outside it, new labels (a "how it will be stamped"
   preview for typed and uploaded signatures, upload tips, a **Remove** button, a help line under the background
   switch) and sentence-case English labels.

bb-docs still tells signers, in about 20 places per locale, that they download "their copy" of the certificate
from their link, quotes three UI strings that no longer exist, documents the old email sentences, and carries the
two removed operations in its synced OpenAPI copy. This plan removes every signer-certificate claim in both
locales, updates the capture-screen description and labels, re-syncs the contract at `v0.37.1`, and re-checks the
fact citations into the files v0.37.1 changed.

## User story

As a signer reading the bb-sign guide, I want it to describe exactly what my signing page and my completion email
offer (my signed document, not a certificate), so that I do not look for a download that is not there. As an
organization admin or integrator, I want the evidence pages to say that only my organization's members and API
credentials receive the certificate, so that I know signers get nothing beyond their signed copy and I read old
audit trails correctly.

## Metadata

- Complexity: medium (wording across ~20 pages per locale, one sync, ~15 citation fixes, one fact test)
- Source: parent-session brief 2026-10-29 (bb-sign#310, #311, release v0.37.1)
- Product source read: bb-sign `origin/main` e1519854 (read with `git show origin/main:<path>`), tags `v0.37.0`
  (1ef08008) and `v0.37.1` (daa783ec); bb-infrastructure `origin/main` 38d2910
- Branch: `docs/signer-evidence-docs`; worktree `.claude/worktrees/signer-evidence-docs` from `origin/main` 5df9221
- Dependencies: none open. bb-docs#8, #9, #10 merged.

## Acceptance criteria

1. No page in either locale says or implies that a signer can download, receive or see the evidence certificate
   (or "their copy" of it), that the signing page shows a certificate state, or that the completion email
   mentions the certificate. Grep of `src/content/docs` and of `dist/` is clean (§Validation V4, V5).
2. The evidence-certificate concept page (es, en) states who downloads it (users and API credentials with the
   envelope's document download permission) and that signers do not receive it; the signer-copy section is gone.
3. `EVIDENCE_CERTIFICATE_ACCESSED` is described as a download by a user or an API credential, with one sentence
   explaining that a trail may also show a signer's download, because signers could download a copy up to
   version `EVIDENCE.signerDownloadsUntil` (rendered with `<Fact>`; no version typed in prose).
4. The signer guide describes the v0.37.1 capture screen with labels copied from bb-sign
   `frontend/src/i18n/locales/{es,en}/signing.json` on `main`; English labels in sentence case where bb-sign
   changed them ("Add your signature", "Submit signature").
5. `src/content/sync/sign/openapi.json` and `public/sync/sign/openapi.json` are re-synced with
   `npm run sync:sign` at `v0.37.1`; the manifest records ref `v0.37.1`, commit daa783ec; the API reference loses
   `getSignerEvidenceCertificate` and `downloadSignerEvidenceCertificate`; the legal pages regenerate unchanged.
6. Every fact whose source cites a file changed between v0.37.0 and v0.37.1 points at lines that say what the
   fact claims on bb-sign `main`; facts that only described the signer copy are removed or replaced; the facts
   test follows.
7. `npm run verify` green. Changed pages looked at in both themes and at 375 px.

## Out of scope

- The org-side envelope detail, its evidence block and its labels: `EnvelopeDetail.tsx` and `envelopes.json`
  are unchanged in v0.37.1 (`git diff --stat v0.37.0 v0.37.1`).
- The legal mirrors (`legal/terms.md`, `own-certificate-guide.md`, `retention-guide.md`) and their English
  twins: bb-sign `docs/legal/` and `docs/guias/` are unchanged in v0.37.1, and none of them says signers get the
  certificate (checked: the only certificate sentences are "no se archivan y se pueden descargar…" and the
  integration step `data.evidenceCertificate.downloadPath`).
- That the worker still builds a signer variant (`evidence-certificate-signer.pdf`): internal, never served, not
  documented (brief; bb-sign `docs/runbooks/evidence-certificate.md`).
- `EnvelopeFinalizedV1.signerCopySha256` on org webhooks: bb-docs does not document that field today (grep
  `signerCopySha256` in `src/` returns nothing), and bb-sign leaves its fate to a follow-up issue (R10 in the
  bb-sign report). Not added.
- The org webhook descriptions (`admin/webhooks`, `developers/webhooks`, `webhook-signature-spec`): they describe
  `envelope.completed` to the organization, which is unchanged.
- bb-sign itself, bb-infrastructure, images, deploys.

## Research findings

Shorthands: `EA` = `bb-sign/edge-api/src/main/kotlin/co/binarybridges/sign/edge`, `NS` =
`bb-sign/notification-service/src/main/kotlin/co/binarybridges/sign/notification`, `FE` =
`bb-sign/frontend/src/components/signing`, `es.json`/`en.json` = `bb-sign/frontend/src/i18n/locales/{es,en}/signing.json`.
All lines are bb-sign `origin/main` e1519854 unless a tag is named.

### #310: signers have no certificate

| # | Claim | Source |
|---|---|---|
| R1 | The certificate's audience is "callers with `document:download`"; signers receive their signed copy, not the certificate; the two signer paths that served a signer copy until v0.37.0 answer `404 NOT_FOUND` | `bb-sign/docs/api/evidence-certificate.md:8-15` |
| R2 | The use case has one audience; "Signers have no route to the certificate (#310): they receive their signed copy only" | `EA/application/usecase/GetEvidenceCertificateUseCase.kt:30-35` |
| R3 | `EvidenceVariant { ORGANIZATION }` only; the worker's signer copy is never read by edge-api | `EA/domain/evidence/EvidenceCertificate.kt:14-18` |
| R4 | Every download publishes one `EvidenceAccessedV1`, filed as `EVIDENCE_CERTIFICATE_ACCESSED`; channel `UI` for a user, `API` otherwise | `EA/application/usecase/GetEvidenceCertificateUseCase.kt:26-28,57-62,74-76`; `bb-sign/docs/api/evidence-certificate.md:74-76` |
| R5 | The signed-copy gate serves "the signed copy (#120) and its restore … Never the evidence certificate" | `EA/application/usecase/SignedCopyGate.kt:5-11` |
| R6 | At v0.37.0 a signer could download a certificate copy, recorded by the signer: `getSignerEvidenceCertificate` / `downloadSignerEvidenceCertificate` and `signerDownload` | `v0.37.0:EA/presentation/signer/SigningController.kt:333-360`; `v0.37.0:EA/application/usecase/GetEvidenceCertificateUseCase.kt:39-40,78-80`. Production ran it from v0.34.0 (2026-10-20) until v0.37.1 |
| R7 | The signer "done" screen no longer renders `SignerEvidenceDownload` (file deleted) and the three `done.evidence*` keys are gone in both locales | `git diff v0.37.0 v0.37.1 -- frontend/src/pages/SigningCeremony.tsx frontend/src/i18n/locales/*/signing.json`; `es.json:109-123`, `en.json:109-123` (the `done` block now ends at `deleted`) |
| R8 | The completion email's only status line is "Your signed documents are being prepared; they will appear at the same link." (when documents are still `PREPARING` at the degraded trigger); the button "Download your signed copy" links to `/sign/{token}` | `bb-sign/notification-service/src/main/resources/templates/email/envelope-completed.html:43-58`; `NS/application/service/CompletionEmails.kt:33-37,54,64-70`; `NS/infrastructure/messaging/listener/EnvelopeCompletionNoticeListener.kt:13-39` |
| R9 | The email still goes out on `envelope.finalized` or on the degraded trigger, so its timing is unchanged (first of the two; at most `EVIDENCE.degradedAfterHours` = 2 h) | `EnvelopeCompletionNoticeListener.kt:16-21,30-31`; `bb-sign/edge-api/src/main/resources/application.yml:192-193`; `bb-sign/docs/api/evidence-certificate.md:113-115` ("The completion email to each signer follows the same timing rule; it links to their signed copy and says nothing about the certificate") |
| R10 | The member download is unchanged: `document:download` (and `archive:read` once archived) | `EA/presentation/admin/EvidenceCertificateController.kt:37-45` (file unchanged in v0.37.1); `bb-sign/docs/api/evidence-certificate.md:51-53` |
| R11 | The published contract loses the two paths and the two `SignerEvidence*` schemas (`docs/api/openapi.json` −162 lines) | `git diff --stat v0.37.0 v0.37.1 -- docs/api/openapi.json` |
| R12 | The certificate header names the copy: "Copia de la organización" / "Organization copy" | `bb-sign/document-processing-worker/src/main/resources/evidence/messages_es.properties:5`, `messages_en.properties:5` |

### #311: the capture screen (labels from `es.json` / `en.json` `sign` block, lines 76-107)

| Key | es | en | Where |
|---|---|---|---|
| `title` | Añade tu firma | Add your signature (was "Add Your Signature") | step heading |
| `modeDraw` / `modeType` / `modeUpload` | Dibujar / Escribir / Subir imagen | Draw / Type / Upload image | tabs, `FE/SignModeTabs.tsx:20-46` |
| `drawLabel`, `drawHint`, `drawHelp` | Dibuja tu firma; Dibuja tu firma aquí; Firma sobre la línea con el dedo, un lápiz óptico o el mouse. | Draw your signature; Draw your signature here; Sign above the line with your finger, a stylus or the mouse. | `FE/DrawSignaturePanel.tsx:26-52` (Clear sits beside the label, above the sheet) |
| `clear` | Borrar | Clear | same |
| `typeLabel`, `stampPreview`, `typePreviewEmpty` | Escribe tu nombre completo; Así quedará estampada; Aquí aparecerá tu nombre | Type your full name; How it will be stamped; Your name will appear here | `FE/TypedSignaturePanel.tsx:20-48` (a labelled field, then the preview on the sheet) |
| `uploadTitle`, `uploadHint` | Sube una foto de tu firma; PNG o JPEG, de hasta 10 MB. | Upload a photo of your signature; PNG or JPEG, up to 10 MB. | `FE/SignatureUpload.tsx:133-156` (replaces "Una foto o un escaneo de tu firma sobre papel claro. PNG o JPEG, de hasta 10 MB.", which bb-docs quotes today) |
| `uploadTipPaper`, `uploadTipLight`, `uploadTipPrivacy` | Firma en una hoja blanca y lisa con un esfero de tinta oscura. / Toma la foto con luz pareja, sin sombras. / Tu foto se queda en este dispositivo; solo se envía la firma. | Sign on plain white paper with a dark pen. / Take the photo in even light, without shadows. / Your photo stays on this device; only the signature is sent. | `FE/SignatureUpload.tsx:28,215-224` (shown before an image is chosen) |
| `uploadChoose`, `uploadReplace`, `uploadRemove` | Elegir una imagen; Cambiar la imagen; Quitar | Choose an image; Replace image; Remove | `FE/SignatureUpload.tsx:143-205` |
| `uploadRemoveBackground`, `…Help` | Quitar el fondo claro; Hace transparente el papel que hay detrás de tu firma. | Remove light background; Makes the paper behind your signature transparent. | `FE/SignatureUpload.tsx:165-181` |
| `submit` | Enviar firma | Submit signature (was "Submit Signature") | `es.json:91`, `en.json:91` |

- After an image is chosen the page shows "Así quedará estampada" with the file name and size, the image on the
  sheet, the background switch, then **Cambiar la imagen** and **Quitar** (`FE/SignatureUpload.tsx:112-131,165-206`).
- The switch shows once an image is chosen, or after a first pick refused for no ink; it starts on
  (`FE/signatureUpload.ts:401-404,453-461`). Remove clears the upload back to the initial state
  (`FE/signatureUpload.ts:449-451`).
- Unchanged and still correct in bb-docs: the required-signature messages (`es.json:15-16,31`), the upload refusal
  messages, the resize notice text (`es.json:106`), `done.*` texts (`es.json:109-123`).

### bb-docs places that are now wrong (bb-docs `origin/main` 5df9221; each has its `en/` twin at the same path)

| Page | Lines (es) | What is wrong |
|---|---|---|
| `concepts/evidence-certificate.mdx` | 3, 33, 47-54, 64-71, 113-115, 125 | signer copy section and table row, signing-page "Preparando…" state, signer download paragraph, "copia del firmante" retention; description "quién lo descarga" stays true |
| `concepts/evidence-and-audit.mdx` | 33, 229 | access event "o un firmante descarga su copia"; "cada firmante descarga su propia copia" |
| `signing/sign-and-download.mdx` | 3, 12-50, 71-73, 93-102, 104-111, 115-118, 131-132 | description; capture screen; signer copy of certificate; done-screen certificate table; email certificate wording; availability; "nunca se archiva" |
| `signing/index.mdx` | 35-41 | step 5 labels (en: "Add Your Signature", "Submit Signature"); step 6 "Descargar tu certificado de evidencia" |
| `signing/receiving-the-email.mdx` | 29, 36-42, 68-71 | email row, completion email timing and the two removed sentences, link "y a su certificado" |
| `signing/troubleshooting.mdx` | 49 | "No se pudo descargar el certificado de evidencia" row; en: every "Submit Signature" |
| `signing/review-and-identity.mdx` | 35-36 | "compararla … con la que figura en su certificado de evidencia" |
| `index.mdx` (product landing) | 33-36 (en 34-38) | "que la organización y cada firmante pueden descargar" (round 2, finding 1) |
| `concepts/signature-and-seal.mdx` | 20 | en "Add Your Signature" |
| `sending/download-signed-documents.mdx` | 72-75 | "Los firmantes descargan … su propia copia del certificado" |
| `sending/archived-envelopes.mdx` | 74-76 | "y a su certificado de evidencia" on the signer link |
| `getting-started/first-envelope.mdx` | 100-102 | "descarga su copia firmada y su certificado de evidencia" |
| `developers/index.mdx` | 45 | signing ceremony "y el certificado del firmante" |
| `developers/migrating-from-adobe.mdx` | 30 | "una copia para la organización y otra para cada firmante" |
| `legal/electronic-vs-digital-signature.mdx` | 83-85 | same two-copies claim |
| `legal/retention.mdx` | 26-27 | "que la organización y cada firmante pueden descargar" |
| `reference/glossary.mdx` | 79-81 | "una copia de la organización y una copia del firmante" |
| `reference/emails.mdx` | 84-86 | completion email "indica si está listo o si se está preparando" |

Grep used: `git grep -nIiE 'evidence|evidencia|certificad' -- src` plus targeted phrases (`su certificado de
evidencia`, `copia del firmante`, `signer copy`, `their own copy`, `certificado del firmante`, `Add Your Signature`,
`Submit Signature`, `Una foto o un escaneo`). `review-and-identity:75` ("aparece en el certificado de evidencia del
sobre") and `verify-a-document:39` ("figura en el certificado de evidencia del sobre") name the envelope's
certificate, not a signer download: kept.

### Fact citations into files v0.37.1 changed (`git diff --name-only v0.37.0 v0.37.1`)

Checked by printing each cited range at `v0.37.0` and at `main`:

| Fact | Old source | On main | Action |
|---|---|---|---|
| `OTP.verifiedValidityMinutes` | `SigningCeremony.tsx:481-482,435-448` | moved to `:465-466,419-432` | re-point |
| `SIGNATURE_UPLOAD.maxSourceMb` | `es.json:26,86` | `:86` is now `clear`; hint at `:94` | `:26,94` |
| `SIGNATURE_UPLOAD.resizeNoticeMb` | `SignatureUpload.tsx:129-131`; `es.json:92` | `:209-211`; `:106` | re-point |
| `SIGNATURE_UPLOAD.formats` | `SignatureUpload.tsx:71` | `:104` | re-point |
| `SIGNATURE_UPLOAD.removeBackgroundDefault` | `SignatureUpload.tsx:104-113` | switch `:165-181`; `signatureUpload.ts:401-404` unchanged | re-point, add `:453-461` (when it shows) |
| `SIGNATURE_UPLOAD.processedOnDevice` | `SignatureUpload.tsx:24-27` | `:31-33` | re-point |
| `SIGNATURE_UPLOAD.cameraOrGallery` | `SignatureUpload.tsx:29,68-77` | `:39,101-110` | re-point |
| `SIGNATURE_UPLOAD` lines in `signatureUpload.ts` (`:5-15,100-104,170,180-183,401-404`) | unchanged (additions after 404 only) | – | keep |
| `ARCHIVED_ENVELOPES.signerLinkKeepsCopy` | doc comment says "and the signer evidence certificate"; `SignedCopyGate.kt:5-11` | lines hold, content now "never the evidence certificate" | fix the comment only |
| `EVIDENCE.statuses` | `EvidenceCertificate.kt:12` | unchanged | keep |
| `EVIDENCE.variants` `['ORGANIZATION','SIGNER']` | `EvidenceCertificate.kt:15`; `evidence-certificate.md:3-33` | `['ORGANIZATION']` at `:14-18`; doc `:8-15`. Used by no page | remove (replaced by `signersReceiveCertificate`) |
| `EVIDENCE.signerCopyMasked` | `SignerEvidenceDownload.tsx:12-16` (deleted) | – | remove |
| `EVIDENCE.signerCopyIncludesAuditTrail` | `evidence-certificate.md:90` (now the `curl` example) | – | remove; its two page uses go with the signer copy text |
| `EVIDENCE.usuallyIssuedWithinMinutes` | `evidence-certificate.md:30`; `es.json:110` (deleted key) | doc `:32` | `evidence-certificate.md:32` only |
| `EVIDENCE.downloadLinkSeconds` / `downloadLinkMinutes` / `downloadAudited` | `GetEvidenceCertificateUseCase.kt:29` | `:26-27` | re-point |
| `EVIDENCE.reissueWindowDays` | `evidence-certificate.md:122,129-130` | `:117-119` | re-point |
| `VERIFY.qrReadsPdf` | `reference.md:712` | `:662` | re-point |
| `RETENTION_IMPLEMENTED`-area fact at `sign.ts:641` | `SigningController.kt:300-313` (restoreSignedCopy) | `:277-290` | re-point |
| `ERROR_CODES` SIGNATURE_IMAGE_INVALID / _TOO_LARGE / SIGNATURE_METHOD_INVALID (`sign-integrations.ts:95-97`) | `SigningController.kt:584-594`, `:596-602` | `:519-529`, `:531-537` | re-point |
| `SIGN_CALL.maxPngMib` / `maxBodyMib` (`sign-integrations.ts:112,114`) | `SigningController.kt:586`, `:590` | `:521`, `:525` | re-point |
| `EMAILS` envelope-completed row | `CompletionEmails.kt:34-37,64`; listener `:14-21` | same lines, new content (no certificate) | keep lines, add the template `:43-58` |

New facts (both read the same in both locales):
- `EVIDENCE.signersReceiveCertificate: false` — R1, R2, R5.
- `EVIDENCE.signerDownloadsUntil: 'v0.37.0'` — the last release in which a signer could download a copy (R6;
  `evidence-certificate.md:14-15` "until v0.37.0").

## Decisions

- **D1. Say it once, plainly, where it matters.** Signer pages say what the signer gets ("su documento
  firmado") and stop; they do not explain the certificate. The certificate page and the evidence page say signers
  do not receive it. No "ask the organization for it" sentence: the owner's rule is that the certificate is for
  members, and offering a path to signers is a product decision bb-docs must not make.
- **D2. One historical sentence, on the evidence page.** Trails can hold `EVIDENCE_CERTIFICATE_ACCESSED` rows by a
  signer from the days production ran v0.34.0–v0.37.0. The `EVIDENCE_CERTIFICATE_ACCESSED` row on
  `concepts/evidence-and-audit` says so, worded around the fact: "…hasta la versión
  <Fact of={EVIDENCE.signerDownloadsUntil} />, también un firmante podía descargar una copia" / "…up to version
  <Fact …/>, a signer could also download a copy". Nowhere else, no version typed in prose.
- **D3. Email timing stays, the certificate wording goes.** The signer pages say the completion email normally
  arrives a few minutes after the last signature and never waits more than `degradedAfterHours`, and quote the one
  remaining status sentence. The org-facing pages (`evidence-certificate`, `reference/emails`) keep saying it
  waits for the certificate, because that is the trigger (R9), and add that it says nothing about it.
- **D4. Capture screen: describe, do not inventory.** Name the three tabs, the field or sheet each one shows, the
  "Así quedará estampada" preview, the upload panel title and hint, the tips in one line, the switch and its
  help, **Cambiar la imagen** and **Quitar**. Quote only strings that exist on `main`; numbers inside them stay facts
  (`uploadHint` renders `<Fact of={SIGNATURE_UPLOAD.maxSourceMb} unit="MB" />`, as the content test's denylist requires).
- **D5. Sync at the release tag**, as bb-docs#8 did for v0.37.0: `PRODUCT_REPO_TOKEN=$(gh auth token) npm run
  sync:sign -- v0.37.1`. The synced files are identical at `v0.37.1` and `main` (`git diff --stat v0.37.1
  origin/main` touches only `.claude/PRPs`). Fallback if the clone cannot authenticate: `git clone --branch v0.37.1
  /Users/edward.montoya/code/binarybridges/bb-sign <scratch dir>`, then `--from <scratch dir>` (records
  `local:<folder>`), then delete the clone. bb-sign itself is never written to.

## Tasks

T1. **Sync.** Run D5. Expect `git status` to show only `src/content/sync/sign/openapi.json`,
    `public/sync/sign/openapi.json` and `src/content/sync/sign/sign.json`; legal pages unchanged. Confirm with
    `jq '.paths | keys[]'` that no path contains `evidence` under `/api/v1/sign/`, and that `SignerEvidence*`
    schemas are gone.

T2. **Facts** — `src/content/facts/sign.ts`, `src/content/facts/sign-integrations.ts`: every row of the citation
    table; remove `variants`, `signerCopyMasked`, `signerCopyIncludesAuditTrail`; add `signersReceiveCertificate`
    and `signerDownloadsUntil`; fix the `EVIDENCE` and `signerLinkKeepsCopy` doc comments; add a re-verification
    line to the header comment (v0.37.1, daa783ec).

T3. **Fact test** — `tests/unit/facts.test.ts:272-277`: replace the `signerCopyIncludesAuditTrail` assertion with
    `signersReceiveCertificate === false` and `signerDownloadsUntil` matching `/^v\d+\.\d+\.\d+$/`.

T4. **Certificate and evidence concepts** — `src/content/docs/{,en/}sign/concepts/evidence-certificate.mdx`:
    header row ends with the copy label "Copia de la organización" (R12); replace "Copia de la organización y copia
    del firmante" with "Quién lo descarga" (users and API credentials that can download the envelope's documents,
    Auditor or higher; signers do not receive it, they download their signed document); drop the signing-page
    state from "Cuándo se emite"; email paragraph per D3; delete "Desde el enlace del firmante"; retention
    "el certificado y el registro de auditoría". `.../concepts/evidence-and-audit.mdx`: line 33 per D2; line 229
    without the signer copy.

T5. **Signer guide** — `src/content/docs/{,en/}sign/signing/`:
    - `sign-and-download.mdx`: description; capture section per D4 and the label table; "Información que queda
      registrada" ends at the seal sentence (no signer copy); "Pantalla de confirmación" loses the certificate
      table and the pre-certificate sentence; "Correo de finalización" per D3; "Disponibilidad" names the signed
      copy only; delete the "nunca se archiva" paragraph; remove the now-unused `EVIDENCE` import if no `Fact`
      still needs it (it does: `degradedAfterHours`).
    - `index.mdx`: step 5 labels (en case), step 6 only "Descargar tu documento firmado".
    - `receiving-the-email.mdx`: table row, "El correo de finalización" per D3, the link paragraph.
    - `troubleshooting.mdx`: delete the certificate row; en "Submit signature".
    - `review-and-identity.mdx`: drop the sentence "Puede compararla después con la que figura en su certificado
      de evidencia." / "You can compare it later with the one in your evidence certificate." (D1; review finding 5).
    - en `concepts/signature-and-seal.mdx:20`: "Add your signature".

T6. **Sender, developer, legal and reference pages** (`src/content/docs/{,en/}sign/…`):
    `sending/download-signed-documents.mdx` (signers download their signed copy only; the certificate is the
    organization's), `sending/archived-envelopes.mdx`, `getting-started/first-envelope.mdx`,
    `developers/index.mdx`, `developers/migrating-from-adobe.mdx`, `legal/electronic-vs-digital-signature.mdx`,
    `legal/retention.mdx`, `reference/glossary.mdx`, `reference/emails.mdx`, and the product landing `index.mdx`
    ("que la organización descarga" / "that the organization downloads"). One sentence each, same meaning in
    both locales.

T7. **Sweep and verify** (§Validation). `tests/e2e/visual.spec.ts:9-14` screenshots `/`, `/sign/`, `/sign/signing/`
    and `/sign/api/operations/createenvelope/`. Expected updates: `sign-*` (landing text), `signing-*` (steps 5 and 6),
    and `api-*` only if the sidebar loses the two signer operations visibly. Update only those, after looking at each
    diff image; `hub-*` must not change.

T8. **Report** — `.claude/PRPs/reports/signer-evidence-docs-report.md`.

## Validation

```bash
cd /Users/edward.montoya/code/binarybridges/bb-docs/.claude/worktrees/signer-evidence-docs
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22

# V1 (AC5) sync result
git status --short src/content/sync public/sync src/content/docs/sign/legal
jq -r '.ref, .commit' src/content/sync/sign/sign.json                     # v0.37.1, daa783ec…
jq -r '.paths | keys[] | select(test("^/api/v1/sign/.*evidence"))' src/content/sync/sign/openapi.json   # empty
jq -r '.components.schemas | keys[] | select(test("SignerEvidence"))' src/content/sync/sign/openapi.json # empty
cmp src/content/sync/sign/openapi.json public/sync/sign/openapi.json

# V2 (AC6) citations: each re-pointed range printed from bb-sign main shows the claimed text
git -C ../../../../bb-sign show origin/main:frontend/src/components/signing/SignatureUpload.tsx | sed -n '101,110p;165,181p;209,211p'

# V3 (AC7)
npm run verify

# V4 (AC1) source sweep, paragraph-joined so wrapped sentences match. Expect no output.
#   Dry run on the unchanged tree (round 2): hits on exactly the pages in the research table, both locales, and
#   nothing else. "desde el enlace del firmante" alone is NOT a pattern: storage, legal/retention, glossary and
#   retention-and-restore use it for the signed copy, which stays true.
#   The three generated legal mirrors and their twins are excluded (verbatim; checked clean in research).
PAT='cada firmante pueden descargar|each signer can download|copia para la organización y otra para cada firmante|one copy for the organization and one for each signer|copia de la organización y una copia del firmante|organization copy and a signer copy|copia de la organización y copia del firmante|Organization copy and signer copy|certificado del firmante|signer\S{1,6}s certificate|propia copia del certificado|own copy of the evidence certificate|su copia del certificado|their copy of the certificate|Preparando tu certificado|Preparing your evidence certificate|Descargar tu certificado|Download Your Evidence Certificate|No se pudo descargar el certificado|Could not download the evidence certificate|Your evidence certificate is|y a su certificado de evidencia|and your evidence certificate|and their evidence certificate|\bo un firmante descarga su copia|or a signer downloads their copy|cada firmante descarga su propia copia|each signer downloads their own copy|Desde el enlace del firmante\.\*\*|From the signer\S{1,6}s link\.\*\*|la copia del firmante y el registro|the signer copy and the audit|copia firmada y su certificado de evidencia|con la que figura en su certificado|compare it later with the one in your evidence certificate|indica si está listo o si se está preparando|says whether it is ready or|indica que se está preparando|says it is being prepared|copia del certificado que usted descarga|copy of the certificate you download|no ofrece certificado|offers no certificate'
git ls-files 'src/content/docs/*.md' 'src/content/docs/*.mdx' \
  | grep -vE 'legal/(terms|own-certificate-guide|retention-guide)\.' \
  | xargs perl -0777 -ne 'BEGIN{$p=shift} s/\s+/ /g; while(/(.{0,40}(?:$p).{0,40})/gi){print "$ARGV: $1\n"}' "$PAT"
# V4c (AC4) old capture-screen labels, CASE-SENSITIVE (V4 is /i, so it would flag the new sentence case)
git ls-files 'src/content/docs/*.md' 'src/content/docs/*.mdx' | xargs perl -0777 -ne 's/\s+/ /g; while(/(.{0,40}(?:Add Your Signature|Submit Signature|Una foto o un escaneo de tu firma sobre papel claro|A photo or scan of your signature on light paper).{0,40})/g){print "$ARGV: $1\n"}'
# V4b signer pages only: no "su/your certificate" at all
git ls-files 'src/content/docs/sign/signing/*' 'src/content/docs/en/sign/signing/*' \
  | xargs perl -0777 -ne 's/\s+/ /g; while(/(.{0,40}(?:su certificado de evidencia|your evidence certificate|y a su certificado|and your certificate).{0,40})/gi){print "$ARGV: $1\n"}'

# V5 (AC1) build output sweep on dist/ from V3: tags stripped, same patterns, same three mirrors excluded.
find dist -name '*.html' | grep -vE '/legal/(terms|own-certificate-guide|retention-guide)/' \
  | xargs perl -0777 -ne 'BEGIN{$p=shift} s/<[^>]+>/ /g; s/&#39;|&#x27;|&rsquo;/\x27/g; s/\s+/ /g; while(/(.{0,40}(?:$p).{0,40})/gi){print "$ARGV: $1\n"}' "$PAT"
ls dist/sign/api/operations | grep -iE 'signerevidence' || echo 'no signer evidence operation pages'
```

Then look at `/sign/signing/sign-and-download/`, `/sign/concepts/evidence-certificate/` and their `en` twins in
both themes and at 375 px (`npm run preview`).

## Risks and rollback

- **Over-correcting**: deleting true statements about the envelope's certificate on pages where a signer is only
  mentioned. Mitigated by keeping "certificado de evidencia del sobre" wording (review-and-identity:75,
  verify-a-document:39) and by the reviewer reading each hit.
- **Visual baselines**: text reflow on signer pages fails `visual.spec`; baselines are macOS-only and updated
  per changed page after inspection, never wholesale.
- **The sync could pull more than #310**: it cannot; `docs/api/openapi.json` changed only by the −162 lines of
  #310 between the tags, and legal texts did not change.
- **Rollback**: revert the PR. Nothing is deployed by this branch; the parent session merges and deploys.

## Revision log

**Round 2 (after review round 1, REJECTED for one HIGH):**

1. (HIGH) Added the product landing `index.mdx` (es 33-36, en 34-38) to the research table and T6.
2. (MEDIUM) V4 and V5 rewritten: paragraph-joined (perl `-0777`, whitespace collapsed), patterns limited to
   phrases that are false after v0.37.1 (no bare "copia del firmante" / "su certificado de evidencia" /
   "desde el enlace del firmante"), V4b for "su/your certificate" on the signer pages only, and V5 excludes only
   the three generated mirrors and their twins. Dry run on the unchanged tree hits exactly the 35 pages of the
   table (both locales; `signature-and-seal` is en only) and nothing else.
3. (LOW) T7 names the expected baselines: `sign-*`, `signing-*`, `api-*` if the sidebar change shows; `hub-*` must not.
4. (LOW) R3 and the `variants` row cite `EvidenceCertificate.kt:14-18`.
5. (LOW) `review-and-identity`: the "compare it later" sentence is dropped in both locales.
6. (LOW) D5 fallback clones the tag into a scratch folder; bb-sign is never written to.
7. (LOW) D2 and AC3 are worded around `EVIDENCE.signerDownloadsUntil`; D4 keeps the 10 MB in `uploadHint` as a fact.

**After round 2 (APPROVED, LOW 1 applied):** V4 gains four patterns and V4b two, from review round 2 finding 1.
**During implementation:** the four capture-label patterns moved from V4 (case-insensitive, which matched the corrected
"Add your signature" / "Submit signature") to a case-sensitive V4c. Same patterns, no other change.
V5 matched "códig*o Un firmante descarga su copia* firmada" (the correct `SIGNED_COPY_ACCESSED` row): that pattern is anchored with `\b`.
