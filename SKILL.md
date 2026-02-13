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
scores expertise levels, and exports for Agent Compiler integration.

## Quick Start

```bash
# Set X API token (or use X_BEARER_TOKEN env var)
x-bookmark-skill auth <your-bearer-token>

# Fetch bookmarks
x-bookmark-skill import

# View skills
x-bookmark-skill skills

# Export for Agent Compiler
x-bookmark-skill export --format agent-compiler
```

## CLI Reference

### Import

```bash
x-bookmark-skill import
  --count N         # Number of bookmarks (default: 100, max: 800)
  --force           # Ignore cache, re-fetch from X API
  --quick           # Quick mode: max 100 bookmarks, cost display
  --quality         # Filter to bookmarks with 10+ likes
  --min-likes N    # Filter to bookmarks with N+ likes
```

### Skills

```bash
x-bookmark-skill skills
  --level Expert|Specialist|Practitioner|Novice  # Filter by level
  --sort score|count|recent                     # Sort order
  --limit N                                     # Max results (default: 20)
  --since 30d                                  # Skills active in last 30 days
  --new                                        # Recently emerged skills
  --json                                       # JSON output
  --tree                                       # Tree view

x-bookmark-skill skill <name-or-id>
  --evidence                                   # Include all evidence
  --json                                       # JSON output
```

### Deep Dive

Research a skill by searching X for more context:

```bash
x-bookmark-skill deep-dive <skill-name>
  --limit N         # Max results (default: 15)
  --quick           # Quick mode: 1 page, 1hr cache
  --quality         # Filter to 10+ likes
  --since 30d       # Search in last 30 days
  --save            # Save to ~/clawd/drafts/
  --json            # JSON output
```

### Skill Management

Customize and refine skills:

```bash
# Add custom tags
x-bookmark-skill skill tag <skill-id> <tag1> [tag2...]

# Ignore keyword in clustering
x-bookmark-skill skill ignore <keyword>

# Set custom name
x-bookmark-skill skill name <skill-id> <new-name>

# List all customizations
x-bookmark-skill skill list

# Clear all customizations
x-bookmark-skill skill clear
```

### Analytics

```bash
x-bookmark-skill analytics
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
x-bookmark-skill export
  --format agent-compiler|json|telegram   # Output format
  --output skills.json                     # Output file
  --min-level Practitioner                 # Filter by minimum level
  --min-confidence 0.5                    # Filter by confidence
```

### Cache

```bash
x-bookmark-skill cache clear    # Clear all cache
x-bookmark-skill cache prune    # Prune expired entries
```

### Server

```bash
x-bookmark-skill serve
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
GET  /api/analytics                     Analytics summary
GET  /api/export/agent-compiler        Agent Compiler format
POST /api/import                       Fetch & process bookmarks
     ?count=100                        Number of bookmarks
POST /api/refresh                       Re-process cached bookmarks
```

## Skill Levels

| Level        | Score Range | Meaning                              |
|--------------|-------------|--------------------------------------|
| Novice       | 0-25        | Few bookmarks, limited engagement    |
| Practitioner | 26-50       | Regular interest, multiple sources   |
| Specialist   | 51-75       | Deep collection, diverse sources      |
| Expert       | 76-100      | Extensive, recent, well-organized    |

## Scoring Factors

- **Bookmark count** (30%): More bookmarks = higher (log scale)
- **Recency** (25%): Recent bookmarks weighted higher (180-day half-life)
- **Author diversity** (20%): Multiple unique authors = higher
- **Source diversity** (20%): Multiple domains = higher
- **Recent bonus** (5%): Activity in last 30 days

## Cost Tracking

X API uses **pay-per-use pricing** (no subscriptions):

| Operation | Cost |
|-----------|------|
| Bookmark read | $0.005 per tweet |
| User lookup | $0.010 |
| Search | $0.50 per page |

