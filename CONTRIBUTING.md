# Contributing to Riftbound FAQ Wiki

Thank you for your interest in contributing to the Riftbound FAQ Wiki! This guide will help you understand how to contribute effectively.

## How to Contribute

### Reporting Issues

If you find errors, outdated information, or have suggestions:

1. Check existing [issues](https://github.com/ChristianIvicevic/riftboundfaq/issues) to avoid duplicates
2. Create a new issue with a clear description
3. Include relevant card names, sections, or page URLs

### Contributing Content

#### Types of Contributions Welcome

- **New FAQ entries**: Common questions about rules and card interactions
- **Card documentation**: Information about specific cards and mechanics
- **Keyword explanations**: Clear definitions of game mechanics
- **Examples and clarifications**: Help make existing content clearer
- **Typo and error fixes**: Grammar, spelling, and factual corrections

#### Before You Start

1. **Check for accuracy**: Ensure your contribution reflects the current game rules
2. **Avoid copyrighted content**: Do not copy text from official Riot sources verbatim
3. **Use your own words**: Explain rules and mechanics in your own phrasing
4. **Include sources when possible**: Reference official rulings or patch notes

### Contribution Workflow

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/riftboundfaq.git
   cd riftboundfaq
   ```

2. **Create a branch**
   ```bash
   git checkout -b add-weaponmaster-faq
   ```

3. **Make your changes**
   - Add or edit MDX files in the `/content` directory
   - Follow the existing file structure and naming conventions
   - Test your changes locally with `pnpm dev`

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add FAQ entry for Weaponmaster keyword interaction"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin add-weaponmaster-faq
   ```
   Then create a pull request on GitHub.

## Content Guidelines

### Writing Style

- **Be clear and concise**: Use simple language
- **Be accurate**: Double-check rules and interactions
- **Be helpful**: Anticipate follow-up questions
- **Stay neutral**: Avoid opinions about card balance or strategy (focus on rules)

### MDX File Format

All content files use MDX (Markdown with JSX support).

### File Organization

```
content/
├── origins/          # Origins card set
│   ├── cards/        # Individual card pages
│   └── keywords/     # Keyword mechanics
├── spiritforged/     # Spiritforged card set
│   ├── cards/
│   └── keywords/
└── meta.json         # Navigation structure
```

### Naming Conventions

- Use kebab-case for file names: `hidden-blade.mdx`, `weaponmaster.mdx`
- Match file names to card or keyword names (lowercased, hyphenated)
- Keep names descriptive and searchable

## License and Rights

### Your Contributions

By contributing to this project, you agree that:

1. **You grant a license**: Your contributions will be licensed under:
   - **MIT License** for code contributions
   - **CC BY-SA 4.0** for content contributions in `/content`

2. **You have the right to contribute**: You affirm that:
   - You created the content yourself, or
   - You have the necessary rights to contribute it
   - Your contribution does not violate any third-party rights

3. **Attribution**: Contributors will be credited via Git commit history

### Riot Games Intellectual Property

- **Do not copy**: Do not copy official Riot text verbatim
- **Paraphrase and explain**: Use your own words to explain game mechanics
- **Fair use**: Content should be factual, educational, and transformative
- **No assets**: Do not add game assets (images, artwork, etc.) without explicit permission

## Code Contributions

If you're contributing to the codebase (not just content):

### Development Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run linter
pnpm lint

# Run type checking
pnpm typecheck

# Format code
pnpm format
```

### Code Standards

- Follow existing code style (enforced by Biome)
- Write TypeScript with proper types
- Test your changes locally before submitting
- Keep commits focused and atomic

### Pull Request Guidelines

- **Clear title**: Describe what your PR does
- **Description**: Explain why the change is needed
- **Link issues**: Reference related issues with `Fixes #123`
- **One concern per PR**: Keep PRs focused on a single topic
- **Be responsive**: Address review feedback promptly

## Review Process

1. **Automated checks**: Your PR will run linting and type checks
2. **Maintainer review**: A maintainer will review your contribution
3. **Feedback**: You may be asked to make changes
4. **Merge**: Once approved, your PR will be merged

## Code of Conduct

- Be respectful and constructive
- Focus on the content and rules, not opinions
- Help create a welcoming community resource
- Assume good faith in all interactions

Thank you for helping make this resource better for the entire Riftbound community!
