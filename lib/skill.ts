/**
 * Skill scoring and tree building.
 * Converts clusters into skills with scores and levels.
 */

import type { Bookmark, TopicCluster } from "./cluster.js";

export type SkillLevel = "Novice" | "Practitioner" | "Specialist" | "Expert";

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  level: SkillLevel;
  score: number;
  confidence: number;
  evidenceQuality: number;  // Average quality of evidence (0-1)
  bookmarkCount: number;
  evidence: SkillEvidence[];
  parentSkillId?: string;
  childSkillIds: string[];
  relatedSkillIds: string[];
  capabilityTags: string[];
  topDomains: string[];
  topKeywords: string[];
  suggestedQueries: string[];  // Research-ready queries for x-research-skill
  authors: string[];
  dateRange: {
    earliest: number;
    latest: number;
  };
  // Phase 3: Research metadata
  lastResearched?: number;
  researchDiscovered?: string[];
  researchCount?: number;
  // Feature 3: Actionable content
  actionable?: {
    repos: ActionableItem[];
    tools: ActionableItem[];
    docs: ActionableItem[];
    posts: ActionableItem[];
    jobs: ActionableItem[];
  };
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ActionableItem {
  url: string;
  title: string;
  action: string;
  domain: string;
}

export interface SkillEvidence {
  bookmarkId: string;
  url: string;
  title: string;
  author: string;
  domain: string;
  addedAt: number;
  relevance: number;
  quality: number;  // Evidence quality score (0-1)
}

export interface SkillScore {
  score: number;
  level: SkillLevel;
  confidence: number;
}

/**
 * Build skills from clusters.
 */
export function buildSkills(
  clusters: TopicCluster[],
  bookmarks: Bookmark[]
): Skill[] {
  return clusters.map((cluster) => buildSkill(cluster, bookmarks));
}

/**
 * Build a single skill from a cluster.
 */
