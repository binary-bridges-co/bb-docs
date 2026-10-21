# bb-docs — Agent Workflow

How work gets started, gated and finished in this repository. For how to build, run and test, see
[README.md](README.md).

## 0. The two golden rules

**Never implement in the base checkout.** The primary worktree stays clean and on `main`. Every change
happens in its own git worktree under `.claude/worktrees/<slug>`, branched from freshly fetched
`origin/main`. Read-only exploration and worktree management are the only things allowed in the base
checkout.

**No fact without a source.** Every claim about a product (a limit, a default, a behaviour, a status)
is read in that product's repository and cited `file:line` in `src/content/facts/<product>.ts`. Only
what is on the product's `main` is documented as a feature. If you cannot point at the line, the
sentence does not ship.

## 1. Where the products live

| Product | Repository | What is canonical there |
|---|---|---|
| bb-sign | `../bb-sign` (`binary-bridges-co/bb-sign`) | the code, `docs/api/openapi.json`, `docs/api/webhook-signature-vectors.json`, the legal texts under `docs/legal/` and `docs/guias/` |
| infrastructure | `../bb-infrastructure` | what actually runs in production (buckets, lifecycle rules, domains) |
| the homepage | `../bb-homepage` | the design tokens, the container and pipeline patterns |

Local-only claims from a product's compose files or `@Profile("!prod")` defaults are not production
behaviour. Read `bb-infrastructure` before writing "in production".

## 2. Workflow

```
issue → validate → worktree → plan → review gate → implement → merge → remove worktree
```

| Step | Gate | Artifact |
|---|---|---|
| 1. Validate | Scope is unambiguous; out of scope stated | Restated brief |
| 2. Worktree | `.claude/worktrees/<slug>` from `origin/main` | Worktree + branch `docs/<slug>` or `feat/<slug>` |
| 3. Plan | Covers every acceptance criterion with `file:line` research | `.claude/PRPs/plans/<slug>.plan.md` |
| 4. Review | `status: APPROVED` by someone other than the author (a reviewer subagent is fine) | `.claude/PRPs/reviews/<slug>.review.md` |
| 5. Implement | `npm run verify` green; both locales; facts sourced | Code + `.claude/PRPs/reports/<slug>-report.md` |
| 6. Merge | Branch merged, worktree removed, plan moved to `plans/completed/` | — |

`<slug>` is one kebab-case name reused across all six steps.

## 3. Content rules (enforced by tests where possible)

- Both locales, key for key: a page under `src/content/docs/sign/` has its twin under `en/sign/`.
- Numbers come from the fact sheet, never typed in prose.
- No emojis, no typed arrows. Status is never colour alone. Brass means evidence.
- Error and troubleshooting rows say what happened **and** what to do.
- Legal texts are mirrored verbatim from the product repo with their version header. `npm run sync:sign`
  generates the Spanish pages (`src/content/docs/sign/legal/{terms,own-certificate-guide,retention-guide}.md`;
  never edit them) with three mechanical transforms only: drop the H1, move the version line into
  `legalVersion`, rewrite the in-app links. The English pages are faithful translations with the same
  version and clause numbering. No `<Fact>` inside legal text. Do not improve legal wording here; change it
  at the source.
- Nothing from a product's "not shipped" list (see the current plan) is described as available.

## 4. Before opening a PR

```bash
npm run verify        # build (types, links, CSP), unit tests with coverage, Playwright
```

Then look at the changed pages in **both themes** and at **375px**. Tests are structural; they do
not catch a page that reads wrong.
