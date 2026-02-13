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

# Make executable (or install globally with `bun link`)
chmod +x bin/x-bookmark-skill

# Set X API token (or use X_BEARER_TOKEN env var)
x-bookmark-skill auth <your-bearer-token>

# Fetch bookmarks and generate skills
x-bookmark-skill import --count 200

# View skills
x-bookmark-skill skills

# Export for Agent Compiler
x-bookmark-skill export --format agent-compiler
```

Or run with bun:

```bash
bun run x-bookmark-skill import --count 200
bun run x-bookmark-skill skills
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

See `x-bookmark-skill help` for full options.

## Installation

### Local

```bash
bun install
chmod +x bin/x-bookmark-skill
```

### Global

```bash
bun link
x-bookmark-skill import --count 200
```

## REST API

```bash
x-bookmark-skill serve --port 3456
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
- **Bun** runtime

Get your token at: https://developer.x.com/en/portal/dashboard

## Documentation

- [SKILL.md](./SKILL.md) - Agent-facing documentation

## License

MIT
