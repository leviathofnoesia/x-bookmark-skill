# x-bookmark-skill

> X (Twitter) bookmark-based skill analysis tool for AI agents

Analyzes your X bookmarks to infer skills and expertise areas. Fetches bookmarked tweets via the X API, extracts topics, clusters by similarity, scores expertise levels, and exports in Agent Compiler format.

Designed for AI coding agents (Claude Code, OpenClaw, etc.) to understand user expertise from their X bookmark collection.

## What it does

```
Your X Bookmarks → Topics → Skills → Agent Compiler Export
```

1. **Fetches** bookmarked tweets from X API
2. **Extracts** topics from tweet text, hashtags, and linked URLs
3. **Clusters** bookmarks by topic similarity
4. **Scores** expertise level based on count, recency, diversity
5. **Exports** structured skill data for AI agents

## Quick Start

```bash
# Clone and install
git clone https://github.com/leviathofnoesia/x-bookmark-skill.git
cd x-bookmark-skill
bun install

# Set X API token (or use X_BEARER_TOKEN env var)
bun run index.ts auth <your-bearer-token>

# Fetch bookmarks and generate skills
bun run index.ts import --count 200

# View skills
bun run index.ts skills

# Export for Agent Compiler
bun run index.ts export --format agent-compiler
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `import [--count N]` | Fetch bookmarks from X API |
| `skills` | List all skills |
| `skill <name>` | Show skill details |
| `analytics` | Show analytics summary |
| `export` | Export skills (agent-compiler/json/telegram) |
| `serve` | Start REST API server |

See `bun run index.ts help` for full options.

## REST API

```bash
bun run index.ts serve --port 3456
```

```
GET  /api/skills              List skills
GET  /api/skills/:id          Get skill details  
GET  /api/analytics           Analytics
GET  /api/export/agent-compiler
POST /api/import              Fetch & process bookmarks
```

## Skill Levels

| Level | Score | Meaning |
|-------|-------|---------|
| Novice | 0-25 | Few bookmarks |
| Practitioner | 26-50 | Regular interest |
| Specialist | 51-75 | Deep collection |
| Expert | 76-100 | Extensive, recent |

## Agent Compiler Export

```json
{
  "version": "1.0",
  "source": "x-bookmark-skill",
  "skills": [
    {
      "skill": "Machine Learning",
      "level": "Specialist",
      "confidence": 0.72,
      "capability_tags": ["machine learning", "ml", "ai"],
      "evidence": [...],
      "bookmark_count": 34
    }
  ]
}
```

## Requirements

- **X API bearer token** with `tweet.read`, `users.read`, `bookmark.read` scopes
- **Bun** runtime (works with Node.js with minor tweaks)

Get your token at: https://developer.x.com/en/portal/dashboard

## Documentation

- [SKILL.md](./SKILL.md) - Agent-facing documentation
- [README.md](./README.md) - This file

## License

MIT
