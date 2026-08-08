# Riftbound FAQ

An independently maintained, open-source FAQ for the Riftbound Trading Card Game, built with Next.js and Fumadocs.
This resource helps judges and players quickly find answers about rules, card interactions, and gameplay scenarios.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Content**: MDX via Fumadocs
- **Styling**: Tailwind CSS 4
- **Type Safety**: TypeScript 6
- **Linting**: Oxlint
- **Formatting**: Oxfmt
- **Rules Extraction**: PDF.js

## Getting Started

### Prerequisites

- Node.js 24.18.0 (see `.nvmrc`)
- pnpm 11.17.0 (see `packageManager` in `package.json`)

### Installation

```bash
pnpm install
pnpm rules:generate      # Generate rules data, reference pages, and local transcripts
pnpm dev                 # Start development server at http://localhost:3000
```

`pnpm install` runs `fumadocs-mdx` to create the ignored `.source/` collection data, but it does not generate rules artifacts.
Run `pnpm rules:generate` after cloning and whenever rules PDFs or `sources/rules-manifest.json` change.
The command processes every manifest-listed PDF into ignored runtime data under `src/generated/`, generates reference pages under `content/reference/` from `templates/reference/`, writes local transcripts for named Core Rules versions and every Tournament Rules version under `sources/`, and refreshes Fumadocs collection data.

Environment configuration is optional for normal development.
Set `POSTHOG_API_KEY` in `.env.local` only when local feedback events should be sent to PostHog; see `.env.example`.

Use `pnpm build` followed by `pnpm start` to create and run a production build.

### Available Scripts

```bash
pnpm build              # Generate rule datasets and build for production
pnpm dev                # Start the development server
pnpm format             # Format files with Oxfmt
pnpm format:check       # Check formatting without changing files
pnpm lint               # Run Oxlint
pnpm lint:fix           # Run Oxlint and apply fixes
pnpm lint:github        # Run CI linting with warnings treated as errors
pnpm rules:generate     # Generate rules data, reference pages, transcripts, and Fumadocs data
pnpm rules:inspect      # Inspect all or selected rules PDFs; add -- --json for JSON output
pnpm start              # Run the production server
pnpm test               # Run the Vitest suite once
pnpm types:check        # Generate MDX/route types and run TypeScript checks
```

## Project Structure

```
riftboundfaq/
├── content/                    # Wiki content and navigation metadata
│   ├── (rulings)/              # Rulings route group
│   │   ├── cards/              # Per-card FAQ pages
│   │   ├── general-rules/      # Cross-cutting rules topics
│   │   └── mechanics/          # Per-keyword/mechanic pages
│   └── reference/              # Core and Tournament Rules references
├── public/                     # Static assets
├── scripts/                    # Unified rules commands and CR/TR extraction pipelines
│   ├── core-rules/             # Core Rules extraction and generation
│   └── tournament-rules/       # Tournament Rules extraction and generation
├── sources/                    # Authoritative PDFs, card text, manifest, and ignored transcripts
├── src/                        # Next.js application source
│   ├── app/                    # App Router routes, endpoints, and route-private UI
│   ├── components/             # Reusable UI and rules/MDX presentation
│   ├── features/               # Core Rules, Tournament Rules, and feedback features
│   ├── generated/              # Ignored rules metadata and runtime datasets
│   └── lib/                    # Content infrastructure, rules utilities, and site configuration
├── tests/                      # Node.js tests, currently for ruling relations
└── source.config.ts            # Fumadocs content schema and MDX configuration
```

## Validation

CI generates rules artifacts, checks formatting and linting, runs the Node.js tests and TypeScript checks, and creates a production build.
The local commands are listed above; `pnpm build` regenerates rules artifacts before invoking Next.js.

## Feedback and Development

The FAQ's content is independently authored and curated, and unsolicited content or code contributions are not currently accepted.
Error reports and suggestions are welcome through [GitHub Issues](https://github.com/ChristianIvicevic/riftboundfaq/issues) or the feedback controls on each page.
See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution policy.

## License

**Dual License Structure:**

- **Code**: MIT License ([LICENSE-MIT](LICENSE-MIT)) - All TypeScript, React components, and build scripts
- **Content**: CC BY-SA 4.0 ([LICENSE-CC-BY-SA-4.0](LICENSE-CC-BY-SA-4.0)) - All wiki content in `/content`

Content is freely shareable and adaptable with attribution.

## Legal Disclaimer

**Riftbound** and all related content are the intellectual property of **Riot Games, Inc.**

This is an **unofficial, independently maintained** resource, **not affiliated with or endorsed by Riot Games**.

Created under Riot Games' "Legal Jibber Jabber" policy.
For official policies, visit: https://www.riotgames.com/en/legal

## Maintainer

Created and maintained by [Christian Ivicevic](https://github.com/ChristianIvicevic).

**Links**: [Report Issues](https://github.com/ChristianIvicevic/riftboundfaq/issues) • [Official Riftbound](https://playriftbound.com/)
