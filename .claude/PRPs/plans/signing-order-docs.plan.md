# Plan: signing order by drag and drop (bb-sign v0.38.0)

## Summary

bb-sign v0.38.0 (tag `v0.38.0` = merge commit `4c39ee7c`, PR #314) ships bb-sign#293 with #128 and #129:

- The wizard's **Signers** step no longer has a typed **Order** field. In sequential mode each signer is a card with a
  drag handle, a position number, Move up / Move down and Remove; the order sent is the card order, 1..N. In parallel
  mode the cards have no positions or reorder controls and a note says everyone is invited at once.
- The **Review** step and the **envelope detail** page show the same list read-only. Positions appear only on
  sequential envelopes; equal `signOrder` values created through the API show as consecutive steps (1, 1, 2).
- The API refuses `signOrder` below 1 with `400 VALIDATION_FAILED` on create-envelope and on add-signer, in both
  modes. Equal values still sign as a group.

bb-docs still describes a typed **Order** field, "Order #N" on every envelope and "the order numbers below are not
enforced" on parallel envelopes. This plan rewrites those passages in both locales, adds the `signOrder` rule to the
developer pages and the errors page, re-points citations that drifted, adds facts for every new claim, and re-syncs
the OpenAPI copy at `v0.38.0`.

## User story

As a sender reading the bb-sign docs, I want the Signers step, the review and the envelope page described as they
are in v0.38.0, so that I can set the signing order by moving cards instead of looking for a number field that no
longer exists. As an integrator, I want to know that `signOrder` must be 1 or greater and that equal values form a
group, so that my requests are not refused.

## Metadata

| | |
|---|---|
| Complexity | Medium (about 25 content files, 2 fact modules, 1 test, sync output) |
| Source | bb-sign v0.38.0 (`4c39ee7c`), PR #314; issues #293, #128, #129; bb-sign plan/report `.claude/PRPs/{plans,reports}/signing-order-drag-drop*` at that commit |
| Dependencies | bb-docs `main` 0caa45b (PR #11, v0.37.1 docs). Release `v0.38.0` exists (published 2026-10-30T02:04Z, target `4c39ee7c`) |
| Branch | `docs/signing-order-docs`, worktree `.claude/worktrees/signing-order-docs` |
| Out of scope | Merging, deploying, images, bb-infrastructure, filing issues; the placement (drag box) docs; anything not changed by v0.38.0 except the wizard step order noted in R10 |

## Acceptance criteria

1. No page in either locale describes a typed **Order** / **Orden** field, an "Order #N" / "Orden n.º" label, or says
   that parallel envelopes show order numbers that "are not enforced".
2. `sending/signers-and-order` (ES/EN) describes: cards; in sequential mode the handle, position number, Move up /
   Move down, Remove; mouse, touch and keyboard reordering (Space or Enter to pick up, arrows, Space or Enter to drop,
   Escape to cancel); moves announced to screen readers; order sent = card order; in parallel mode no positions or
   reorder controls and the note; switching modes keeps the list order; the drag fallback message. Every on-screen
   string is quoted exactly from bb-sign's `create.json` / `envelopes.json` for that locale.
3. Review step and envelope detail are described: the same list, read-only, positions only when sequential; the new
   parallel hint string; API ties show as consecutive steps.
4. Developer pages (walkthrough, migrating-from-adobe, errors, glossary) state: `signOrder` is 1-based, must be
   <Fact> 1 or greater, defaults to 1, equal values sign as a group, below 1 refused with `400 VALIDATION_FAILED`
   (create names `signers[i].signOrder`; add-signer says `signOrder must be 1 or greater`), in both modes.
5. Every new claim has a fact with a real `file:line` at `v0.38.0`; every existing citation into a file changed
   between `v0.37.1` and `v0.38.0` is re-read and corrected.
6. `src/content/sync/sign/` is re-synced at `v0.38.0` with the repo's script; the manifest records that tag's commit.
7. `npm run verify` passes; the built site greps clean for the leftover phrases in AC1.

## Research findings (bb-sign at `v0.38.0` = `4c39ee7c`)

Shorthands as in `sign.ts`: `EA` = `bb-sign/edge-api/src/main/kotlin/co/binarybridges/sign/edge`, `FE` =
`bb-sign/frontend/src`.

### R1. The Signers step (wizard)

- `FE/pages/CreateEnvelope.tsx:844-848`: sequential shows `create:step3.orderHint`, parallel shows
  `create:step3.parallelNote`. `:852-859` renders `SignerCardList`; there is no order input (comment at `:849-851`).
- `FE/components/signers/SignerCard.tsx:50-52`: sequential card = handle, position, Move up / Move down, Remove, then
  Email and Name; parallel = fields and Remove. `:85` reorder controls only when `sequential && count > 1`; `:90`
  Remove only when `count > 1`; `:128` position badge in every sequential card; `:138,150` Move up disabled on the
  first card, Move down on the last. The Remove label is `removeLabel` ("Quitar a {{name}}" / "Remove {{name}}").
- `FE/components/signers/SignerCardList.tsx:121` a card without a name is called `unnamed` ("Firmante N" / "Signer N")
  in the labels; `:145-150` Move up / Move down announce `step3.moved` in a polite live region (`:195`); `:192-194`
  shows `dragUnavailable` when the drag code fails to load (Move up / Move down keep working, `:79-80`).
- `FE/components/signers/sortableAdapter.tsx:52,57-59`: one `PointerSensor` (mouse and touch, 4 px distance) and a
  `KeyboardSensor`; `:69-84` announcements and the `dnd.instructions` screen-reader text.
- `FE/components/signers/signingOrder.ts:47-56` `toSignerRequest`: rows with email and name, in list order,
  `signOrder: i + 1` in BOTH modes; `:39-43` a typed value from an old draft is ignored; tied groups are API-only.
  `:77-86` restoring a sequential draft sorts by the stored value once. Switching modes does not reorder the list
  (`sequentialSigning` is a separate state; `restoreSignerOrder` keeps row order for parallel).
- Strings, `FE/i18n/locales/es/create.json` and `en/create.json` (same line numbers in both): `:45` heading
  "Añadir firmantes" / "Add Signers", `:50` addAnother, `:52` orderHint, `:53` parallelNote, `:54` positionLabel,
  `:56` handleLabel, `:57` moveUpLabel, `:58` moveDownLabel, `:59` removeLabel, `:60` moved, `:61` dragUnavailable,
  `:64` dnd.instructions, `:77` step4.signersList. ES (exact):
  - orderHint: "Los firmantes firman en este orden. Arrastra un firmante con el control para arrastrar, o usa Subir y Bajar."
  - parallelNote: "Todos reciben la invitación a la vez y pueden firmar en cualquier orden."
  - dnd.instructions: "Para tomar un firmante, pulsa Espacio o Enter. Muévelo con las flechas, suéltalo con Espacio o Enter, o pulsa Escape para cancelar."
  - dragUnavailable: "No se pudo cargar arrastrar y soltar. Usa Subir y Bajar."
  - EN: "Signers sign in this order. Drag a signer by the handle, or use Move up and Move down." / "Everyone is
    invited at once and can sign in any order." / "To pick up a signer, press Space or Enter. Use the arrow keys to
    move it, Space or Enter to drop it, or Escape to cancel." / "Drag and drop could not load. Use Move up and Move down."
- The Move up / Move down / Remove / handle buttons are icon-only; their accessible names are the `*Label` strings.
  Pages call them **Subir** / **Bajar** / **Quitar** (ES) and **Move up** / **Move down** / **Remove** (EN), the
  words the hint itself uses, and give the full accessible name once.

### R2. Review step

- `FE/pages/CreateEnvelope.tsx:936-948`: the summary shows "Firmantes ({{count}})" / "Signers ({{count}})"
  (`create.json:77`) and a `SignerOrderList` of the signers sent (`positions="index"`), or, once the envelope was
  created and not sent, the server's list (`positions="rank"`). Previously only a count ("Firmantes:" N).
- `FE/components/signers/SignerOrderList.tsx:15-16,67`: the position badge is rendered only when `sequential`;
  `:51` a parallel list is a `ul`. `FE/components/signers/SignerIdentity.tsx:50-64`: the badge is the number; the
  words "Posición N de M" are screen-reader only.

### R3. Envelope detail

- `FE/pages/EnvelopeDetail.tsx:356-366` mode line (unchanged keys); `:379-388` `SignerOrderList` with
  `sequential={envelope.sequentialSigning}`, `positions="rank"`, `positionLabelKey="envelopes:detail.signers.position"`.
  The old `Order #{{order}}` text is gone (`envelopes.json:124` is now `position`).
- `FE/i18n/locales/es/envelopes.json:128` modeParallelHint: "Todos recibieron el correo a la vez y pueden firmar en
  cualquier orden." (EN `:128`: "Everyone was emailed at once and can sign in any order."). `:127` sequential hint
  unchanged.
- `FE/components/signers/signingOrder.ts:88-96` `signingSteps`: dense rank, `[1, 1, 3]` -> `[1, 1, 2]`;
  `SignerOrderList.tsx:48-50` the "of M" count is the number of steps.
- The API order is `signOrder` then name: `EA/infrastructure/persistence/repository/SignerJpaRepository.kt:30`.

### R4. API rule (#128)

- `EA/application/usecase/CreateEnvelopeUseCase.kt:167-173`: `require(signer.signOrder >= 1) { "signers[$i].signOrder must be 1 or greater" }` for every signer, regardless of `sequentialSigning`.
- `EA/application/usecase/AddSignerUseCase.kt:32`: `require(cmd.signOrder >= 1) { "signOrder must be 1 or greater" }`
  after the DRAFT check (`:30`, 409 otherwise) and before the placements check (`:35-37`) and quota (`:38`). Note: the
  add-signer message does **not** name `signers[i]` (the brief said both did); pages quote each message as it is.
- `bb-sign/platform/starters/starter-web-errors/src/main/kotlin/co/binarybridges/sign/platform/weberrors/GlobalExceptionHandler.kt:52-54`:
  `IllegalArgumentException` -> 400 `VALIDATION_FAILED` with the message; `ErrorCodes.kt:12`.
- `EA/presentation/admin/EnvelopeController.kt:169,179` `@field:Schema` on both `signOrder` fields (text below);
  `:172,182` `signOrderOrDefault = signOrder ?: 1`.
- Contract: `docs/api/openapi.json` gains the description on `AddSignerRequest.signOrder` and
  `CreateSignerSpec.signOrder`: "1-based position in the signing order. Signers with equal values sign as a group, in
  any order within it; the next group starts when the whole group has signed. Must be 1 or greater. Defaults to 1. Only
  enforced as an order when sequentialSigning is true." `docs/api/reference.md:739,821`; `migrating-from-adobe.md:121`;
  `sdk-js/CHANGELOG.md` and `sdk-java/CHANGELOG.md` "Changed (HTTP API)".
- Groups: `EA/application/usecase/SendEnvelopeUseCase.kt:55-56` (lowest `signOrder` notified at send);
  `EA/application/usecase/RecordSignatureUseCase.kt:196-204` (next group when the whole current group has signed).
- E2E proof: `e2e/playwright/tests/34-api-sequential-signing.spec.ts:152-208` (`@ci`: sequential and parallel refuse 0,
  create names `signers[1].signOrder`, add-signer refused, omitted = 1) and `:211-260` (tie signs as a group).

### R5. Citation drift (`git diff --stat v0.37.1 4c39ee7c`)

Every bb-docs citation into a changed file, re-read at both refs:

| Fact (sign.ts) | Cites | v0.37.1 -> v0.38.0 |
|---|---|---|
| `PERMISSION_SCOPE...` (:195), `RETENTION...` (:652) | `EnvelopeController.kt:673-687` | moved to `:675-689` (two `@field:Schema` lines inserted at 169, 179) |
| `:195` | `EnvelopeController.kt:369` | moved to `:371` |
| `DOCUMENTS.signedSha256OnEnvelopePage` (:382) | `EnvelopeController.kt:291-304` | moved to `:293-306` |
| `ENVELOPE.linkTtlHoursDefault` (:246) | `EnvelopeController.kt:134` | unchanged (before the insertions) |
| `ARCHIVED_ENVELOPES.readOnlyWithDownloads` (:268) | `EnvelopeDetail.tsx:171,176-180` | moved to `:172,177-181` (one import inserted at 24) |
| `ARCHIVED_ENVELOPES.noActions` (:276) | `EnvelopeDetail.tsx:77-80` | moved to `:78-81` |
| `QUOTA.httpStatusWhenExhausted` (:402) | `CreateEnvelopeUseCase.kt:62-67` | unchanged (insertions at 167+) |
| `VERIFY.qrReadsPdf` (:437) | `reference.md:662` | unchanged (edits at 739, 821 replace lines 1:1) |
| several (:195, :260, :268, :546, :557, :588, :663, :687) | `es/en envelopes.json` lines 52-140 | unchanged (the hunk at 121-131 replaces 4 lines with 4) |
| SDK facts | `sdk-js/package.json`, `sdk-js/src/index.ts`, `sdk-java/CHANGELOG.md` (no line) | not changed by this release (only `frontend/package.json` and `sdk-js/src/generated/models/index.ts` changed) |

No bb-docs citation points into `CreateEnvelope.tsx`, `create.json`, `AddSignerUseCase.kt` or the new components.

### R6. bb-docs pages that state the old behaviour (grep at 0caa45b)

ES path / EN path under `src/content/docs/{,en/}sign/`:

- `sending/signers-and-order.mdx` — rows, **Orden** field, "Quitar firmante" icon, parallel hint "Los números de orden
  de abajo no se aplican", "los números solo reflejan el orden en que se ingresaron las filas", table row "Campo
  Orden", same number = turn. Main rewrite.
- `sending/create-an-envelope.mdx:75-76` (EN :74-75) "el paso Firmantes muestra el campo Orden".
- `getting-started/first-envelope.mdx:46-48` (EN :44-47) "verá también el campo Orden"; `:50-52` review lists
  "firmantes" as a count item.
- `concepts/envelopes-and-signers.mdx:43` (EN :40) "su **Orden n.º**"; `:53` (EN :50) "El número de orden es
  informativo"; `:56-58` (EN :53-55) same number = group (now API-only).
- `sending/send-and-track.mdx:65` (EN :64) "**Orden n.º N**".
- `reference/glossary.mdx:32-33` (EN :33-34) sign order entry.
- `sending/documents.mdx:82` (EN :83) and `concepts/documents.mdx:61` (EN :61): `{{signerN}}`, "N es el número de orden
  del firmante". Still true (N = `signOrder`, `W/.../StampSignedPdfUseCase.kt:425`), but in the wizard there is no
  number to look at: add "su posición en la lista de firmantes".
- `developers/envelope-walkthrough.mdx:170-172` (EN :168-169) `signOrder` paragraph; add the rule.
- `developers/migrating-from-adobe.mdx:119` (EN :116) "Orden de firma" bullet; add the rule (mirrors
  `migrating-from-adobe.md:121`).
- `developers/errors.mdx`: `VALIDATION_FAILED` is not in `ERROR_CODES` and not described; the 400 row says
  "errores de validación" generically.

### R7. OpenAPI copy

`scripts/sync-product.mjs` copies `docs/api/openapi.json`, the webhook vectors and the three legal texts into
`src/content/sync/sign/` and writes `sign.json` with commit and SHA-256 per file. Expected diff: the two `signOrder`
descriptions in `openapi.json` and the manifest. The legal texts did not change between v0.37.1 and v0.38.0.

### R8. Screenshot baselines

`tests/e2e/visual.spec.ts:9-14` covers `/`, `/sign/`, `/sign/signing/` and
`/sign/api/operations/createenvelope/` (full page). None of the content pages here is snapshotted; the API page may
change if starlight-openapi renders the nested `CreateSignerSpec.signOrder` description. If it changes, refresh only
those baselines and look at the diff.

### R9. Facts tests

`tests/unit/facts.test.ts:47-66` walks a fixed list of groups; a new group must be added there. `:205-214` requires
error code statuses in `[400, 408, 409, 410, 413, 429, 503]` (400 is allowed). The errors page renders
`ERROR_CODES` and looks up `codeHelp[code]` in each locale (`errors.mdx:12-35`), so a new code needs a help row in both
locales.

### R10. Wizard step order (found in the sweep, pre-existing since v0.35.0)

`FE/hooks/envelopeDraftFormat.ts:42` `WIZARD_STEPS = ['details', 'signers', 'documents', 'review', 'done']` (since
bb-sign fcbce0a3, v0.35.0). `first-envelope.mdx` lists Documents as step 2 and Signers as step 3. Because step 3 is
rewritten here anyway, the two steps are swapped in both locales (text unchanged apart from the order), and the next-
step LinkCards that follow the old order (`create-an-envelope.mdx:105` -> documents, `documents.mdx:89` -> signers)
are swapped so the reading order follows the wizard. Nothing else about placement is touched.

## Tasks

1. **Sync** (`src/content/sync/sign/*`): `PRODUCT_REPO_TOKEN=$(gh auth token) npm run sync:sign -- v0.38.0`. Check
   the diff is the two descriptions plus the manifest; commit alone.
2. **Facts** (`src/content/facts/sign.ts`, `sign-integrations.ts`, `tests/unit/facts.test.ts`):
   - Re-point the drifted citations in R5; update the header note ("re-read at v0.38.0 4c39ee7c").
   - New group `SIGNING_ORDER` in `sign.ts`:
     - `minSignOrder: fact(1, 'EA/application/usecase/CreateEnvelopeUseCase.kt:172; EA/application/usecase/AddSignerUseCase.kt:32; EA/presentation/admin/EnvelopeController.kt:169,179')`
     - `defaultSignOrder: fact(1, 'EA/presentation/admin/EnvelopeController.kt:172,182')`
     - `refusedStatus: fact(400, 'bb-sign/platform/starters/starter-web-errors/.../GlobalExceptionHandler.kt:52-54; ErrorCodes.kt:12')`
     - `tiesSignAsGroup: fact(true, 'EA/application/usecase/SendEnvelopeUseCase.kt:55-56; RecordSignatureUseCase.kt:196-204; e2e 34-api-sequential-signing.spec.ts:211-260')`
     - `wizardSendsListPosition: fact(true, 'FE/components/signers/signingOrder.ts:47-56; FE/pages/CreateEnvelope.tsx:411')`
     - `wizardCreatesTies: fact(false, 'FE/components/signers/signingOrder.ts:39-43,53')`
     - `positionsOnlyWhenSequential: fact(true, 'FE/components/signers/SignerOrderList.tsx:15-16,67; FE/pages/EnvelopeDetail.tsx:379-382; FE/pages/CreateEnvelope.tsx:941')`
     - `readOnlyStepsAreDenseRank: fact(true, 'FE/components/signers/signingOrder.ts:88-96; SignerOrderList.tsx:48-50')`
     (spell `FE` out as `bb-sign/frontend/src` in sources, as the file does today.)
   - `ERROR_CODES` gets `{ code: 'VALIDATION_FAILED', status: 400, where: 'a field fails a validation rule, for example signOrder below 1; the message names the field', source: 'GlobalExceptionHandler.kt:48-54; ErrorCodes.kt:12,26; CreateEnvelopeUseCase.kt:172; AddSignerUseCase.kt:32' }`.
   - Tests: add `SIGNING_ORDER` to the source walk; one relation test: `minSignOrder === defaultSignOrder === 1`,
     `refusedStatus === ERROR_CODES VALIDATION_FAILED status`, `wizardCreatesTies === false` while
     `tiesSignAsGroup === true` (ties are API-only).
3. **`sending/signers-and-order.mdx`** (ES, EN): rewrite "Añadir los firmantes" (cards, Email/Name, Add another,
   Remove only with more than one, empty cards dropped), new "Ordenar los firmantes" section for sequential (hint
   quoted, handle, number, Subir/Bajar, mouse/touch drag, keyboard per `dnd.instructions`, announcements, the
   fallback message, order sent = card order, no numbers to type), "Firmar a la vez" (note quoted, no positions, list
   order kept when switching), "Firmar en orden" (turns by position, one signer per turn from the app; groups via API
   only, link to walkthrough), table row "Campo Orden" -> "Posición y controles para reordenar", "Seguir" section
   mentions positions on the envelope page only when sequential. Facts imported, not typed.
4. **`sending/create-an-envelope.mdx`** (ES, EN): the sentence after the signing-order table: sequential = cards to
   reorder; parallel = no positions. LinkCard next step -> Firmantes y orden (R10).
5. **`getting-started/first-envelope.mdx`** (ES, EN): swap steps 2 and 3 (R10); step Signers: "Si eligió firma en
   orden, ordene las tarjetas arrastrándolas o con Subir y Bajar"; Review: the signers list "Firmantes (N)" with
   positions when sequential.
6. **`concepts/envelopes-and-signers.mdx`** (ES, EN): signer list without "Orden n.º"; mode table "Orden" column:
   parallel "No se muestra posición", sequential "La posición en la lista del paso Firmantes"; groups paragraph: only
   via API (`signOrder` equal), shown as the same position; link.
7. **`sending/send-and-track.mdx`** (ES, EN): Firmantes (N) row: mode and hint; per signer name, email, signing date and
   status; in a sequential envelope also its position (a number; consecutive steps when the API set a group).
8. **`sending/documents.mdx`, `concepts/documents.mdx`** (ES, EN): "N es la posición del firmante en la lista de
   firmantes (su `signOrder`)". `documents.mdx` LinkCard next step -> review/send (R10): `send-and-track`.
9. **`reference/glossary.mdx`** (ES, EN): sign order entry rewritten.
10. **`developers/envelope-walkthrough.mdx`** (ES, EN): `signOrder` paragraph: 1-based, >= <Fact minSignOrder>, default
    <Fact defaultSignOrder>, equal values = group in sequential, below 1 -> `400 VALIDATION_FAILED` in both modes with
    the two messages; the app always sends 1..N.
11. **`developers/migrating-from-adobe.mdx`** (ES, EN): extend the "Orden de firma" bullet as in
    `migrating-from-adobe.md:121`.
12. **`developers/errors.mdx`** (ES, EN): `codeHelp.VALIDATION_FAILED` (cause + what to do); the 400 row mentions
    `VALIDATION_FAILED` and that `message` names the field; table intro still lists `NOT_FOUND`/`WORKSPACE_NOT_FOUND`.
13. **Verify and report**: `npm run verify`; refresh API visual baselines only if they changed (look at them); build,
    grep `dist/` (AC1); look at changed pages in both themes at 375 px; write
    `.claude/PRPs/reports/signing-order-docs-report.md`.

## Validation

```bash
cd .claude/worktrees/signing-order-docs
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22
PRODUCT_REPO_TOKEN=$(gh auth token) npm run sync:sign -- v0.38.0
git diff --stat src/content/sync/sign            # openapi.json (+2 descriptions) and sign.json only
node -e "const m=require('./src/content/sync/sign/sign.json');console.log(m.commit||m.source)"   # 4c39ee7c...
npx vitest run tests/unit/facts.test.ts tests/unit/content.test.ts tests/unit/sync.test.ts
npm run verify
# AC1: no leftover typed-order or parallel-order wording in the built site
grep -rniE "campo \*?\*?orden|orden n\.º|order #|order field|números de orden de abajo|order numbers below|no se aplican\.|are not enforced|número de orden es informativo|order number is informational|Quitar firmante|Remove signer\b" dist --include=*.html | grep -v "/sign/api/" ; echo "exit $?"
# AC2/AC3: the exact strings are present
grep -rlF "Los firmantes firman en este orden. Arrastra un firmante con el control para arrastrar, o usa Subir y Bajar." dist
grep -rlF "Signers sign in this order. Drag a signer by the handle, or use Move up and Move down." dist
grep -rlF "Todos recibieron el correo a la vez y pueden firmar en cualquier orden." dist
```

Each citation in R5 is re-checked with `git -C ../../../../bb-sign show v0.38.0:<path> | sed -n '<lines>p'`.

## Risks and rollback

- **Wrong UI wording**: every quoted string is copied from `create.json` / `envelopes.json` at `v0.38.0`; the
  dist grep checks three of them verbatim. The icon buttons have no visible text; the pages say so and give the
  accessible names, so a reader does not look for a text button.
- **Over-claiming ties**: the app cannot create groups (D3 API-only); pages say groups come from the API only.
- **Old drafts**: a draft saved before v0.38.0 with a tied group restores as a strict order (bb-sign report D5). Too
  niche for user docs; not documented.
- **Sync noise**: if the sync changes more than expected (legal texts), stop and compare with the tag.
- **Visual baselines**: only the API page could move; refreshed baselines are reviewed by eye.
- **Rollback**: revert the PR; the site is static and redeployed by bb-infrastructure, nothing else depends on it.

---

## Revision 2 (answers review round 1, 2026-10-29)

This section supersedes the parts of the plan above that it names. Everything else stands.

### Rev2-1 (finding 1, HIGH): no LinkCard swaps

Dropped. Task 4 no longer changes the `create-an-envelope` LinkCard, and Task 8 no longer changes the `documents`
LinkCard. Navigation stays create, documents, signers, send-and-track, as the sidebar (`src/config/products.ts:130-131`)
and the prev/next footer say. Reordering the navigation to follow the wizard is a separate change, listed in the
report as a follow-up.

### Rev2-2 (finding 2, HIGH): step-order corrections complete, with a fact

- New fact `WIZARD.steps = fact(['details', 'signers', 'documents', 'review', 'done'], 'bb-sign/frontend/src/hooks/envelopeDraftFormat.ts:42')`
  in the new module (Rev2-5). Test: `steps.indexOf('signers') < steps.indexOf('documents')`.
- Task 5 (`getting-started/first-envelope.mdx`, ES and EN) also changes:
  - `:14` the five steps listed as Detalles, Firmantes, Documentos, Revisión, Listo (EN Details, Signers, Documents,
    Review, Done; labels from `create.json:5-11`).
  - The Review sentence (ES `:50-52`, EN `:49-51`), in the order the review shows it (`CreateEnvelope.tsx:922-956`):
    title, workspace, OTP required, sequential signing, the **Firmantes (N)** / **Signers (N)** list (with positions
    when signing in order), documents, labels.
  - `:55` (EN `:53-54`) "a los primeros del orden" becomes "al primer firmante (en la firma en orden)". Groups come only
    from the API, so this page, which is about the app, does not mention them.
- Task 8 adds `concepts/documents.mdx:34` (ES "en su segundo paso", EN "in its second step") -> third step (tercer
  paso / third step). The rest of that sentence still holds: the envelope is created at send
  (`CreateEnvelope.tsx:389-390`).

### Rev2-3 (finding 3, HIGH): `VALIDATION_FAILED` described as the product does it

- `ERROR_CODES` entry:
  `{ code: 'VALIDATION_FAILED', status: 400, where: 'the request failed a validation rule: a missing or invalid value, a malformed body, or a path or query value of the wrong type; message says what was refused', source: 'bb-sign/platform/starters/starter-web-errors/src/main/kotlin/co/binarybridges/sign/platform/weberrors/GlobalExceptionHandler.kt:48-54,76-87; bb-sign/platform/starters/starter-web-errors/.../ErrorCodes.kt:12,25-26; EA/application/usecase/CreateEnvelopeUseCase.kt:172; EA/application/usecase/AddSignerUseCase.kt:32' }`.
- `codeHelp.VALIDATION_FAILED` (ES/EN): cause = "La solicitud no cumple una regla de validación: un valor que falta o
  no es válido, un cuerpo mal formado o un parámetro de ruta o consulta con un tipo incorrecto. `message` indica qué se
  rechazó, por ejemplo `signers[1].signOrder must be 1 or greater`"; what to do = "Corrija el valor que indica `message`
  y vuelva a enviar la solicitud. Base la lógica en `code`, no en el texto de `message`".
- The 400 status row is not rewritten. It already says "errores de validación"; one clause is appended:
  "(`code` `VALIDATION_FAILED`)". It does not say the message names a field.
- Task 10 presents the two messages as today's wording ("hoy, el mensaje es ..."), not as a contract.

### Rev2-4 (finding 4, MEDIUM): SDKs report the status only

Task 10 (ES/EN) says: over HTTP the body carries `code: "VALIDATION_FAILED"` and the message; the SDKs report a `400`
only. It reuses the existing `SDK.errorCarriesStatusOnly` fact (`sign-integrations.ts:38-43`) in the sentence.

### Rev2-5 (finding 5, MEDIUM): a fact for every behavioural claim

`sign.ts` is at 742 lines (cap 800, `facts.test.ts:313-318`). The new facts go in a new module,
`src/content/facts/sign-signing-order.ts`, re-exported from `sign.ts` like `sign-integrations.ts` (`export * from`),
so pages still import from `facts/sign`. `FE` = `bb-sign/frontend/src`, `EA` as in `sign.ts`.

```ts
export const WIZARD = {
  steps: fact([...] as const, 'bb-sign/frontend/src/hooks/envelopeDraftFormat.ts:42'),
};
export const SIGNING_ORDER = {
  // API (#128)
  minSignOrder: fact(1, 'EA/application/usecase/CreateEnvelopeUseCase.kt:172; EA/application/usecase/AddSignerUseCase.kt:32; EA/presentation/admin/EnvelopeController.kt:169,179'),
  defaultSignOrder: fact(1, 'EA/presentation/admin/EnvelopeController.kt:172,182 (signOrderOrDefault), :427,775 (applied)'),
  refusedStatus: fact(400, 'bb-sign/platform/starters/starter-web-errors/.../GlobalExceptionHandler.kt:52-54; ErrorCodes.kt:12'),
  refusedInBothModes: fact(true, 'EA/application/usecase/CreateEnvelopeUseCase.kt:167-173 (no sequentialSigning check); bb-sign/e2e/playwright/tests/34-api-sequential-signing.spec.ts:173-200'),
  tiesSignAsGroup: fact(true, 'EA/application/usecase/SendEnvelopeUseCase.kt:55-56; EA/application/usecase/RecordSignatureUseCase.kt:196-204; bb-sign/e2e/playwright/tests/34-api-sequential-signing.spec.ts:210-257'),
  // Wizard (#293)
  wizardSendsListPosition: fact(true, 'FE/components/signers/signingOrder.ts:47-56; FE/pages/CreateEnvelope.tsx:411'),
  wizardCreatesTies: fact(false, 'FE/components/signers/signingOrder.ts:39-43,53'),
  reorderControlsFromSigners: fact(2, 'FE/components/signers/SignerCard.tsx:85 (sequential && count > 1)'),
  removeFromSigners: fact(2, 'FE/components/signers/SignerCard.tsx:90 (count > 1)'),
  moveDisabledAtEnds: fact(true, 'FE/components/signers/SignerCard.tsx:138,150'),
  dragByPointerAndKeyboard: fact(['mouse', 'touch', 'keyboard'] as const, 'FE/components/signers/sortableAdapter.tsx:52,57-60 (PointerSensor, KeyboardSensor)'),
  movesAnnounced: fact(true, 'FE/components/signers/SignerCardList.tsx:145-150,195; FE/components/signers/sortableAdapter.tsx:69-84'),
  dragFallbackKeepsButtons: fact(true, 'FE/components/signers/SignerCardList.tsx:79-80,192-194'),
  modeSwitchKeepsOrder: fact(true, 'FE/pages/CreateEnvelope.tsx:705-706 (only setSequentialSigning), :423 (moveItem is the only reorder)'),
  emptyCardsDropped: fact(true, 'FE/pages/CreateEnvelope.tsx:881,896; FE/hooks/envelopeDraftFormat.ts:133-135; FE/components/signers/signingOrder.ts:51'),
  // Read-only views (#129)
  positionsOnlyWhenSequential: fact(true, 'FE/components/signers/SignerOrderList.tsx:15-16,67; FE/pages/EnvelopeDetail.tsx:379-382; FE/pages/CreateEnvelope.tsx:941'),
  readOnlyStepsAreDenseRank: fact(true, 'FE/components/signers/signingOrder.ts:88-96; FE/components/signers/SignerOrderList.tsx:48-50'),
};
```

(Source strings spell `FE` out as `bb-sign/frontend/src`.) Tests in `facts.test.ts`: import `WIZARD` and
`SIGNING_ORDER` (`:3-40`), add both to the source walk (`:58-62`), a format check
`for (const f of Object.values(SIGNING_ORDER)) expect(f.source).toMatch(/\.(ts|tsx|json|kt):\d/)`, and the relations:
`minSignOrder === defaultSignOrder === 1`; `refusedStatus` equals the `VALIDATION_FAILED` status in `ERROR_CODES`;
`wizardCreatesTies === false` and `tiesSignAsGroup === true`; `reorderControlsFromSigners === removeFromSigners === 2`;
the step-order relation (Rev2-2).

Pages state these numbers with `<Fact>` (for example "con <Fact of={SIGNING_ORDER.removeFromSigners} /> firmantes o
más").

### Rev2-6 (finding 6, MEDIUM): `{{signerN}}` wording

`sending/documents.mdx` and `concepts/documents.mdx` (ES/EN): "N es el lugar del firmante en la lista del paso
**Firmantes**, contando desde arriba: `{{signer1}}` para la primera tarjeta, `{{signer2}}` para la segunda. En la firma
a la vez las tarjetas no muestran número, pero el orden cuenta igual." No equation with the number on the envelope
page. The developer pages do not touch the marker.

### Rev2-7 (finding 7, MEDIUM): validation that can see the phrases

Replaces the AC1 grep. Each check states its expected result.

```bash
# 1. Source: must print nothing (exit 1)
grep -rnE '\*\*(Orden|Order)\*\*|\*\*Orden n\.º|\*\*Order #|Orden n\.º|Order #|Quitar firmante|Remove signer\b|no se aplican|not enforced|es informativo|is informational|\*\*Firmantes:\*\*|campo \*\*Orden|\*\*Order\*\* field|primeros del orden|first ones in the' src/content/docs --exclude-dir=legal
# 2. Built site, tags stripped and whitespace collapsed: must print nothing
node -e '
const fs=require("fs"),p=require("path");const bad=[/campo Orden\b/i,/Orden n\.º/,/Order #/,/Order field/i,/Quitar firmante/,/Remove signer\b/,/no se aplican/,/not enforced/,/primeros del orden/];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p.join(d,e.name)):e.name.endsWith(".html")?[p.join(d,e.name)]:[]);
for(const f of walk("dist")){if(f.includes("/api/")||f.includes("/legal/"))continue;const t=fs.readFileSync(f,"utf8").replace(/<script[\s\S]*?<\/script>/g,"").replace(/<[^>]+>/g," ").replace(/\s+/g," ");for(const r of bad)if(r.test(t))console.log(f,r)}'
# 3. Built site, exact app strings present (tags stripped, whitespace collapsed): each prints a count >= 1
```

The third check is the same script with the quoted strings (orderHint, parallelNote, dnd keyboard text,
dragUnavailable, modeParallelHint in each locale) and a count per string. Quoted app strings stay on one MDX line.

### Rev2-8 (finding 8, LOW): published OpenAPI copy

Task 1 expects and commits `public/sync/sign/openapi.json` too (`scripts/sync-product.mjs:58,72`). Check:
`git diff --stat src/content/sync/sign public/sync/sign` shows `openapi.json` twice and `sign.json`.

### Rev2-9 (finding 9, LOW): R5 SDK row corrected

Both SDK CHANGELOGs changed in v0.38.0 (a "Changed (HTTP API)" entry for #128). `SDK.javaUnknownEnumTolerant` cites
"`sdk-java/CHANGELOG.md` Unreleased"; that entry is still under `## Unreleased` at v0.38.0 (`sdk-java/CHANGELOG.md:7,24-26`),
so the citation stands. `sdk-js/package.json` and `sdk-js/src/index.ts` did not change.

### Rev2-10 (finding 10, LOW): ranges and commands

Tie test `34-api-sequential-signing.spec.ts:210-257`; facts status test `facts.test.ts:206-215`; citations are
re-checked with `sed -n 'a,bp'` (BSD form); all sources carry their full prefix.

### Rev2-11 (finding 11, LOW): Spanish register and the three parallel strings

App strings in quotation marks stay verbatim, in "tú". All prose, including any paraphrase of the keyboard steps, is in
"usted" ("pulse Espacio o Enter para tomar la tarjeta"). The three parallel strings are quoted only on their own
screen: Details `step1.sequentialSigningHintOff` (`create.json:29`) on `create-an-envelope`; Signers
`step3.parallelNote` (`:53`) on `signers-and-order`; the envelope page's `modeParallelHint` (`envelopes.json:128`) on
`signers-and-order` and `send-and-track`.

### Rev2-12 (finding 12, LOW): rollout state

The report records which bb-sign version production runs (edge-api in `bb-infrastructure/apps/bb-sign/edge-api.yaml`,
frontend as deployed). This plan opens a PR and does not merge or deploy. The PR body says the docs describe v0.38.0
and should merge once the v0.38.0 frontend is live.
