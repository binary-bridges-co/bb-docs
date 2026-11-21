# Domain docs

How the skills read and write this repository's domain documentation. It is a single context.

## Before exploring, read these

- **`GLOSSARY.md`** at the repository root, when it exists. It is created only when the first term is settled; until then, proceed without it and do not suggest creating it.
- **`docs/adr/`**, when it exists: the decision records that touch the area of the work.
- **`src/content/facts/`**: the fact sheets. Every claim about a product is read from there, with its source.
- **Product names** are fixed by the workspace: `../bb-context/docs/foundations/content-icons-marks.md`. The glossary does not redefine them.

There is no `GLOSSARY-MAP.md` and no per-context glossary.

## Decisions

Decision records go in `docs/adr/`, one file per decision (`0001-<slug>.md`), in the format `domain-modeling` gives. The folder is created with the first record. Offer one only when the decision is hard to reverse, surprising without its context, and the result of a real trade-off.

## Use the glossary's vocabulary

When the output names a concept (an issue title, a proposal, a test name), use the term as `GLOSSARY.md` defines it. If the concept is not in the glossary, either the word is not this project's (reconsider it) or there is a gap: settle the term with `/domain-modeling`, which then creates or updates `GLOSSARY.md`.

## Flag conflicts with a decision

If the output contradicts a recorded decision, say so instead of overriding it, and name the decision:

> Contradicts ADR-<number> (<what it decided>), but worth reopening because...
