---
plan: .claude/PRPs/plans/sync-sign-v0-34.plan.md
status: APPROVED
reviewer: code-reviewer (independent subagent, implementation review)
reviewed: 2026-10-21
---

## Verdict

APPROVED. No CRITICAL or HIGH finding. The Spanish legal pages are byte-faithful to bb-sign 114de38 through the three documented transforms and nothing else. The English terms and both guides keep every clause, number, list item and code block of the Spanish. The banner phrase appears nowhere. The not-shipped list, D1, D2, D4, D9 and D10 are respected on every page checked. 55 factual statements were sampled across all four areas: all 55 values were correct, and the cited lines were correct or within the same block. Four MEDIUM/LOW items below should be handled before or at deploy. None changes a claim of fact today.

## Findings

| # | Severity | file:line | Finding | Required change |
|---|---|---|---|---|
| 1 | MEDIUM | src/content/docs/sign/legal/terms.md (Versión 4), deploy ordering | The terms say "Se publican en la aplicación". Production runs bb-sign frontend v0.34.1, whose own terms are still Versión 3 with the review banner (`git show v0.34.0:docs/legal/terminos-y-condiciones.md`). If docs go out before the app release carrying 114de38 (#276) is deployed, docs.binarybridges.co shows Versión 4 while sign.binarybridges.co shows Versión 3 and the banner. For a legal text this is a visible disagreement. | Make the deploy conditional: publish docs only after the bb-sign release containing 114de38 is live (state it in the report's deploy section), or accept and record the window. |
| 2 | MEDIUM | src/content/docs/sign/concepts/evidence-certificate.mdx:126 and en/.../evidence-certificate.mdx:122 | "bloqueados contra cualquier cambio" / "locked against any change" overstates the control. The fact is a GOVERNANCE Object Lock (`EVIDENCE.retentionDays`, `evidenceBucketWriter`). Governance mode can be bypassed by a privileged principal. Compare "the sealed PDF cannot change undetected", which is true. | Reword both locales to what is true, for example "protegidos contra modificación durante todo el plazo" with no absolute, or say changes are detectable by the seal and the hash. |
| 3 | LOW | src/content/facts/sign.ts:6-7 | Header says "Re-verified against bb-sign main (df6a2a6) plus bb-sign#276", while the manifest and `sign-integrations.ts` header say 114de38. #276 is now merged at 114de38, and v0.34.0..114de38 changes only frontend dark-mode CSS, so no value is wrong. The header is stale and inconsistent. | Change the header to 114de38 (v0.34.2 release branch), without "plus #276". |
| 4 | LOW | src/content/docs/sign/sdks/java.mdx:235, en/sign/sdks/java.mdx:230 | Customer-facing text cites `bb-sign#281`, an issue in a private repository the reader cannot open. | Drop the number from the page (keep it in the fact comment) or link to a public changelog entry. |
| 5 | LOW | tests/unit/legal.test.ts (structure()) | The es/en equality test checks section numbers, clause numbers, history items, heading counts and code blocks. It cannot see a clause that was softened or reworded in English. I read all three English texts side by side and found none, but a future edit would pass. | Optionally also assert that the multiset of digits and numbers (365, 90, 7, 30, 5, 2048, 527, 1999) per section is equal in both locales. This is cheap and catches the usual legal drift. |
| 6 | LOW | README.md (Sync) | "rewrite the four in-app links": the map has three targets and the four is the count of occurrences. Easy to misread. | Say "rewrite the in-app links (three routes)". |

## Priority checks

### 1. Legal fidelity (PASS)

- `cmp` of `src/content/sync/sign/legal/*.md` against `bb-sign@114de38` `docs/legal/terminos-y-condiciones.md`, `docs/guias/certificado-propio.md` and `docs/guias/conservacion-y-restauracion.md`: identical. `sign.json` commit is 114de38 and has no `uncommitted` key. The synced OpenAPI hash is the one the report predicted.
- I re-ran `renderLegalPage` from `scripts/legal-mirror.mjs` on the bb-sign files: all three generated pages are `===` the committed pages. `diff` of source against page shows only the frontmatter, the dropped H1, the dropped version line and the four rewritten link targets.
- Generator: it fails on unknown app-relative targets, fragments, reference links, raw HTML links and a malformed or banner-suffixed version line. A guide with no version line is handled.
- English terms (Versión 4): sections 1 to 3, clauses 1.1 to 3.3 and the history (4 items) match. Checked specifically: 1.1 (Decreto 2364/1074, art. 28 Ley 527), 2.2 ("does not grant trust before third parties"), 2.4 (30 and 7 days, "aid, not a transfer of responsibility"), 2.6 ("and for no other purpose"), 3.1 (365 days, not configurable, permanent deletion), 3.2 (90 days "may" be moved, "cannot be downloaded immediately", 7 days, `document.restored`, evidence not archived), 3.3. No clause added, dropped or softened.
- English certificate guide: all 8 sections, the 5 chain statuses, the refusal list, the 5-minute and 30/7-day notices, and the openssl blocks (byte-equal, test-enforced) match.
- English retention guide: all 5 sections, status codes 202, 200, 410, 429 and 503, the availability values, the 300 s link and the 7-day window match.
- "The Spanish version prevails" renders: present in `dist/en/sign/legal/{terms,retention-guide,own-certificate-guide}/index.html`. The version header renders once, with `data-legal-version="Versión 4 · 2026-10-20"`.
- Banner phrase: `grep -rniE "pendiente de revisi|pending legal review|revisión jurídica|legal review"` over src, tests, scripts, CLAUDE.md, README.md and dist: no match.

### 2. Over-claiming (PASS)

- NOT_SHIPPED terms (templates, bulk send, decline, resend link, SMS, access codes, TSA/PAdES/LTV, legal hold): the only hits are the Adobe migration table, which maps the Adobe feature to "no equivalent" or "one envelope per recipient", plus UI strings.
- D4: no page says signers accept agreement texts. Both locales of `admin/permissions` and `admin/index` carry the sentence "not yet shown to signers nor attached to envelopes". `developers/index` and `authentication` carry the `pinAtSendInProduction` conditional. The evidence certificate says "Sin acuerdos adjuntos". `agreement:manage` is confirmed in `OrgIdentityController:34` and `OrgAgreementController:39`.
- D1 and D2: `legal/retention`, `admin/storage`, `sending/retention-and-restore`, `archived-envelopes`, `documents`, `webhooks` (`archivesAt` null) and `statuses` all say nothing moves to archive storage today. Archived envelopes and signer links stay downloadable. The "Aplicar" button is documented as writing to production, as the code does (`LifecycleController:107-117`).
- D9: `verify-a-document` (es and en), `archived-envelopes`, `troubleshooting` and `evidence-and-audit` say the QR fails for archived envelopes. They say the file check needs the signed hash recorded since v0.29.0, and that the QR does not read the PDF. Issues #277, #281 and #285 exist and are OPEN.
- D10: OTP is bound to the signer (`review-and-identity`: "Cada código sirve solo para usted"). Source `VerifyOtpUseCase` signerId check confirmed through the fact.

### 4. Consistency (PASS)

- Twin script over all 55 es/en pairs (sections, subsections, table rows, `<Fact>` multiset, asides, list items, code fences, internal links): the only differences are anchor slugs, which are language-specific by design, and `ADMIN_MFA.enrolmentTitleEs` vs `...En`, which is intended. `/sign/api/**` links are shared by both locales (pre-existing on main).
- The three legal pages exist in both locales. The five new non-legal pages (`evidence-certificate`, `retention-and-restore`, `sign-in-security`, `own-certificate-guide`, `retention-guide`) are registered in `products.ts` with es and en labels.
- Voice: no "tu/puedes/haz" outside quoted UI strings (all hits are verbatim app messages). No emoji. Typed arrows only in code (`->` in Java) and in the generated legal text, which is exempted by a test that pins the exemption to exactly the mirrors.

### 5. Tests (PASS)

- `npx vitest run` (Node 22): 6 files, 80 tests pass.
- Compared with origin/main: no test deleted. The removed assertions in `facts.test.ts` are the five that encoded now-false facts (Glacier "none", `restoreOnRequest` false, 6 events, leaf-only chain, NOT_SHIPPED entries). Each is replaced by an assertion of the new truth. In `legal.test.ts` the old "canonical clauses verbatim" test is superseded by byte equality in `sync.test.ts`. `content.test.ts` only adds denylist literals and a pinned exemption.
- Bite: editing a generated page fails `sync.test.ts`. An invented English clause fails the clause-set test. A missing "Spanish prevails" or a banner reappearing fails the built-page tests. Gap: see finding 5.

## Sample-check table (facts verified against ground truth)

| # | Statement (page area) | Cited source | Ground truth | Result |
|---|---|---|---|---|
| 1 | Token lifetime 300 s (developers) | realm.json:4, kc-init.sh:531 | `accessTokenLifespan: 300` | OK |
| 2 | 10 credentials per org, revoked listed 90 d | KeycloakApiCredentialAdapter:49-50 | `:10`, `:90` | OK |
| 3 | Invitation link 72 h | yml:172 | 259200 s | OK |
| 4 | 50 workspace memberships | yml:143 | `membership-cap:50` | OK |
| 5 | Password 12 to 128, history 5 | kc-init.sh:662 | exact string | OK |
| 6 | Brute force 10, step 60 s, max 900 s, reset 12 h, no lockout | kc-init.sh:658-660 | exact | OK |
| 7 | Envelope archive after 30 d, 02:00 UTC | yml:205,210 | `threshold-days 30`, cron `0 0 2` | OK |
| 8 | Stamp hold 7 d | yml:207-209 | 7 | OK |
| 9 | View dedup 30 s | yml:219-223 | 30 | OK |
| 10 | OTP 15 min, 3 attempts, resend 60 s, verified 15 min | auth yml:52, V002:10, yml:229, RecordSignature:55 | 900, 3, 60, 15 min | OK |
| 11 | Upload 50 MB; unassigned 500 MB, 24 h | yml:64-65,244-245 | exact | OK |
| 12 | Agreements pin and seed off in prod | edge-api.yaml:64,68 | both `"false"` | OK |
| 13 | Admin MFA roles, TOTP 6 digits 30 s, no reuse | keycloak.yaml:73, kc-init:663-664 | exact | OK |
| 14 | Verify file 10/min, 4 concurrent, 30 s, 50 MB | edge-api.yaml:58-61, yml:235-238 | exact | OK |
| 15 | QR reads live signers only (D9) | VerifySignatureSealUseCase:40-44 | `findByEnvelopeIdAndSealHashStartingWith` live repo | OK |
| 16 | Testing certificate RSA 4096, 10 years, subject | GlobalCertificateBootstrap:49-52 | exact | OK |
| 17 | Cert upload p12/pfx/pem, 5 MB, 2048 bits, digitalSignature | UploadOrgCertificateUseCase:38-39,214-218 | exact | OK |
| 18 | Expiry notices 30 and 7 d, 13:07 UTC | yml:184-187, scheduler:20-21 | exact, zone UTC | OK |
| 19 | Chain max 10 | CertificateChainInspector:22,108 | `MAX_CHAIN_LENGTH = 10` | OK |
| 20 | Evidence link 300 s | EvidenceCertificateController:124, GetEvidence:29 | "300 seconds" | OK |
| 21 | Re-issue max 3, window 30 d | EvidenceReissue:13-15,41 | exact | OK |
| 22 | Evidence degraded wait 2 h, clamp 24 h | yml:192-193 | `PT2H`, clamped 24 h | OK |
| 23 | Audit export 5000 rows, page 1000, 20/min | AuditReadController:114, throttle:22 | exact | OK |
| 24 | Envelope list cap 10000 | EnvelopeFilterRepository:41 | `COUNT_CAP = 10_000` | OK |
| 25 | Reminders 48 h, 24 h, 09:00 UTC | notification yml:77-80 | exact | OK |
| 26 | Restore: 7 d, first poll 3 h, 50 per org, timeout 48 h, purge 400 d | yml:263-269, RestoreSettings | exact | OK |
| 27 | Restore 3-5 h Standard tier | yml:263-264 comment | "takes 3-5 h" | OK |
| 28 | Signer restore limits 5/10 min per link, 20 per IP | yml:273-274 | exact | OK |
| 29 | Archive dates hidden, `archivesAt` null | yml:261, RetentionDates | `archive-dates-visible:false`, `exposed()` null | OK |
| 30 | Live lifecycle: one 365 d rule, no transitions | documents-lifecycle-guard.md:8-17 | exact text | OK |
| 31 | Template declares IA and Glacier, no expiry (not applied) | same runbook | exact | OK |
| 32 | Restore idle until #214 P5 | lv-retention-restore-iam.md:184-185 | exact | OK |
| 33 | 8 webhook events incl. `evidence_issued`, `document.restored` | WebhookEventType:25-41 | 8 | OK |
| 34 | Retry ladder 1m,5m,30m,2h,12h, jitter 0.2, 3 ladders, probe 6h, log 90 d | WebhookDispatchProperties:30-34 | exact | OK |
| 35 | Max 20 webhooks, rotation grace 24 h | yml:357-358 | exact | OK |
| 36 | `documentsPath`, `downloadPath`, `outcome`, `availableUntil`, `archivesAt`, `deletesAt` in payloads | WebhookEvent.kt:96-194 | all present | OK |
| 37 | SDK backoff 250 ms to 8 s, 429 and 503 retried on any method, Retry-After ignored | RetryInterceptor, sdk-js index.ts:43-44,139-150 | exact | OK |
| 38 | SDK Java 17, jackson 2.17.2, JS Node 20, version 0.1.0 | pom.xml:36,53; package.json:3,10 | exact | OK |
| 39 | Java `enumUnknownDefaultCase` | pom.xml:174 | true | OK |
| 40 | Error codes and statuses (RESTORE 410/429/503/409; evidence 409) | RestoreExceptionHandler:32-35, EvidenceExceptionHandler | exact | OK |
| 41 | Signature fingerprint 8 chars each end | DocumentFingerprint:4-9 | slice(0,8), slice(-8) | OK |
| 42 | Placement marker `{{signerN}}` | PdfPlaceholderLocator:76 | regex `\{\{signer(\d+)}}` | OK |
| 43 | Labels 50 and 200 chars | V009:13-15, SetEnvelopeLabels:44 | exact | OK |
| 44 | Hash backfill hourly; send 409 `DOCUMENT_HASH_MISSING` | scheduler:10-18, SendEnvelope:50-51 | `PT1H`, `DocumentHashMissing` | OK |
| 45 | Cert default display name and reason | CertificateResolverService:16-17 | exact | OK |
| 46 | Download URL 1 h | DocumentDownloads:206 | `URL_TTL_SECONDS = 3600` | OK |
| 47 | Signer link serves the copy after archiving, no expiry check | GetSignedCopyUseCase:20-53 | exact (reads archive, ignores `expiresAt`) | OK |
| 48 | Archived envelope read-only with banner | EnvelopeDetail:170-174 | `archived-banner` | OK |
| 49 | Evidence reissue refused when archived | ReissueEvidenceCertificateUseCase:49-51 | `EnvelopeArchivedReissueUnsupported` | OK |
| 50 | Storage "Aplicar" platform admin only, writes expiration to all managed buckets | LifecycleController:107-117, BucketLifecycleService:56-75 | exact | OK |
| 51 | `GET /verify` does not read the PDF | docs/api/reference.md:712 | exact | OK |
| 52 | `agreement:manage` covers org identity | OrgIdentityController:34 | `@Requires(AGREEMENT_MANAGE...)` | OK |
| 53 | Prod edge-api runs v0.34.0 | edge-api.yaml:29 | `:v0.34.0` | OK |
| 54 | No behaviour change v0.34.0 to 114de38 | `git diff --stat v0.34.0 114de38` | frontend CSS and legal docs only | OK |
| 55 | Issues #277, #281, #285, #214 exist | `gh issue view` | all exist, OPEN | OK |

Pass rate: 55/55 values. No wrong fact found. Line citations were exact or within the same block throughout.

## Checklist

- [x] Spanish terms and both guides byte-faithful to bb-sign 114de38 (three transforms only, link map)
- [x] English terms and guides: no clause added, dropped, softened or reworded; "Spanish prevails" renders
- [x] "Pendiente de revisión jurídica" / "Pending legal review" absent from src, tests, scripts, CLAUDE.md, README, dist
- [x] No NOT_SHIPPED item described as available; D4 respected
- [x] D1, D2 retention pages; D9 verify pages; D10 OTP wording
- [x] 25+ facts verified (55 sampled, 55 correct)
- [x] es/en twins key for key; new pages in the sidebar for both locales; locale links correct
- [x] Product voice (usted, no emoji, no typed arrows outside verbatim legal text and code)
- [x] No test deleted or weakened; new legal tests bite (one gap noted, finding 5)
- [ ] Deploy ordering against the bb-sign app release recorded (finding 1)