function buildSkill(cluster: TopicCluster, bookmarks: Bookmark[]): Skill {
  const clusterBookmarks = bookmarks.filter((b) =>
    cluster.bookmarkIds.includes(b.id)
  );
  
  const scoreResult = calculateSkillScore(cluster, clusterBookmarks);
  
  // Build evidence from bookmarks (with quality score)
  const evidence: SkillEvidence[] = clusterBookmarks.map((b) => {
    const topicSet = new Set(b.topics.all);
    const relevance = [...cluster.keywords].filter((k) => topicSet.has(k)).length /
      cluster.keywords.size;
    
    return {
      bookmarkId: b.id,
      url: b.tweet.tweet_url,
      title: b.tweet.text.slice(0, 200),
      author: b.tweet.username,
      domain: b.tweet.urls[0] ? new URL(b.tweet.urls[0]).hostname : "x.com",
      addedAt: b.savedAt,
      relevance,
      quality: 0.5,  // Will be calculated after all evidence is built
    };
  });
  
  // Calculate evidence quality (needs all authors/domains)
  const authorSet = new Set(evidence.map(e => e.author));
  const domainSet = new Set(evidence.map(e => e.domain));
  const evidenceQuality = calculateEvidenceQuality(evidence, [...authorSet], [...domainSet]);
  
  // Update individual evidence quality scores
  for (const e of evidence) {
    e.quality = calculateEvidenceItemQuality(e, authorSet, domainSet);
  }
  
  // Extract actionable content
  const actionable = extractActionable(evidence);
  
  // Sort evidence by relevance
  evidence.sort((a, b) => b.relevance - a.relevance);
  
  // Extract top domains and keywords
  const domainCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();
  
  for (const b of clusterBookmarks) {
    for (const d of b.topics.domains) {
      domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
    }
    for (const k of b.topics.keywords) {
      keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1);
    }
  }
  
  const topDomains = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([d]) => d);
  
  const topKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k]) => k);
  
  // Calculate date range
  const timestamps = clusterBookmarks.map((b) => b.savedAt);
  const dateRange = {
    earliest: Math.min(...timestamps),
    latest: Math.max(...timestamps),
  };
  
  // Generate capability tags from top keywords
  const capabilityTags = generateCapabilityTags(topKeywords);
  
  // Generate suggested queries for research (with dynamic year)
  const suggestedQueries = generateSuggestedQueries(topKeywords, cluster.name);
  
  // Build description
  const description = generateDescription(cluster.name, topKeywords, clusterBookmarks.length);
  
  return {
    id: cluster.id,
    name: cluster.name,
    slug: cluster.id,
    description,
    level: scoreResult.level,
    score: scoreResult.score,
    confidence: scoreResult.confidence,
    evidenceQuality,
    bookmarkCount: cluster.bookmarkIds.length,
    evidence: evidence.slice(0, 20),
    childSkillIds: [],
    relatedSkillIds: [],
    capabilityTags,
    topDomains,
    topKeywords,
    suggestedQueries,
    authors: [...cluster.authors],
    dateRange,
    actionable,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

/**
 * Calculate skill score based on multiple factors.
 */
function calculateSkillScore(cluster: TopicCluster, bookmarks: Bookmark[]): SkillScore {
  const count = bookmarks.length;
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const halfLifeMs = 180 * 24 * 60 * 60 * 1000; // 180 days
  
  // 1. Count score (log scale, max at 30)
  const countScore = Math.min(Math.log2(count + 1) / Math.log2(31), 1) * 30;
  
  // 2. Recency score (exponential decay)
  const latest = Math.max(...bookmarks.map((b) => b.savedAt));
  const recencyScore = latest
    ? Math.exp(-(now - latest) / halfLifeMs) * 25
    : 0;
  
  // 3. Author diversity (unique authors / total)
  const uniqueAuthors = cluster.authors.size;
  const authorDiversityScore = Math.min((uniqueAuthors / count) * 20, 20);
  
  // 4. Source diversity (unique domains / total)
  const uniqueDomains = cluster.domains.size;
  const domainDiversityScore = Math.min((uniqueDomains / count) * 20, 20);
  
  // 5. Recent activity bonus
  const recentCount = bookmarks.filter((b) => now - b.savedAt < thirtyDaysMs).length;
  const recentBonus = recentCount > 0 ? Math.min(recentCount / 5, 5) : 0;
  
  // Calculate final score
  const rawScore =
    countScore +
    recencyScore +
    authorDiversityScore +
    domainDiversityScore +
    recentBonus;
  
  const score = Math.round(rawScore * 10) / 10;
  
  // Determine level
  const level = scoreToLevel(score);
  
  // Calculate confidence
  const confidence = calculateConfidence(cluster, bookmarks);
  
  return { score, level, confidence };
}

/**
 * Map score to skill level.
 */
function scoreToLevel(score: number): SkillLevel {
  if (score >= 76) return "Expert";
  if (score >= 51) return "Specialist";
  if (score >= 26) return "Practitioner";
  return "Novice";
}

/**
 * Calculate confidence based on cluster quality.
 */
function calculateConfidence(cluster: TopicCluster, bookmarks: Bookmark[]): number {
  let confidence = 0.5; // Base
  
  // More bookmarks = higher confidence
  confidence += Math.min(bookmarks.length / 30, 0.2);
  
  // High cohesion = higher confidence
  confidence += cluster.cohesion * 0.2;
  
  // Multiple authors = higher confidence
  if (cluster.authors.size >= 3) confidence += 0.1;
  else if (cluster.authors.size === 1) confidence -= 0.1;
  
  // Multiple domains = higher confidence
  if (cluster.domains.size >= 3) confidence += 0.1;
  else if (cluster.domains.size === 1) confidence -= 0.05;
  
  return Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));
}

/**
 * Generate capability tags from keywords.
 */
function generateCapabilityTags(keywords: string[]): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  
  for (const kw of keywords) {
    // Add the keyword itself
    if (!seen.has(kw)) {
      tags.push(kw);
      seen.add(kw);
    }
    
    // Add related tags
    const related = KEYWORD_MAPPINGS[kw];
    if (related && !seen.has(related)) {
      tags.push(related);
      seen.add(related);
    }
  }
  
  return tags.slice(0, 10);
}

