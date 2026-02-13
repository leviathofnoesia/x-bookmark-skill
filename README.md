# x-bookmark-skill

> X (Twitter) bookmark-based skill analysis tool for AI agents

Analyzes your X bookmarks to infer skills and expertise areas. Fetches bookmarked tweets via the X API, extracts topics, clusters by similarity, scores expertise levels, and exports in Agent Compiler format.

Designed for AI coding agents (Claude Code, OpenClaw, etc.) to understand user expertise from their X bookmark collection.

## What it does

```
Your X Bookmarks → Topics → Skills → Agent-Ready Export
```

1. **Fetches** bookmarked tweets from X API
2. **Extracts** topics from tweet text, hashtags, and linked URLs
3. **Clusters** bookmarks by topic similarity
4. **Scores** expertise level based on count, recency, diversity
5. **Analyzes** evidence quality and actionable content
6. **Exports** structured skill data for AI agents

## Quick Start

```bash
# Clone and install
git clone https://github.com/leviathofnoesia/x-bookmark-skill.git
cd x-bookmark-skill
bun install

# Make executable
chmod +x bin/x-bookmark-skill

# Set X API token (or use X_BEARER_TOKEN env var)
x-bookmark-skill auth <your-bearer-token>

# Fetch bookmarks and generate skills
x-bookmark-skill import --count 200

# View skills
x-bookmark-skill skills

# Generate skill briefing with gap analysis
x-bookmark-skill brief "machine learning" --gaps

# Export for Agent Compiler
x-bookmark-skill export --format agent-compiler
```

## Key Features

### Skill Briefings
Generate comprehensive briefings combining your expertise with current developments:

```bash
x-bookmark-skill brief "machine learning"     # Single skill
x-bookmark-skill brief --all                  # All skills
x-bookmark-skill brief --level Expert         # Expert skills only
```

### Gap Analysis
Discover trending topics you're not engaging with:

```bash
x-bookmark-skill brief "machine learning" --gaps
```

Shows:
- Topics in your bookmarks
- Trending topics from X
- "Missing" list: trending but not in your bookmarks

### Evidence Quality
Each skill includes a quality score (0-1) based on:
- Source credibility (GitHub, arxiv.org → high)
- Author and domain diversity
- Content substance

| Tier | Score | Meaning |
|------|-------|---------|
| ⭐ High | 0.7-1.0 | Multiple credible sources |
| 📎 Medium | 0.4-0.7 | Mix of sources |
| ⚠️ Low | 0-0.4 | Limited variety |

### Actionable Content
Skills include URLs categorized for agent action:

| Type | Action |
|------|--------|
| 🐙 Repos | clone/test |
| 🛠️ Tools | install/evaluate |
| 📖 Docs | read/learn |
| 💼 Jobs | apply/explore |

### x-research-skill Integration
Complements [x-research-skill](https://github.com/rohunvora/x-research-skill) for complete workflow:

```
x-bookmark-skill → "You know ML (Expert)"
x-research-skill → "Latest ML developments"
Agent synthesizes → "You know ML. Latest: [findings]"
```

Each skill includes `suggested_queries` ready for x-research-skill.

## CLI Commands

| Command | Description |
|---------|-------------|
| `import [--count N]` | Fetch bookmarks from X API |
| `import --quick` | Quick mode (max 100, cost display) |
| `import --quality` | Filter to 10+ likes |
| `skills` | List all skills |
| `skill <name>` | Show skill details |
| `brief <skill>` | Generate skill briefing |
| `brief --gaps` | Include gap analysis |
| `deep-dive <skill>` | Search X for context |
| `analytics` | Show analytics summary |
| `export` | Export skills (agent-compiler/json/telegram) |
| `serve` | Start REST API server |

See `x-bookmark-skill help` for full options.

## Cost Tracking

X API uses **pay-per-use pricing** (no subscriptions):

| Operation | Cost |
|-----------|------|
| Bookmark read | $0.005 per tweet |
| Search | $0.50 per page |

The CLI displays estimated cost after each operation:
```text
📊 3 API requests · est. cost ~$0.51
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
      "score": 58,
      "evidence_quality": 0.75,
      "suggested_queries": ["machine learning", "machine learning 2024"],
      "actionable": {
        "repos": [{"url": "https://github.com/...", "action": "clone/test"}],
        "tools": [],
        "docs": [],
        "jobs": []
      },
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
