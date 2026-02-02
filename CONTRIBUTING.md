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
- **Use your own words**: Do not copy official Riot sources verbatim
- **Include sources**: Reference official rulings or patch notes when possible

### Workflow

1. Fork and clone the repository
2. Create a branch: `git checkout -b add-card-faq`
3. Add or edit MDX files in `/content` following the structure below
4. Test locally: `pnpm dev`
5. Commit: `git commit -m "Add FAQ for card interaction"`
6. Push and create a pull request

### Content Structure

```
content/
├── general-rules/        # General game rules
├── sets/
│   ├── origins/
│   │   └── cards/        # Origins card set
│   └── spiritforged/
│       └── ...           # Spiritforged content
└── meta.json             # Navigation structure
```

### Naming Conventions

- Use kebab-case: `hidden-blade.mdx`, `weaponmaster.mdx`
- Match file names to card/keyword names (lowercase, hyphenated)

### Writing Style

- Use clear, simple language
- Double-check rules and interactions
- Stay neutral (focus on rules, not strategy)
- Anticipate follow-up questions

## Code Contributions

### Development Setup

```bash
pnpm install      # Install dependencies
pnpm dev          # Run development server
pnpm lint         # Run linter
pnpm types:check  # Run type checking
pnpm format       # Format code
```

### Standards

- Follow code style enforced by Oxfmt and Oxlint
- Write TypeScript with proper types
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