const KEYWORD_MAPPINGS: Record<string, string> = {
  "machine learning": "ml",
  "deep learning": "dl",
  "artificial intelligence": "ai",
  "natural language processing": "nlp",
  "large language model": "llm",
  "large language models": "llm",
  "cryptocurrency": "crypto",
  "defi": "defi",
  "web3": "web3",
  "blockchain": "blockchain",
  "javascript": "js",
  "typescript": "ts",
  "python": "py",
  "golang": "go",
  "react": "react",
  "nodejs": "node",
  "kubernetes": "k8s",
  "devops": "devops",
};

/**
 * Generate skill description.
 */
function generateDescription(
  name: string,
  keywords: string[],
  count: number
): string {
  const topKw = keywords.slice(0, 3).join(", ");
  return `${name} expertise inferred from ${count} bookmarked tweets. Key topics: ${topKw}`;
}

/**
 * Get current year for dynamic query generation.
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Generate research-ready suggested queries from keywords.
 * Uses dynamic year instead of hardcoded value.
 */
function generateSuggestedQueries(keywords: string[], name: string): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();
  const currentYear = getCurrentYear();
  
  // Take top 3 keywords as base queries
  const topKeywords = keywords.slice(0, 3);
  
  for (const kw of topKeywords) {
    // Basic keyword query
    if (!seen.has(kw)) {
      queries.push(kw);
      seen.add(kw);
    }
    
    // Add year-qualified query (current year context)
    const yearQuery = `${kw} ${currentYear}`;
    if (!seen.has(yearQuery)) {
      queries.push(yearQuery);
      seen.add(yearQuery);
    }
  }
  
  // Add a few compound queries from combinations
  if (topKeywords.length >= 2) {
    const compound1 = `${topKeywords[0]} ${topKeywords[1]}`;
    if (!seen.has(compound1)) {
      queries.push(compound1);
    }
  }
  
  // Add "best practices" query for the main skill area
  const bestPractices = `${name} best practices`;
  if (!seen.has(bestPractices)) {
    queries.push(bestPractices);
  }
  
  return queries.slice(0, 5);  // Max 5 queries
}

// ============ Feature 2: Evidence Quality ============

/**
 * Calculate quality score for a single evidence item.
 * Factors: engagement, author diversity, source domain, recency.
 */
function calculateEvidenceItemQuality(
  evidence: SkillEvidence,
  allAuthors: Set<string>,
  allDomains: Set<string>
): number {
  let quality = 0;
  
  // Engagement score (0-0.4): Based on title length as proxy for substance
  // Real engagement would need API calls - use title quality as proxy
  const titleLength = evidence.title.length;
  if (titleLength > 100) quality += 0.2;  // Detailed content
  else if (titleLength > 50) quality += 0.1;
  
  // Source domain credibility (0-0.3)
  const credibleDomains = ['github.com', 'arxiv.org', 'medium.com', 'dev.to', 
    'stackoverflow.com', 'docs.', 'documentation', 'blog.', 'news.', 'tech.', 'youtube.com'];
  const domain = evidence.domain.toLowerCase();
  if (credibleDomains.some(d => domain.includes(d))) {
    quality += 0.3;
  } else if (domain === 'x.com' || domain === 'twitter.com') {
    quality += 0.1;  // Social media - lower credibility
  } else {
    quality += 0.15;
  }
  
  // Author diversity contribution (0-0.2)
  if (allAuthors.size >= 3) quality += 0.2;
  else if (allAuthors.size >= 2) quality += 0.1;
  
  // Domain diversity (0-0.1)
  if (allDomains.size >= 3) quality += 0.1;
  
  return Math.min(quality, 1);
}

/**
 * Calculate overall evidence quality for a skill.
 */
function calculateEvidenceQuality(
  evidence: SkillEvidence[],
  authors: string[],
  domains: string[]
): number {
  if (evidence.length === 0) return 0;
  
  const authorSet = new Set(authors);
  const domainSet = new Set(domains);
  
  const totalQuality = evidence.reduce((sum, e) => 
    sum + calculateEvidenceItemQuality(e, authorSet, domainSet), 0
  );
  
  return Math.round((totalQuality / evidence.length) * 100) / 100;
}

// ============ Feature 3: Actionable Content ============

