---
plan: .claude/PRPs/plans/sign-storage-pricing-docs.plan.md
issue: binary-bridges-co/bb-docs#14
status: PENDING
reviewer: independent plan reviewer (general-purpose subagent)
reviewed: 2026-11-01
---

## Verdict

REJECTED, because of four HIGH findings. Most of the plan is sound. I re-read the product's research claims at the
`v0.42.0` tag and they hold: the 90-day floor, the 365-day default and the 3650-day ceiling, the reason length of 10
to 1000 characters, the permission and who holds it, the availability labels and "up to 12 hours" for the deepest
tier, the legacy 365-day sentence, the "about 2 days" deletion after a shorter period is applied, the certificate's
per-file period strings and the terms Versión 6 text (§3.1-3.4 and history). Production runs `v0.42.0` with dedicated
storage switched on and the same defaults. Prices match the issue exactly. The D7 formatter gives "$ 1.000" (with a
no-break space) in `es-CO` and "COP 1,000" in `en` on Node 22. The D1 URLs match the plan for the app's vendor-name removal work one for one,
both target pages exist in both locales, nginx serves them with or without the trailing slash, and the order of work
agrees: this PR removes the guides from the sync, and the app removes its copies only after these pages are live
(Deploy step 4 here, the curl check there). Astro's redirect pages carry no script, so the CSP is not affected.

The plan fails on four points. First, it repeats a storage claim the code does not support. Second, it adds new
public fact sources that break its own AC4. Third, its leak check would publish the naming pattern it is meant to
hide. Fourth, the source tree outside `src/` stays unchecked. The same revision should also fix several MEDIUM gaps:
the plan file's own internal references, the tier wording that disagrees with the app plan, the new "storage not
ready" error, a missed page in the sweep, the validation commands, and the order in which the live leak gets fixed.

Owner dependencies, not grounds for rejection: O1 (which envelopes are billed), O2 (sales contact), O3 (minimums,
setup fees, what "10 years" includes). The plan's defaults for them are safe.

## Findings

