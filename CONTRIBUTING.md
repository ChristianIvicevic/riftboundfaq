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

### Workflow

1. Fork and clone the repository
2. Create a branch: `git checkout -b add-card-faq`
3. Add or edit MDX files under `content/(rulings)` following the structure below
4. Run `pnpm format`, `pnpm types:check`, and `pnpm lint`
5. Commit: `git commit -m "Add FAQ for card interaction"`
6. Push and create a pull request

### Content Structure

```
content/
├── (rulings)/
│   ├── cards/            # Per-card FAQ pages
│   ├── general-rules/    # Cross-cutting rules topics
│   ├── mechanics/        # Per-keyword/mechanic pages
│   └── meta.json         # Rulings navigation (directories auto-expand)
├── reference/            # Core and Tournament Rules references and histories
└── meta.json             # Top-level navigation
```

Rule source documents live in `sources/`.
`pnpm rules:generate` turns them into application datasets under `src/generated/rules/`; do not edit or cite those generated files directly.

### Naming Conventions

- Use kebab-case: `hidden-blade.mdx`, `weaponmaster.mdx`
- Derive file names from page titles, lowercase and hyphenated with punctuation removed: `Nocturne, Horrifying` becomes `nocturne-horrifying.mdx`
- New ruling files are included automatically by the directory globs in `content/(rulings)/meta.json`

### Frontmatter

Card pages should use the following frontmatter, with `crdVersion` set to `coreRules.current` from `sources/rules-manifest.json`:

```yaml
---
title: "Card Name"
createdAt: "YYYY-MM-DD"
crdVersion: "1.4"
galleryLink: "https://playriftbound.com/en-us/card-gallery/#card-gallery--xxx-000-000"
authors:
- "Author Name"
---
```

`galleryLink` is optional but preferred for card pages.
Mechanic and general-rules pages use the same fields except `galleryLink`.

### Writing Style

- Phrase each H2 as a direct player question and add a concise explicit anchor: `## Does X trigger Y? [#trigger-timing]`
- Start with the direct answer, such as `Yes.` or `No.`, before explaining the rules
- Write one sentence per source line and keep related sentences together without blank lines
- Use clear, concise language and stay neutral: focus on rules, not strategy
- Lowercase generic game terms; preserve capitalization in exact quotations and named turn phases or steps
- Use MDX components such as `<Card />`, `<Rule />`, keyword badges, resource symbols, and `<Callout />` instead of recreating their formatting
- If the current Core Rules do not fully support a ruling, disclose the gap with a warning callout rather than overstating a citation

### Placing Card Interactions

Give each rules explanation one canonical home at the most general level that fully answers the question:

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
5. Does a canonical explanation already exist? If so, link to it instead of repeating its reasoning.

A card is material when replacing it with another object performing the same operation could change the ruling.
Otherwise, it is an example and does not need reciprocal coverage.

Keep the full reasoning at the canonical location.
A card page may repeat a concise card-specific outcome when players are likely to search by that card, but it should link to the canonical explanation for the shared reasoning.
Use exact heading links such as `/general-rules/abilities#source-removal`, not page-only links.
Do not create empty card pages or pair-specific pages solely for reciprocal discovery.
`<Card />` links to the official card gallery; using it does not declare an internal interaction.
Use `rulingRelations` in the canonical page's frontmatter to provide reverse discovery without duplicated prose:

```yaml
rulingRelations:
- id: "gangplank-switcheroo"
  anchor: "switcheroo-interaction"
  question: "How does Gangplank's replacement effect interact with Switcheroo?"
  appliesTo:
  - "/cards/switcheroo"
```

The `id` must be globally unique, `anchor` must identify a heading on the canonical page, and `appliesTo` contains the public routes of other material pages.
Generated related-ruling links then appear in both directions.

## Code Contributions

### Development Setup

```bash
pnpm install      # Install dependencies
pnpm dev          # Run development server
pnpm format       # Format code
pnpm lint         # Run linter
pnpm test         # Run tests
pnpm types:check  # Validate MDX and run type checking
pnpm build        # Generate rule data and build for production
```

### Standards

- Follow code style enforced by Oxfmt and Oxlint
- Write TypeScript with proper types
- Do not hand-edit generated files under `src/generated/rules/`
- Run `pnpm rules:generate` after changing a rule source or `sources/rules-manifest.json`
- Test locally before submitting
- Keep commits focused and atomic

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
