# x-bookmark-skill

X (Twitter) bookmark-based skill analysis tool for AI agents.

## Quick Start

```bash
# Install dependencies
bun install

# Set X API token
bun run index.ts auth <your-bearer-token>

# Fetch bookmarks and generate skills
bun run index.ts import --count 200

# View skills
bun run index.ts skills

# Export for Agent Compiler
bun run index.ts export --format agent-compiler
```

## Requirements

- X API bearer token with `tweet.read`, `users.read`, `bookmark.read` scopes
- Bun runtime (or Node.js with modifications)

## Documentation

See [SKILL.md](./SKILL.md) for agent-facing documentation.
