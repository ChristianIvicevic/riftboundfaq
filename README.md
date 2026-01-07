# Riftbound FAQ & Rules Wiki

A lightweight, community-driven wiki for the Riftbound Trading Card Game. This resource helps judges and players quickly find answers to frequently asked questions about rules, card interactions, and gameplay scenarios.

## Getting Started

### Prerequisites

- Node.js (see `.nvmrc` for version)
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Visit `http://localhost:3000` to see the wiki locally.

### Build

```bash
pnpm build
```

## Contributing

We welcome contributions from the community! Whether you want to:

- Add documentation for new cards or mechanics
- Fix errors or clarify existing content
- Improve the wiki's structure or usability

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## Project Structure

```
riftboundfaq/
├── content/           # Wiki content (MDX files)
│   ├── origins/       # Origins card set
│   ├── spiritforged/  # Spiritforged card set
│   └── ...
├── src/               # Application source code
└── ...
```

## License

This project uses a dual-license structure:

### Source Code (MIT License)

The source code and application framework are licensed under the [MIT License](LICENSE-MIT). This includes all TypeScript, React components, configuration files, and build scripts.

### Wiki Content (CC BY-SA 4.0)

All documentation and wiki content in the `/content` directory is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](LICENSE-CC-BY-SA-4.0). This means:

- You can freely share and adapt the content
- You must give appropriate credit
- Your contributions must use the same license
- Content remains freely available for everyone

## Legal Disclaimer

**Riftbound** and all related game content, including but not limited to card names, artwork, game mechanics, lore, and terminology, are the intellectual property of **Riot Games, Inc.**

This is an **unofficial, community-maintained** resource and is **not affiliated with, endorsed, sponsored, or specifically approved by Riot Games**.

This project was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.

For Riot Games' official legal policies, visit: https://www.riotgames.com/en/legal

## Tech Stack

- [React 19](https://react.dev/)
- [TanStack Start](https://tanstack.com/start)
- [Fumadocs](https://fumadocs.vercel.app/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vite](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## Maintainer

Created and maintained by [Christian Ivicevic](https://github.com/ChristianIvicevic) and the Riftbound community.

## Links

- [Report Issues](https://github.com/ChristianIvicevic/riftboundfaq/issues)
- [Riftbound Official](https://playriftbound.com/)
- [Riot Games Legal](https://www.riotgames.com/en/legal)
