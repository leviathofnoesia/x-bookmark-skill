---
name: x-bookmark-skill
description: >
  Analyzes X (Twitter) bookmarks to infer user skills and expertise areas.
  Fetches bookmarked tweets via X API, extracts topics, clusters by similarity,
  scores expertise levels, and exports in Agent Compiler format.
  
  Use when: user wants to analyze their X bookmarks, asks about their expertise,
  wants skill export for agent systems, says "what do my X bookmarks say",
  "analyze my X bookmarks", "skill profile from X", "my X interests".
  
  This is a data tool for agents. It provides structured skill data from
  bookmarked tweets — no LLM calls.
---

# X Bookmark Skill Engine

Converts X bookmarks into a structured skill ontology. Uses X API to fetch
bookmarks, extracts topics from tweet text/hashtags/URLs, clusters by similarity,
and exports for Agent Compiler integration.

## Quick Start

```bash
# Set X API token (or use X_BEARER_TOKEN env var)
bun run x-bookmark-skill auth <your-bearer-token>

# Fetch bookmarks
bun run x-bookmark-skill import

# View skills
bun run x-bookmark-skill skills

# Export for Agent Compiler
bun run x-bookmark-skill export --format agent-compiler
```

## CLI Reference

### Import

```bash
bun run x-bookmark-skill import
  --count N         # Number of bookmarks (default: 100, max: 800)
  --force           # Ignore cache, re-fetch from X API
```

### Skills

```bash
bun run x-bookmark-skill skills
  --level Expert|Specialist|Practitioner|Novice  # Filter by level
  --sort score|count|recent                     # Sort order
  --limit N                                     # Max results (default: 20)
  --json                                        # JSON output
  --tree                                        # Tree view

bun run x-bookmark-skill skill <name-or-id>
  --evidence                                    # Include all evidence
  --json                                        # JSON output
```

### Analytics

```bash
bun run x-bookmark-skill analytics
  --json          # JSON output
```

Shows:
- Total bookmarks and skills
- Level breakdown
- Top skills by score
- Emerging skills (recent activity)
- Neglected skills (no recent activity)

### Export

```bash
bun run x-bookmark-skill export
  --format agent-compiler|json|telegram   # Output format
  --output skills.json                     # Output file
  --min-level Practitioner                 # Filter by minimum level
  --min-confidence 0.5                    # Filter by confidence
```

### Server

```bash
bun run x-bookmark-skill serve
  --port 3456          # Port (default: 3456)
```

## REST API

```
GET  /api/health                       Health check
GET  /api/skills                       List skills
     ?level=Expert                     Filter by level
     ?sort=score|count|recent          Sort order
     ?limit=20                         Max results
     ?offset=0                         Pagination
     
GET  /api/skills/:id                   Get skill details
GET  /api/analytics                    Analytics summary
GET  /api/export/agent-compiler        Agent Compiler format
POST /api/import                       Fetch & process bookmarks
     ?count=100                        Number of bookmarks
POST /api/refresh                      Re-process cached bookmarks
```

## Skill Levels

| Level        | Score Range | Meaning                              |
|--------------|-------------|--------------------------------------|
| Novice       | 0-25        | Few bookmarks, limited engagement    |
| Practitioner | 26-50       | Regular interest, multiple sources   |
| Specialist   | 51-75       | Deep collection, diverse sources     |
| Expert       | 76-100      | Extensive, recent, well-organized    |

## Scoring Factors

- **Bookmark count** (30%): More bookmarks = higher (log scale)
- **Recency** (25%): Recent bookmarks weighted higher (180-day half-life)
- **Author diversity** (20%): Multiple unique authors = higher
- **Source diversity** (20%): Multiple domains = higher
- **Recent bonus** (5%): Activity in last 30 days

## Agent Compiler Export

```json
{
  "version": "1.0",
  "source": "x-bookmark-skill",
  "bookmark_count": 847,
  "skill_count": 42,
  "skills": [
    {
      "skill": "Machine Learning",
      "level": "Specialist",
      "confidence": 0.72,
      "score": 58,
      "capability_tags": ["machine learning", "ml", "ai"],
      "evidence": [
        {
          "url": "https://x.com/...",
          "title": "tweet text...",
          "author": "username",
          "relevance": 0.9
        }
      ],
      "bookmark_count": 34,
      "authors": ["@person1", "@person2"],
      "domains": ["arxiv.org", "github.com"],
      "parent_skill": "ai",
      "child_skills": ["deep learning", "nlp"]
    }
  ]
}
```

## Authentication

The tool needs an X API bearer token. Options:

1. **Environment variable:**
   ```
   X_BEARER_TOKEN=your-token-here
   ```

2. **CLI command:**
   ```
   bun run x-bookmark-skill auth <your-token>
   ```
   Saves to `~/.config/env/global.env`

3. **Get token from:** https://developer.x.com/en/portal/dashboard

Required scopes: `tweet.read`, `users.read`, `bookmark.read`

## Data Files

```
x-bookmark-skill/data/
├── bookmarks.json     # Cached bookmarks (JSON)
└── skills.json        # Generated skills (JSON)
```

## For Agents

This tool provides **structured skill data** from X bookmarks:

1. **Import** bookmarks: `import --count 200`
2. **Query** skills: `skills --level Expert`
3. **Export** for agent: `export --format agent-compiler`
4. **Use** confidence scores and evidence for assessment

The tool does NOT:
- Make LLM calls
- Fetch external content beyond X API
- Make judgments about skill quality

Agents should interpret confidence scores and evidence links to make
their own assessments of user expertise.
