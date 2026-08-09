# Riftbound FAQ

Unofficial, independently maintained Riftbound card rulings and rules answers for players and judges, with examples and Core Rules citations.
The site also publishes current and historical Core Rules and Tournament Rules documents with explanations of the changes between versions.

[Visit Riftbound FAQ](https://www.riftboundfaq.com)

## Getting Started

### Prerequisites

- Node.js (see [`.nvmrc`](.nvmrc))
- pnpm (see `packageManager` in [`package.json`](package.json))

```bash
pnpm install
pnpm rules:generate
pnpm dev
```

The development server runs at <http://localhost:3000>. Environment configuration is optional for normal development; use [`.env.example`](.env.example) when local feedback events need to be sent to PostHog.

## Rules Data

The rules PDFs and [`sources/rules-manifest.json`](sources/rules-manifest.json) are authoritative. Run `pnpm rules:generate` after changing either one, and do not edit generated rules artifacts directly.

## Validation

Run `pnpm format` and `pnpm lint` for every change. Run `pnpm test` when behavior or tests change.

## Feedback and Contributions

Riftbound FAQ is authored, curated, and maintained by Christian Ivicevic. Unsolicited content and code contributions are not currently accepted.

Error reports and suggestions are welcome through [GitHub Issues](https://github.com/ChristianIvicevic/riftboundfaq/issues) or the feedback controls on each page. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution policy.

## License

- Code is available under the [MIT License](LICENSE-MIT).
- Content under `content/` is available under [CC BY-SA 4.0](LICENSE-CC-BY-SA-4.0).

## Legal Disclaimer

Riftbound and all related content are the intellectual property of Riot Games, Inc. This unofficial, independently maintained resource is not affiliated with or endorsed by Riot Games.

Created under Riot Games' [Legal Jibber Jabber](https://www.riotgames.com/en/legal) policy.
