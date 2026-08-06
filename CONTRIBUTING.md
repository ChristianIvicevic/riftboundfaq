# Contributing to Riftbound FAQ Wiki

Thank you for your interest in contributing! This guide covers both content and code contributions.

## Reporting Issues

Found an error or have a suggestion?

1. Check existing [issues](https://github.com/ChristianIvicevic/riftboundfaq/issues) to avoid duplicates
2. Create a new issue with a clear description
3. Include relevant card names, sections, or page URLs

## Content Contributions

### What You Can Contribute

- New FAQ entries about rules and card interactions
- Card documentation and keyword explanations
- Examples and clarifications
- Typo and error fixes

### Before You Start

- **Be accurate**: Ensure your contribution reflects current game rules
- **Explain in your own words**: Quote official card or rules text exactly only when the wording matters
- **Cite precisely**: Use `<Rule number="..." />` for the specific rules that support the ruling
- Use Node.js `24.18.0` and pnpm `11.17.0`, as pinned by `.nvmrc` and `package.json`

### Workflow

1. Fork and clone the repository
2. Create a branch: `git checkout -b add-card-faq`
3. Run `pnpm install` and `pnpm rules:generate`
4. Add or edit MDX files under `content/(rulings)` following the structure below
5. Run `pnpm format` and `pnpm lint`
6. Commit: `git commit -m "Add FAQ for card interaction"`
7. Push and create a pull request

### Content Structure

```
content/
├── (rulings)/
│   ├── cards/            # Per-card FAQ pages
│   ├── general-rules/    # Cross-cutting rules topics
│   ├── mechanics/        # Per-keyword/mechanic pages
│   └── meta.json         # Rulings navigation (directories auto-expand)
├── reference/            # Ignored generated Core and Tournament Rules references
└── meta.json             # Top-level navigation
```

Rule source documents live in `sources/`.
The PDFs are authoritative.
`pnpm rules:generate` creates ignored metadata and structured Core and Tournament Rules data under `src/generated/`, local text transcripts under `sources/`, and reference pages under `content/reference/`.
Reference prose and layout live in `templates/reference/`.
Do not hand-edit generated application data, reference pages, or transcripts, and never use parsed data under `src/generated/` as an editorial source.
For Core Rules citation authoring, consult the current generated transcript, currently `sources/CR-v1.4.txt`; use `sources/Tournament-Rules-2026-07-16.txt` only for tournament-policy questions.
Run `pnpm rules:inspect` to inspect all rules PDFs, or pass one or more PDF paths to inspect selected documents.

### Rules Sources

- Core Rules PDFs use `sources/CR-v1.x.pdf`; every version registered in `coreRules.versions` requires a matching PDF.
- Tournament Rules PDFs use `sources/Tournament-Rules-YYYY-MM-DD.pdf`, where the date is the normalized `Last Updated` header.
- `sources/rules-manifest.json` is the source of truth for registered and current versions.
- Fix extraction defects in `scripts/core-rules/` or `scripts/tournament-rules/`, then regenerate; never correct generated transcripts manually.

When adding a Tournament Rules snapshot:

1. Add the authoritative PDF and register its date in `tournamentRules.versions` and `tournamentRules.current`.
2. Run `pnpm rules:generate` and `pnpm rules:inspect sources/Tournament-Rules-YYYY-MM-DD.pdf`.
3. Inspect the generated transcript and PDF diagnostics, especially struck-through text and numbering defects.
4. Inspect the generated current page, previous snapshot, change page, navigation, and history.

The new current version is served by the generated `content/reference/tournament-rules/index.mdx`; the generator creates versioned pages only for archived versions.

### Naming Conventions

- Use kebab-case: `hidden-blade.mdx`, `weaponmaster.mdx`
- Derive file names from page titles, lowercase and hyphenated with punctuation removed: `Nocturne, Horrifying` becomes `nocturne-horrifying.mdx`
- New ruling files are included automatically by the directory globs in `content/(rulings)/meta.json`

### Frontmatter

New card pages should use the following house-style frontmatter, with `reviewedCoreRulesVersion` pinned to the explicit numeric `coreRules.current` value from `sources/rules-manifest.json`:

```yaml
---
title: "Card Name"
createdAt: "YYYY-MM-DD"
reviewedCoreRulesVersion: "1.4"
galleryLink: "https://playriftbound.com/en-us/card-gallery/#card-gallery--xxx-000-000"
authors:
- "Author Name"
---
```

`galleryLink` is optional but preferred for card pages.
Never use `"current"` for `reviewedCoreRulesVersion`.
The wiki page renderer automatically adds the review-status callout and resolves `<Rule />` links against this version, so do not add that callout manually.
Mechanic and general-rules ruling pages normally use the same fields except `galleryLink`; general-rules pages should also provide a useful `description`.
Generated reference pages instead use `rulesDocument` with either a Core Rules `1.x` version or Tournament Rules `YYYY-MM-DD` version, or `"current"` for either document family.

### Writing Style

- Phrase each H2 as a direct player question and add a concise explicit anchor: `## Does X trigger Y? [#trigger-timing]`
- Start with the direct answer, such as `Yes.` or `No.`, before explaining the rules
- Write one sentence per source line and keep related sentences together without blank lines
- Use clear, concise language and stay neutral: focus on rules, not strategy
- Lowercase generic game terms; preserve capitalization in exact quotations and named turn phases or steps
- Use MDX components such as `<Card />`, `<Rule />`, game-term badges, resource symbols, and `<Callout />` instead of recreating their formatting
- If the current Core Rules do not fully support a ruling, disclose the gap with a warning callout rather than overstating a citation
- Use `<Callout type="idea" title="Example">` for worked examples and `### Resolution Sequence [#topic-sequence]` with a numbered list for timing walkthroughs
- Printed keywords should use their registered components, including `<Flow />` or `<Flow value={n} />`; see `src/lib/mdx-vocabulary.ts` for the complete list

### Placing and Connecting Rulings

Place each FAQ question where players are most likely to look for that ruling:

| Question type | Canonical location |
|---|---|
| General procedure that works without card names | General-rules page |
| Behavior intrinsic to a keyword | Mechanic page |
| Outcome determined by one card's unique text | That card's page |
| Bespoke interaction requiring both cards | The page for the card whose instruction or ability is resolving |

Use this decision process:

1. Can the question be stated and answered without card names? If so, use a general-rules page.
2. Is the disputed behavior defined by a keyword or mechanic? If so, use that mechanic's page.
3. Which card supplies the instruction, condition, restriction, or replacement effect being interpreted? Use that card's page.
4. Is each other named card material to the ruling, or merely an interchangeable example?
5. Does a related explanation already exist? If so, link to it as supplementary context after making the local answer self-contained.

A card or mechanic is material when replacing it with another object performing the same operation could change the ruling.
Otherwise, it is an example and does not need reciprocal coverage.

Placement determines where the question belongs; it does not make supporting rules exclusive to that page.
Every FAQ answer must stand on its own.
State the result, explain the card-specific reasoning, and include the load-bearing `<Rule />` citations needed to verify it without following another link.
Keep resolution sequences on the page whose answer depends on that sequence.

Related pages may repeat rules reasoning when that repetition is necessary for a complete local answer.
Avoid duplicating an entire pair-specific ruling across multiple pages, but do not replace useful explanation or direct citations with an internal link merely to deduplicate prose.
Use links for additional context and discovery, with exact heading URLs such as `/general-rules/abilities#source-removal` rather than page-only links.
Do not create empty card pages or pair-specific pages solely for reciprocal discovery.
`<Card />` links to the official card gallery; using it does not declare an internal interaction.
Use `rulingRelations` in the page containing the related question to provide reverse discovery:

```yaml
rulingRelations:
  switcheroo-might-reduction:
  - "/cards/switcheroo"
```

Each key must be a bare kebab-case anchor resolving to a plain-text heading on that page.
Its value must be a non-empty list of unique, existing public page routes without anchors or route groups.
Do not include the declaring page itself or duplicate the relation on participant pages.
The heading supplies the displayed question, so do not duplicate it in frontmatter.
Generated related-ruling links then appear in both directions.
Adding a relation does not require shortening or otherwise rewriting the pages it connects.

## Code Contributions

### Development Setup

```bash
pnpm install        # Install dependencies
pnpm rules:generate # Generate ignored rules data, references, transcripts, and Fumadocs data
pnpm dev            # Run development server
pnpm format         # Format code
pnpm lint           # Run linter
pnpm test           # Run tests
pnpm rules:inspect  # Inspect Core and Tournament Rules PDF extraction
pnpm types:check    # CI/explicit use: generate MDX/route types and run TypeScript
pnpm build          # Generate rule data and build for production
```

### Standards

- Follow code style enforced by Oxfmt and Oxlint
- Write TypeScript with proper types
- Keep route-private components beside their route under `src/app/`, feature-owned code under `src/features/`, reusable presentation under `src/components/`, and shared infrastructure under `src/lib/`
- Do not hand-edit generated files under `src/generated/`
- Generated rules transcripts under `sources/` are intended for editorial reading but must not be hand-edited
- After changing a rules PDF, its extraction pipeline, or `sources/rules-manifest.json`, run `pnpm rules:generate` and inspect the affected PDF with `pnpm rules:inspect path/to/document.pdf`
- Test locally before submitting
- Keep commits focused and atomic

CI runs `pnpm rules:generate`, `pnpm format:check`, `pnpm lint:github`, `pnpm test`, `pnpm types:check`, and `pnpm build`.

### Pull Request Guidelines

- Use clear, descriptive titles
- Explain why the change is needed
- Reference related issues: `Fixes #123`
- Keep PRs focused on a single topic
- Address review feedback promptly

## License

By contributing, you agree that:

- **Code contributions** are licensed under MIT License
- **Content contributions** in `/content` are licensed under CC BY-SA 4.0
- You have the right to contribute your work
- Contributors are credited via Git commit history

## Code of Conduct

- Be respectful and constructive
- Focus on facts, not opinions
- Help create a welcoming community resource
- Assume good faith in all interactions

Thank you for helping make this resource better for the Riftbound community!