The CLI displays estimated cost after each operation:
```
📊 3 API requests · est. cost ~$0.51
```

## Deep Dive Feature

The deep dive feature lets you research a specific skill by searching X for
recent tweets on that topic:

- Uses X Search API (recent tweets endpoint)
- Caches results (15 min default, 1hr in quick mode)
- Filters by engagement (likes) and time
- Can save results to markdown for later reference

Example:
```bash
# Search for recent ML tweets, save to drafts
x-bookmark-skill deep-dive "machine learning" --save --quality
```

## Skill Management

Customize how skills are generated and displayed:

### Custom Tags
Add descriptive tags to skills for better organization:
```bash
x-bookmark-skill skill tag ml-ai python,ml,ai
```

### Ignored Keywords
Exclude certain keywords from clustering:
```bash
x-bookmark-skill skill ignore tutorial
```

### Custom Names
Rename skills for clarity:
```bash
x-bookmark-skill skill name ml-ai "Machine Learning & AI"
```

### Customizations Storage
All customizations are stored in `data/skill-manager.json` and persist across
sessions.

## Time Filtering

Filter skills by activity time:

```bash
# Skills with bookmarks in last 30 days
x-bookmark-skill skills --since 30d

# Skills with bookmarks in last 7 days
x-bookmark-skill skills --since 7d

# Recently emerged skills (new in last 30 days)
x-bookmark-skill skills --new
```

## Quality Filtering

Filter bookmarks by engagement when importing:

```bash
# Only bookmarks with 10+ likes
x-bookmark-skill import --quality

# Only bookmarks with 50+ likes
x-bookmark-skill import --min-likes 50

# Combine with count
x-bookmark-skill import --count 200 --quality
```

## Agent Compiler Export

```json
{
  "version": "1.0",
  "exported_at": "2024-01-15T10:30:00.000Z",
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
          "domain": "arxiv.org",
          "relevance": 0.9
        }
      ],
      "bookmark_count": 34,
      "authors": ["@person1", "@person2"],
      "domains": ["arxiv.org", "github.com"],
      "parent_skill": "ai",
      "child_skills": ["deep learning", "nlp"],
      "related_skills": ["data science"],
      "keywords": ["machine learning", "deep learning", "neural networks"],
      "date_range": {
        "earliest": "2023-06-01T00:00:00.000Z",
        "latest": "2024-01-15T00:00:00.000Z"
      }
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
   x-bookmark-skill auth <your-token>
   ```
   Saves to `~/.config/env/global.env`

3. **Get token from:** https://developer.x.com/en/portal/dashboard

Required scopes: `tweet.read`, `users.read`, `bookmark.read`

## Data Files

```
x-bookmark-skill/data/
├── bookmarks.json        # Cached bookmarks (JSON)
├── skills.json           # Generated skills (JSON)
├── skill-manager.json    # Custom tags, ignored keywords, custom names
└── cache/               # API response cache
    └── *.json
```

## For Agents

This tool provides **structured skill data** from X bookmarks:

1. **Import** bookmarks: `import --count 200`
2. **Filter quality**: `import --quality` or `import --min-likes 50`
3. **Query** skills: `skills --level Expert`
4. **Deep dive**: `deep-dive "machine learning"` to research a skill
5. **Customize**: `skill tag`, `skill ignore`, `skill name`
6. **Export** for agent: `export --format agent-compiler`

The tool does NOT:
- Make LLM calls
- Fetch external content beyond X API
- Make judgments about skill quality

Agents should interpret confidence scores and evidence links to make
their own assessments of user expertise.

## Topic Extraction

The tool extracts topics from bookmarks using multiple signals:

1. **Hashtags** - Highest priority
2. **URL domains** - Second priority  
3. **Text keywords** - Extracted from tweet text with stopword filtering
4. **Topic aliases** - Expands abbreviations (ml → machine learning, etc.)

Keywords are normalized and mapped to canonical forms for consistent clustering.
