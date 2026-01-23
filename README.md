# Riftbound FAQ

A community-driven wiki for the Riftbound Trading Card Game, built with Next.js and Fumadocs.
This resource helps judges and players quickly find answers about rules, card interactions, and gameplay scenarios.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Content**: MDX via Fumadocs
- **Styling**: Tailwind CSS 4
- **Type Safety**: TypeScript
- **Linting**: Biome

## Getting Started

### Prerequisites

- Node.js (see `.nvmrc`)
- pnpm

### Installation

```bash
pnpm install
pnpm dev        # Start development server at http://localhost:3000
pnpm build      # Build for production
pnpm start      # Run production server
```

### Available Scripts

```bash
pnpm lint         # Run Biome linter
pnpm format       # Format code with Biome
pnpm types:check  # Run TypeScript type checking
```

## Project Structure

```
riftboundfaq/
├── content/              # Wiki content (MDX files)
│   ├── general-rules/    # General game rules
│   ├── sets/
│   │   ├── origins/      # Origins card set
│   │   └── spiritforged/ # Spiritforged card set
│   └── meta.json         # Navigation structure
├── src/
│   └── ...               # Application source code
└── ...
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