const ACTIONABLE_DOMAINS: Record<string, string> = {
  'github.com': 'repo',
  'gitlab.com': 'repo',
  'bitbucket.org': 'repo',
  'npmjs.com': 'package',
  'pypi.org': 'package',
  'crates.io': 'package',
  'hub.docker.com': 'docker',
  'docker': 'docker',
  'vercel.com': 'tool',
  'netlify.com': 'tool',
  'cloudflare.com': 'tool',
  'aws.amazon.com': 'tool',
  'cloud.google.com': 'tool',
  'azure.microsoft.com': 'tool',
  'heroku.com': 'tool',
  'linear.app': 'tool',
  'notion.so': 'tool',
  'figma.com': 'tool',
  'readme.io': 'docs',
  'gitbook.io': 'docs',
  'mkdocs.org': 'docs',
  'readthedocs.org': 'docs',
  'medium.com': 'post',
  'dev.to': 'post',
  'blog.': 'post',
  'news.': 'post',
  'substack.com': 'post',
  'youtube.com': 'video',
  'loom.com': 'video',
  'linkedin.com': 'post',
  'crunchbase.com': 'job',
  'remoteok.com': 'job',
  'weworkremotely.com': 'job',
  'jobs.': 'job',
  'careers.': 'job',
};

/**
 * Extract actionable items from evidence.
 */
function extractActionable(evidence: SkillEvidence[]): Skill['actionable'] {
  const actionable: Skill['actionable'] = {
    repos: [],
    tools: [],
    docs: [],
    posts: [],
    jobs: [],
  };
  
  const seen = new Set<string>();
  
  for (const e of evidence) {
    if (!e.url || seen.has(e.url)) continue;
    
    const urlLower = e.url.toLowerCase();
    let type: string = 'post';
    
    // Determine type
    for (const [domain, action] of Object.entries(ACTIONABLE_DOMAINS)) {
      if (urlLower.includes(domain)) {
        type = action;
        break;
      }
    }
    
    const item: ActionableItem = {
      url: e.url,
      title: e.title.slice(0, 100),
      action: getActionText(type),
      domain: e.domain,
    };
    
    switch (type) {
      case 'repo':
        actionable.repos.push(item);
        break;
      case 'package':
      case 'docker':
        actionable.tools.push(item);
        break;
      case 'docs':
        actionable.docs.push(item);
        break;
      case 'video':
      case 'post':
        actionable.posts.push(item);
        break;
      case 'job':
        actionable.jobs.push(item);
        break;
    }
    
    seen.add(e.url);
  }
  
  return actionable;
}

function getActionText(type: string): string {
  switch (type) {
    case 'repo': return 'clone/test';
    case 'package': return 'install/evaluate';
    case 'docker': return 'run/deploy';
    case 'tool': return 'evaluate/integrate';
    case 'docs': return 'read/learn';
    case 'post': return 'review/understand';
    case 'video': return 'watch/learn';
    case 'job': return 'apply/explore';
    default: return 'explore';
  }
}

/**
 * Generate research-ready suggested queries from keywords.
 * These queries can be fed directly to x-research-skill.
 */
function generateSuggestedQueries(keywords: string[], name: string): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();
  
  // Take top 3 keywords as base queries
  const topKeywords = keywords.slice(0, 3);
  
  for (const kw of topKeywords) {
    // Basic keyword query
    if (!seen.has(kw)) {
      queries.push(kw);
      seen.add(kw);
    }
    
    // Add year-qualified query (current year context)
    const yearQuery = `${kw} 2024`;
    if (!seen.has(yearQuery)) {
      queries.push(yearQuery);
      seen.add(yearQuery);
    }
  }
  
  // Add a few compound queries from combinations
  if (topKeywords.length >= 2) {
    const compound1 = `${topKeywords[0]} ${topKeywords[1]}`;
    if (!seen.has(compound1)) {
      queries.push(compound1);
    }
  }
  
  // Add "best practices" query for the main skill area
  const bestPractices = `${name} best practices`;
  if (!seen.has(bestPractices)) {
    queries.push(bestPractices);
  }
  
  return queries.slice(0, 5);  // Max 5 queries
}

/**
 * Build skill hierarchy (parent/child relationships).
 */