| # | Severity | Finding | Required change |
|---|---|---|---|
| 1 | HIGH | **"Protected against early deletion" is broader than the product.** The plan copies the issue's AC1 sentence into the Storage page lead ("each organization's files ... protected against early deletion", outline item 1, R3). At `v0.42.0` only evidence files get a per-file deletion lock until their protection date (the worker's evidence-issuing step). The storage itself is checked daily to make sure it has *no* default protection, so documents and signed PDFs are not locked. The plan's own outline item 5 says documents are deleted within about 2 days of a shorter period being applied. As written, the lead contradicts section 5 on the same page and breaks the "no fact without a source" rule. | Split the claim. Documents: "kept for the organization's period, then deleted; only Binary Bridges can shorten it, after seeing what would be deleted". Evidence: "each evidence certificate and its audit trail is locked against deletion until its protection date". Add `ORG_STORAGE.evidenceLocked` and drop a general `protectedAgainstEarlyDeletion`. If the owner wants the issue's wording, they must confirm it covers documents. Record that as an owner question, not as a fact. |
| 2 | HIGH | **New fact sources contradict the plan's own AC4.** The restated AC4 says no internal details "in new fact sources". Task 4 then sources every new fact from "the R1-R3 line", and those lines include production configuration lines (three lines of the production manifest, by path and line number), an internal runbook, an internal plan file and the evidence-retention decision label. Task 3's sweep only covers "vendor, bucket, CLI or template" mentions. Existing sources keep private issue references (`bb-sign#NNN`, 21 of them across the fact modules) and infrastructure runbook names, and the tests pin them: `facts.test.ts` asserts a production-configuration line (:237) and a private issue reference (:312). The Task 2 term list does not cover issue numbers or infrastructure paths, so nothing would stop them. | Write the public-source rule into the plan and into CLAUDE.md §0. For example: product code is cited as `repo/path:line`; production configuration as "production configuration, read YYYY-MM-DD"; no issue numbers, no runbook, plan or decision names, no infrastructure paths. Apply the rule to every fact module, not only to the new facts. List the tests that change (the two above, the `source` checks at :87 and :90, and the checks at :188 and :328 if they move). Add issue-number and infrastructure-path patterns to the Task 2 check. |
| 3 | HIGH | **Task 2 would publish what it is meant to hide.** "The term list lives only in this script" and includes "bucket-name prefixes". `scripts/` is public, so the script would publish the storage naming pattern that the plan's header forbids ("no bucket names or naming patterns"). The same applies to the unit-test fixture "that must fail". | Keep real prefixes and names out of the repository. Match only the vendor and product names already public in issue #14, the generic storage words and the vendor-specific class identifiers. If an exact-name check is wanted, read the names from a CI secret or a local, git-ignored file, and skip that check when it is absent. Build the fixture from harmless placeholders that are injected into the term list during the test. |
| 4 | HIGH | **The rest of the public tree is never checked.** Task 2 scans `dist/**/*.html` and `src/**`. Everything else is public too and is not scanned: `tests/` (for example `facts.test.ts:84-90` comments name the storage), `scripts/`, `public/`, `README.md`, and `.claude/PRPs/**`. The scan of `dist` also misses the text outputs: `dist/llms*.txt` (today `llms-full.txt` has 8 vendor-term lines from the current storage page), `dist/sync/**` (the published contract), and the sitemaps. | Scan every text file in `dist` (`.html`, `.txt`, `.json`, `.xml`), plus `src/`, `tests/`, `scripts/`, `public/` and the README. For `.claude/PRPs/`, either scan new and changed files (diff against `origin/main`), or state that it is out of scope and covered by O8. Word-bound the class identifiers so that the plain word "standard" (as in "standard configuration") never matches. |
| 5 | MEDIUM | **The plan file itself carries internal references.** It is committed on the branch, not yet pushed. It contains the production manifest path with line numbers and a commit, the private product commit and tag SHAs, an internal plan file name with the evidence-retention decision label, and an internal runbook path. There are no vendor names, bucket names or private issue numbers in it (checked). | Replace them with neutral wording (for example "production configuration at the `v0.42.0` rollout, read 2026-11-01"). Amend or squash the plan commit before the first push, so the original text never reaches the public history. |
| 6 | MEDIUM | **Tier wording disagrees with the plan for the app's vendor-name removal work.** The app plan says this issue "uses the tier vocabulary in D1, so docs and app say the same words" (its Coordinates row and Q1). D6 here deliberately quotes no tier name. D6 is right under this repo's rule (only what is on the product's `main`), because the new names ship after these pages. But the two plans contradict each other. D6's own text also paraphrases the app's vendor-free availability labels ("requiere restauración, lista en horas") instead of quoting them ("Acceso inmediato", "Requiere restaurar, listo en horas"). | Quote the two availability labels verbatim. That app work does not rename them. Record in O4 that tier names follow once that app work is on the product's `main`, and ask the app side to correct its "coordinates" line. The deepest tier's "up to 12 hours" stays as a fact, not as a quoted label. |
| 7 | MEDIUM | **The new "storage not ready" state is missing.** At `v0.42.0` the synced contract adds `503 STORAGE_NOT_READY` (with `Retry-After: 60`) on two upload operations. The Storage tab shows "Su almacenamiento se está preparando. Las nuevas cargas empiezan cuando esté listo." The plan re-syncs that contract but adds neither the error to `ERROR_CODES` and the errors page nor the preparing state to the Storage page. | Add the error row (what happened and what to do: retry after the header), with a fact, in both locales. Add one sentence to the Storage page about the preparing state, with the quoted string. |
| 8 | MEDIUM | **The R7 sweep misses pages.** R7 is built from fixed-period phrases. `sending/documents` (both locales, around :59-60) states the period through `RETENTION_POLICY.retentionDays` without such a phrase and is not listed. Task 4 renames the fact with "all imports updated", which reads as a mechanical rename and would leave "Conservación de cada archivo: 365 días" as a universal statement. | Build the sweep list from every use of `RETENTION_POLICY.retentionDays`, `EVIDENCE.retentionDays` and `RETENTION_IMPLEMENTED` (18 Spanish pages today, plus their English twins), not from phrases. Rename without an alias so that every use is reviewed for meaning. |
| 9 | MEDIUM | **Validation commands.** Under zsh (this machine's shell) an unquoted `--include=*.html` fails with "no matches found". Quote it as `'*.html'`. Phrases split by tags or line wraps in the HTML escape the fixed-period grep. `echo "exit $?"` reports `grep -v`'s status, which is easy to misread. | Quote the globs. Also run the phrase grep on `src/content/docs` (excluding the generated legal mirror) or on tag-stripped HTML. State the expected output of every check. Add a check for `dist/llms*.txt`. |
| 10 | MEDIUM | **The live leak waits on pricing questions.** Today every page that uses a retention fact publishes its source in a `data-source` attribute, including a production storage name. The Risks table makes merge wait on O1-O3. | Ship D8 + Task 3 (no `data-source`, neutral sources) + Task 2 as a first PR that does not wait on the owner, or state that merge will not wait for O1-O3. History stays as O8 says. |
| 11 | LOW | **The standard configuration has a tier change.** The default moves files at 30 days to a cheaper tier that stays immediately available. The Storage tab's timeline shows that step. "Immediate access the whole time" is true, but a reader comparing it with the tab will see a step the page does not mention. | Add one sentence: "after 30 days files move to a cheaper tier that is still immediately available". Source it from the default policy setting. Do not name the tier. |
| 12 | LOW | **Fact-test wiring.** The "every fact cites a source" walk (`facts.test.ts:59-62`) must include `ORG_STORAGE` and `PRICING`. The pricing source is an owner decision, not a `file:line`, which CLAUDE.md §0 does not provide for. | Add both groups to the walk. Write the pricing exception into the plan (owner decision recorded in issue #14, dated). |
| 13 | LOW | **Terms translation details.** A faithful translation of Versión 5 renames the service, so the English title and description change too: today they say "bb-sign terms" (O7 does not apply to legal text). Hand-translated links must use `/en/` targets. The app's vendor-name removal work also makes a Versión 7 (absolute docs links), which means another re-sync and translation soon. Translating the terms is in scope: CLAUDE.md §3 requires the English twin, and the existing courtesy note ("The Spanish version prevails") covers it. | Update the English title and description. Note the coming Versión 7 re-sync in the report. Keep the owner's review of §3. |
| 14 | LOW | **Open item and naming.** R8 leaves "add the storage events to `AUDIT_EVENT_TYPES` only if org-visible" unresolved. Flux's PR title is "chore(docs): bump image", not "docs image". | Resolve the audit-event question in the plan before implementation. Fix the PR title. |

## Checklist

- [x] Every acceptance criterion in the issue maps to at least one task (AC1 Tasks 4, 6, 12; AC2 Tasks 1, 5, 7; AC3 Tasks 8, 10, 11 and Deploy 4; AC4 Tasks 2, 3; AC5 Validation and Deploy)
- [x] No task exceeds the issue's scope (the terms re-sync and translation are needed: pages stating per-organization periods next to mirrored Versión 4 terms would contradict them, and CLAUDE.md §3 requires the English twin)
- [ ] Research findings cite real `file:line`, and those lines say what the plan claims (all checked lines are correct; the "protected against early deletion" claim is not supported, finding 1; R7 is incomplete, finding 8)
- [ ] Validation commands are runnable (zsh glob quoting, tag-split phrases, no `llms*.txt` check; finding 9)
- [ ] Security-sensitive surfaces (auth, PII, uploads, quotas) called out and handled (public-repo leakage handling is incomplete; findings 2-5, 10)
- [x] Rollback is described and plausible (revert, then Flux's next image PR; the guides stay bb-docs pages once the app drops them)

## Round 2

Round 2: plan revised, awaiting re-review. The revision answers every round-1 finding; see "Change log (round 1 → revision 2)" at the end of the plan.

## Verdict (round 2)

REJECTED, because of one new HIGH finding. All fourteen round-1 findings are fixed in revision 2, and I re-checked
the new claims against the product at `v0.42.0`:

- D10 matches the product: only evidence gets a deletion lock, and the documents' storage is versioned with no default lock.
- The four organization-storage audit events exist and are recorded on the organization's chain.
- The English availability labels and the "preparing" string are quoted correctly.
- `STORAGE_NOT_READY` is on the two upload operations named.
- Flux's commit title is "chore(docs): bump image".

The leak check (A4) keeps exact names out of the repository. It covers every public source folder and every text
output, and its fixtures are placeholders. PR A ships the live leak fix first and waits on nothing. P1 is a clear
public-source rule. The owner answers are reflected in AC2, the pricing outline and B1.

The new problem is in the one output the plan never read: the synced contract. AC4 lists it, and the plan says A4
guards it, but A4 does not catch what is in it. This review also covers Phase A (PR A); no separate review file is
needed.

## Findings (round 2)

| # | Severity | Finding | Required change |
|---|---|---|---|
| R2-1 | HIGH | **The published contract still carries internal references and the old fixed rule.** At `v0.42.0` the contract's descriptions include two bare product issue references in parentheses (on the envelope archive-date field and on the signed-documents failure fields). It also states "Fixed 365-day retention", "past its 365 days" (twice) and "From day 90 ... may be in archive storage". The contract is synced verbatim into `src/content/sync/sign/`, published at `/sync/sign/openapi.json` and rendered into the `/sign/api/` reference pages. A4's issue patterns only match the `bb-sign#<n>` forms, so the bare form passes. The validation also excludes `dist/sign/api/` from the fixed-period check. As planned, AC4 ("the published contract") and AC1 (no fixed period) are false for the API reference, and that reference would contradict the new Storage page. | Ask the app side to rewrite those contract descriptions: no issue references, and the organization's period instead of a fixed 365 or 90 days. The natural place is the app's vendor-name removal work, which already touches public text. Then sync at that tag. Until that ships, record a dated, owner-approved exception that names the API reference, or hold PR B's sync. Add a bare-reference pattern to A4 for synced and built files (for example `\(#\d{2,}\)`, which does not match "PKCS#12"). Drop the `dist/sign/api/` exclusion from the fixed-period check, or justify it in the plan. |
| R2-2 | LOW | **R8 misses one pinned infrastructure source.** `facts.test.ts:235-237` asserts a production-manifest line reference in the rate-limit sources. The header of `sign-integrations.ts` defines the `prod` shorthand as an infrastructure path. A3 covers both in principle, but neither is listed, and A4 has no pattern for the `prod:<n>` shorthand. | Add both to R8. Add a `\bprod:\d` pattern to A4. |
| R2-3 | LOW | **Locale-dependent price check.** `grep -c 'COP.1,000'` relies on a UTF-8 locale, because the no-break space is two bytes. "Expect 1" also counts lines, not occurrences. | Use `LC_ALL=en_US.UTF-8` or `COP.\{1,2\}1,000`, and expect "1 or more". |
| R2-4 | LOW | **P1 reads AC4 narrowly.** The issue says "no ... code paths". P1 (and this plan) keep product code paths at a release tag in fact sources and PRP files. That is reasonable and consistent with CLAUDE.md, but it is an interpretation of the issue. | State in the PR A description that the owner accepts P1 as the reading of AC4 for fact sources. |

## Checklist (round 2)

- [x] Every acceptance criterion in the issue maps to at least one task
- [x] No task exceeds the issue's scope
- [x] Research findings cite real `file:line`, and those lines say what the plan claims (re-checked: audit events, en labels, preparing string, the evidence lock, the Flux title)
- [x] Validation commands are runnable (R2-3 is minor)
- [ ] Security-sensitive surfaces (auth, PII, uploads, quotas) called out and handled (public-content leakage: the contract is not handled, R2-1)
- [x] Rollback is described and plausible (revert B before A)

## Round 3

Round 3: plan revised, awaiting re-review. The revision answers every round-2 finding; see "Change log (round 2 → revision 3)" at the end of the plan.
