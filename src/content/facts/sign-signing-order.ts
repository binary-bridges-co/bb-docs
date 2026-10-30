/**
 * The signing order: the wizard's steps, the Signers step's cards (bb-sign#293), the read-only lists (#129) and the
 * `signOrder` rule of the API (#128). Read at the bb-sign release tag v0.38.0 (4c39ee7c, bb-sign#314) on 2026-10-29.
 * Re-exported from `sign.ts`, so pages import from `facts/sign` alone.
 *
 * Source shorthands as in `sign.ts`: `EA` = bb-sign/edge-api/src/main/kotlin/co/binarybridges/sign/edge.
 */

import { fact } from './fact';

export type WizardStep = 'details' | 'signers' | 'documents' | 'review' | 'done';

export const WIZARD = {
  /** The Create Envelope wizard's steps, in order. Signers comes before Documents since bb-sign v0.35.0. */
  steps: fact(
    ['details', 'signers', 'documents', 'review', 'done'] as const satisfies readonly WizardStep[],
    'bb-sign/frontend/src/hooks/envelopeDraftFormat.ts:42',
  ),
  /** The envelope is created and sent in one go when the sender presses Send Envelope, after the documents step. */
  envelopeCreatedAtSend: fact(true, 'bb-sign/frontend/src/pages/CreateEnvelope.tsx:336-353,389-390'),
} as const;

const FE = 'bb-sign/frontend/src';
const PLATFORM = 'bb-sign/platform/starters/starter-web-errors/src/main/kotlin/co/binarybridges/sign/platform/weberrors';

export const SIGNING_ORDER = {
  // ------------------------------------------------------------- API (#128) ---
  /** `signOrder` is 1-based: a value below this is refused on create-envelope and add-signer. */
  minSignOrder: fact(
    1,
    'EA/application/usecase/CreateEnvelopeUseCase.kt:172; EA/application/usecase/AddSignerUseCase.kt:32; EA/presentation/admin/EnvelopeController.kt:169,179',
  ),
  /** An omitted `signOrder` is stored as this. */
  defaultSignOrder: fact(1, 'EA/presentation/admin/EnvelopeController.kt:172,182 (signOrderOrDefault), :427,775 (applied)'),
  /** The status of the refusal; its `code` is VALIDATION_FAILED (`ERROR_CODES`). */
  refusedStatus: fact(400, `${PLATFORM}/GlobalExceptionHandler.kt:52-54; ${PLATFORM}/ErrorCodes.kt:12`),
  /** The rule does not depend on `sequentialSigning`. */
  refusedInBothModes: fact(
    true,
    'EA/application/usecase/CreateEnvelopeUseCase.kt:167-173 (no sequentialSigning check); bb-sign/e2e/playwright/tests/34-api-sequential-signing.spec.ts:173-200',
  ),
  /** Signers with equal `signOrder` are one turn: notified together, the next turn starts when all of them signed. */
  tiesSignAsGroup: fact(
    true,
    'EA/application/usecase/SendEnvelopeUseCase.kt:55-56; EA/application/usecase/RecordSignatureUseCase.kt:196-204; bb-sign/e2e/playwright/tests/34-api-sequential-signing.spec.ts:210-257',
  ),

  // ------------------------------------------------------- wizard (#293) ---
  /** The order sent is the card order, 1..N, in both modes; nobody types a number. */
  wizardSendsListPosition: fact(true, `${FE}/components/signers/signingOrder.ts:47-56; ${FE}/pages/CreateEnvelope.tsx:411`),
  /** The app never sends two signers with the same `signOrder`: groups are API-only. */
  wizardCreatesTies: fact(false, `${FE}/components/signers/signingOrder.ts:39-43,53`),
  /** In sequential mode the handle and Move up / Move down appear from this many cards (empty cards count). */
  reorderControlsFromCards: fact(2, `${FE}/components/signers/SignerCard.tsx:85 (sequential && count > 1)`),
  /** Remove appears from this many cards, in both modes (empty cards count). */
  removeFromCards: fact(2, `${FE}/components/signers/SignerCard.tsx:90 (count > 1)`),
  /** Move up is disabled on the first card and Move down on the last. */
  moveDisabledAtEnds: fact(true, `${FE}/components/signers/SignerCard.tsx:138,150`),
  /** For tests only (English words): one pointer sensor (mouse and touch) and a keyboard sensor. */
  dragByPointerAndKeyboard: fact(
    ['mouse', 'touch', 'keyboard'] as const,
    `${FE}/components/signers/sortableAdapter.tsx:52,57-60 (PointerSensor, KeyboardSensor)`,
  ),
  /** Every move is announced in a live region (buttons) or by the drag library (drag). */
  movesAnnounced: fact(true, `${FE}/components/signers/SignerCardList.tsx:145-150,195; ${FE}/components/signers/sortableAdapter.tsx:69-84`),
  /** If the drag code does not load, a note says so and Move up / Move down keep working. */
  dragFallbackKeepsButtons: fact(true, `${FE}/components/signers/SignerCardList.tsx:79-80,192-194`),
  /** Changing the signing order on Details only switches the mode; the list keeps its order. */
  modeSwitchKeepsOrder: fact(
    true,
    `${FE}/pages/CreateEnvelope.tsx:705-706 (only setSequentialSigning), :423 (moveItem, the only reorder besides a draft restore at :148)`,
  ),
  /** Completely empty cards are dropped when the sender continues. */
  emptyCardsDropped: fact(
    true,
    `${FE}/pages/CreateEnvelope.tsx:881,896; ${FE}/hooks/envelopeDraftFormat.ts:133-135; ${FE}/components/signers/signingOrder.ts:51`,
  ),

  // ------------------------------------------------ read-only views (#129) ---
  /** The review step and the envelope page show positions only on a sequential envelope. */
  positionsOnlyWhenSequential: fact(
    true,
    `${FE}/components/signers/SignerOrderList.tsx:15-16,67; ${FE}/pages/EnvelopeDetail.tsx:379-382; ${FE}/pages/CreateEnvelope.tsx:941`,
  ),
  /** Positions on those views are the step at which each signer signs: `signOrder` 1, 1, 3 shows as 1, 1, 2. */
  readOnlyStepsAreDenseRank: fact(true, `${FE}/components/signers/signingOrder.ts:88-96; ${FE}/components/signers/SignerOrderList.tsx:48-50`),
} as const;