export function buildSkillHierarchy(skills: Skill[]): Skill[] {
  // Simple hierarchy based on keyword containment
  const keywordIndex = new Map<string, Skill[]>();
  
  // Index skills by their keywords
  for (const skill of skills) {
    for (const kw of skill.topKeywords) {
      if (!keywordIndex.has(kw)) {
        keywordIndex.set(kw, []);
      }
      keywordIndex.get(kw)!.push(skill);
    }
  }
  
  // Find parent-child relationships
  for (const skill of skills) {
    const parentKeywords = skill.topKeywords.slice(0, Math.ceil(skill.topKeywords.length / 2));
    
    for (const parentKw of parentKeywords) {
      const potentialParents = keywordIndex.get(parentKw) || [];
      
      for (const parent of potentialParents) {
        if (parent.id !== skill.id && parent.topKeywords.length > skill.topKeywords.length) {
          // Check if parent actually contains child's keywords
          const childKeywordsInParent = skill.topKeywords.filter((k) =>
            parent.topKeywords.includes(k)
          );
          
          if (childKeywordsInParent.length >= skill.topKeywords.length * 0.5) {
            skill.parentSkillId = parent.id;
            if (!parent.childSkillIds.includes(skill.id)) {
              parent.childSkillIds.push(skill.id);
            }
            break;
          }
        }
      }
      
      if (skill.parentSkillId) break;
    }
  }
  
  // Find related skills
  for (const skill of skills) {
    if (!skill.parentSkillId) {
      // Find siblings and related
      for (const other of skills) {
        if (other.id === skill.id) continue;
        if (other.parentSkillId === skill.parentSkillId) {
          skill.relatedSkillIds.push(other.id);
        }
      }
    }
  }
  
  return skills;
}

// ============ Feature 2: Skill Trends ============

export interface SkillTrend {
  skillId: string;
  skillName: string;
  previousCount: number;
  currentCount: number;
  change: number;
  status: "growing" | "declining" | "new" | "stale";
  lastActivity: number;
}

export interface SkillTrends {
  trends: SkillTrend[];
  previousImportDate: number | null;
  currentImportDate: number;
  summary: {
    growing: number;
    declining: number;
    new: number;
    stale: number;
  };
}

/**
 * Calculate skill trends by comparing current skills with import history.
 * Uses bookmarks metadata to determine growth/decline.
 */
export function calculateTrends(
  skills: Skill[],
  importHistory: { date: number; count: number; skillCount: number }[]
): SkillTrends {
  if (importHistory.length < 2) {
    return {
      trends: [],
      previousImportDate: null,
      currentImportDate: importHistory[0]?.date || Date.now(),
      summary: { growing: 0, declining: 0, new: 0, stale: 0 },
    };
  }

  const previousImport = importHistory[importHistory.length - 2];
  const currentImport = importHistory[importHistory.length - 1];
  
  // Get previous skill data from last import
  const previousSkillCount = previousImport?.skillCount || 0;
  const previousBookmarkCount = previousImport?.count || 0;
  
  // Determine if skills are stale (no activity in 30 days)
  const now = Date.now();
  const staleThreshold = 30 * 24 * 60 * 60 * 1000;
  
  const trends: SkillTrend[] = skills.map(skill => {
    // For now, estimate change based on overall growth
    // In a real implementation, we'd store per-skill history
    const growthRate = (currentImport.count - previousImport.count) / previousImport.count;
    const estimatedChange = Math.round(skill.bookmarkCount * growthRate);
    
    let status: SkillTrend["status"];
    if (skill.dateRange.latest > now - staleThreshold) {
      status = estimatedChange > 0 ? "growing" : "stable";
    } else {
      status = "stale";
    }
    
    return {
      skillId: skill.id,
      skillName: skill.name,
      previousCount: Math.round(skill.bookmarkCount / (1 + growthRate)),
      currentCount: skill.bookmarkCount,
      change: estimatedChange,
      status,
      lastActivity: skill.dateRange.latest,
    };
  });
  
  // Sort by change
  trends.sort((a, b) => b.change - a.change);
  
  return {
    trends,
    previousImportDate: previousImport?.date || null,
    currentImportDate: currentImport?.date || Date.now(),
    summary: {
      growing: trends.filter(t => t.status === "growing").length,
      declining: trends.filter(t => t.status === "declining").length,
      new: 0, // Would need skill tracking between imports
      stale: trends.filter(t => t.status === "stale").length,
    },
  };
}
