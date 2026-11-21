# bb-docs — Agent Workflow

How work gets started, checked and finished in this repository. For how to build, run and test, see
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

The shared flow of the workspace (`../bb-context/AGENTS.md` §3), run with Matt Pocock's skills. A session
starts in `../bb-context` and works here from a worktree. Where this file is stricter or differs, this
file wins.

```
repositories → shaping → worktree → spec and tickets → implement → validate → iterate → review → pull request → merge and retro
```

| Step | Here |
|---|---|
| 1. Repositories | This repository, and the product whose facts change (§1) |
| 2. Shaping | A wayfinder map, research or grilling only when the task needs it; most tasks need none |
| 3. Worktree | `.claude/worktrees/<slug>` from `origin/main`, branch `docs/<slug>` or `feat/<slug>` |
| 4. Spec and tickets | The spec (`/to-spec`) and its tickets (`/to-tickets`) as GitHub issues, before any change. A small change is one issue. No plan file. This repository is public: nothing private goes into an issue |
| 5. Implement | Tests first where there is code (`/implement`, `tdd`); every fact sourced `file:line` in the fact sheet; both locales |
| 6. Validate | `npm run dev` or `npm run preview`: read the changed pages in both locales, in **both themes** and at **375px** |
| 7. Iterate | Until it reads right and `npm run verify` is green, with a test for every behaviour and every fix |
| 8. Review | `/code-review` against `origin/main`: the content rules of §3, and the spec |
| 9. Pull request | Opened from the worktree, CI green. The owner approves |
| 10. Merge and retro | After the approval: merge, remove the worktree and the branch, `/retro` |

`<slug>` is one kebab-case name reused for the worktree and the branch.

Decide and keep moving: design, wording and implementation calls are the agent's, recorded in the spec
or on the ticket. Ask the owner only what defines a product or cannot be undone.

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
- Nothing from a product's "not shipped" list (named in the spec of the work) is described as available.

## 4. Before opening a PR

```bash
npm run verify        # build (types, links, CSP), unit tests with coverage, Playwright
```

Then look at the changed pages in **both themes** and at **375px**. Tests are structural; they do
not catch a page that reads wrong.

## Agent skills

What Matt Pocock's skills need to know about this repository (written by `/setup-matt-pocock-skills`).

### Issue tracker

Issues, specs and tickets are GitHub issues of `binary-bridges-co/bb-docs`, through the `gh` CLI. The repository is public. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. `GLOSSARY.md` at the root, created when the first term is settled; decision records in `docs/adr/`, created with the first one. See `docs/agents/domain.md`.
