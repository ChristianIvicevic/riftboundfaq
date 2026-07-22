# Riftbound FAQ

A community-driven wiki for the Riftbound Trading Card Game, built with Next.js and Fumadocs.
This resource helps judges and players quickly find answers about rules, card interactions, and gameplay scenarios.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Content**: MDX via Fumadocs
- **Styling**: Tailwind CSS 4
- **Type Safety**: TypeScript 6
- **Linting**: Oxlint
- **Formatting**: Oxfmt

## Getting Started

### Prerequisites

- Node.js 24.18.0 (see `.nvmrc`)
- pnpm 11.11.0 (see `packageManager` in `package.json`)

### Installation

```bash
pnpm install
pnpm rules:generate  # Generate rule datasets from sources
pnpm dev             # Start development server at http://localhost:3000
```

Use `pnpm build` followed by `pnpm start` to create and run a production build.

### Available Scripts

```bash
pnpm build          # Generate rule datasets and build for production
pnpm dev            # Start the development server
pnpm format         # Format files with Oxfmt
pnpm format:check   # Check formatting without changing files
pnpm lint           # Run Oxlint
pnpm lint:fix       # Run Oxlint and apply fixes
pnpm lint:github    # Run CI linting with warnings treated as errors
pnpm rules:generate # Generate rule datasets from sources
pnpm start          # Run the production server
pnpm test           # Run the Node.js test suite
pnpm types:check    # Generate MDX/route types and run TypeScript checks
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
├── scripts/                    # Rule parsers and dataset generator
├── sources/                    # Versioned rules text, card text, and manifest
├── src/                        # Next.js application source
│   ├── actions/                # Server actions
│   ├── app/                    # App Router routes and API endpoints
│   ├── components/             # React and MDX components
│   ├── generated/              # Generated rule datasets (not hand-edited)
│   ├── layouts/                # Shared page layouts
│   └── lib/                    # Shared utilities and configuration
└── tests/                      # Rule parser and semantic-diff tests
```

## Contributing

Contributions are welcome!
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Adding documentation for cards and mechanics
- Fixing errors or clarifying content
- Reporting issues

## License

**Dual License Structure:**

- **Code**: MIT License ([LICENSE-MIT](LICENSE-MIT)) - All TypeScript, React components, and build scripts
- **Content**: CC BY-SA 4.0 ([LICENSE-CC-BY-SA-4.0](LICENSE-CC-BY-SA-4.0)) - All wiki content in `/content`

Content is freely shareable and adaptable with attribution.

## Legal Disclaimer

**Riftbound** and all related content are the intellectual property of **Riot Games, Inc.**

This is an **unofficial, community-maintained** resource, **not affiliated with or endorsed by Riot Games**.

Created under Riot Games' "Legal Jibber Jabber" policy.
For official policies, visit: https://www.riotgames.com/en/legal

## Maintainer

Created and maintained by [Christian Ivicevic](https://github.com/ChristianIvicevic) and the Riftbound community.

**Links**: [Report Issues](https://github.com/ChristianIvicevic/riftboundfaq/issues) • [Official Riftbound](https://playriftbound.com/)
