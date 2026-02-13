/**
 * Output formatters for CLI and export.
 */

import type { Skill, SkillLevel } from "./skill.js";

function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatSkillTelegram(skill: Skill, index?: number): string {
  const prefix = index !== undefined ? `${index + 1}. ` : "";
  const level = levelEmoji(skill.level);
  
  let out = `${prefix}${level} ${skill.name}\n`;
  out += `   Score: ${skill.score} | ${skill.level} | ${skill.bookmarkCount} bookmarks\n`;
  out += `   Confidence: ${Math.round(skill.confidence * 100)}%\n`;
  
  if (skill.topKeywords.length > 0) {
    out += `   Topics: ${skill.topKeywords.slice(0, 5).join(", ")}\n`;
  }
  
  if (skill.suggestedQueries && skill.suggestedQueries.length > 0) {
    out += `   Research: ${skill.suggestedQueries.slice(0, 3).join(", ")}\n`;
  }
  
  if (skill.topDomains.length > 0) {
    out += `   Sources: ${skill.topDomains.slice(0, 3).join(", ")}`;
  }
  
  return out;
}

export function formatSkillsTelegram(skills: Skill[]): string {
  if (skills.length === 0) {
    return "No skills found. Import bookmarks first.";
  }
  
  let out = `🎯 Skill Profile (${skills.length} skills)\n\n`;
  
  // Group by level
  const byLevel: Record<SkillLevel, Skill[]> = {
    Expert: [],
    Specialist: [],
    Practitioner: [],
    Novice: [],
  };
  
  for (const skill of skills) {
    byLevel[skill.level].push(skill);
  }
  
  for (const level of ["Expert", "Specialist", "Practitioner", "Novice"] as SkillLevel[]) {
    const levelSkills = byLevel[level];
    if (levelSkills.length > 0) {
      out += `\n${levelEmoji(level)} ${level} (${levelSkills.length})\n`;
      for (let i = 0; i < Math.min(levelSkills.length, 5); i++) {
        out += formatSkillTelegram(levelSkills[i], i) + "\n";
      }
      if (levelSkills.length > 5) {
        out += `   ... and ${levelSkills.length - 5} more\n`;
      }
    }
  }
  
  return out;
}

export function formatSkillDetail(skill: Skill): string {
  let out = `📊 ${skill.name}\n`;
  out += `─`.repeat(40) + "\n";
  out += `Level: ${levelEmoji(skill.level)} ${skill.level}\n`;
  out += `Score: ${skill.score}\n`;
  out += `Confidence: ${Math.round(skill.confidence * 100)}%\n`;
  out += `Bookmarks: ${skill.bookmarkCount}\n`;
  out += `Authors: ${skill.authors.length}\n\n`;
  
  out += `Keywords:\n${skill.topKeywords.map((k) => `  • ${k}`).join("\n")}\n\n`;
  
  if (skill.topDomains.length > 0) {
    out += `Sources:\n${skill.topDomains.map((d) => `  • ${d}`).join("\n")}\n\n`;
  }
  
  if (skill.childSkillIds.length > 0) {
    out += `Sub-skills: ${skill.childSkillIds.join(", ")}\n\n`;
  }
  
  out += `Evidence (${Math.min(skill.evidence.length, 10)} of ${skill.evidence.length}):\n`;
  for (const e of skill.evidence.slice(0, 10)) {
    const text = e.title.slice(0, 60) + (e.title.length > 60 ? "..." : "");
    out += `  • @${e.author}: ${text}\n`;
  }
  
  return out;
}

function levelEmoji(level: SkillLevel): string {
  switch (level) {
    case "Expert": return "🧠";
    case "Specialist": return "💡";
    case "Practitioner": return "📚";
    case "Novice": return "🌱";
  }
}

// ============ JSON Formats ============

export interface AgentCompilerSkill {
  skill: string;
  level: SkillLevel;
  confidence: number;
  score: number;
  evidence_quality: number;  // Average evidence quality score (0-1)
  evidence: {
    url: string;
    title: string;
    author: string;
    domain: string;
    relevance: number;
    quality: number;
  }[];
  capability_tags: string[];
  keywords: string[];
  suggested_queries: string[];  // Research-ready queries for x-research-skill
  domain_categories: string[];
  parent_skill?: string;
  child_skills: string[];
  related_skills: string[];
  bookmark_count: number;
  authors: string[];
  domains: string[];
  date_range: {
    earliest: string;
    latest: string;
  };
  // Feature 3: Actionable content
  actionable?: {
    repos: { url: string; title: string; action: string; domain: string }[];
    tools: { url: string; title: string; action: string; domain: string }[];
    docs: { url: string; title: string; action: string; domain: string }[];
    posts: { url: string; title: string; action: string; domain: string }[];
    jobs: { url: string; title: string; action: string; domain: string }[];
  };
  // Phase 3: Research metadata
  last_researched?: string;
  research_discovered?: string[];
  research_count?: number;
}

export interface AgentCompilerExport {
  version: string;
  exported_at: string;
  source: string;
  bookmark_count: number;
  skill_count: number;
  skills: AgentCompilerSkill[];
}

export function formatAgentCompiler(skills: Skill[], bookmarkCount: number): AgentCompilerExport {
  return {
    version: "1.0",
    exported_at: new Date().toISOString(),
    source: "x-bookmark-skill",
    bookmark_count: bookmarkCount,
    skill_count: skills.length,
    skills: skills.map((skill) => ({
      skill: skill.name,
      level: skill.level,
      confidence: skill.confidence,
      score: skill.score,
      evidence_quality: skill.evidenceQuality,
      evidence: skill.evidence.map((e) => ({
        url: e.url,
        title: e.title,
        author: e.author,
        domain: e.domain,
        relevance: e.relevance,
        quality: e.quality,
      })),
      capability_tags: skill.capabilityTags,
      keywords: skill.topKeywords,
      suggested_queries: skill.suggestedQueries || [],
      domain_categories: [], // Could add domain classification
      parent_skill: skill.parentSkillId,
      child_skills: skill.childSkillIds,
      related_skills: skill.relatedSkillIds,
      bookmark_count: skill.bookmarkCount,
      authors: skill.authors,
      domains: skill.topDomains,
      date_range: {
        earliest: new Date(skill.dateRange.earliest).toISOString(),
        latest: new Date(skill.dateRange.latest).toISOString(),
      },
      // Feature 3: Actionable content
      actionable: skill.actionable,
      // Phase 3: Research metadata
      last_researched: skill.lastResearched ? new Date(skill.lastResearched).toISOString() : undefined,
      research_discovered: skill.researchDiscovered,
      research_count: skill.researchCount,
    })),
  };
}

export function formatSkillsJson(skills: Skill[]): string {
  return JSON.stringify(skills, null, 2);
}

// ============ Analytics ============

export interface SkillAnalytics {
  totalBookmarks: number;
  totalSkills: number;
  averageScore: number;
  levelBreakdown: Record<SkillLevel, number>;
  topSkills: Skill[];
  emergingSkills: Skill[];
  neglectedSkills: Skill[];
}

export function calculateAnalytics(skills: Skill[], bookmarkCount: number): SkillAnalytics {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  
  // Level breakdown
  const levelBreakdown: Record<SkillLevel, number> = {
    Expert: 0,
    Specialist: 0,
    Practitioner: 0,
    Novice: 0,
  };
  
  for (const skill of skills) {
    levelBreakdown[skill.level]++;
  }
  
  // Average score
  const avgScore = skills.length > 0
    ? skills.reduce((sum, s) => sum + s.score, 0) / skills.length
    : 0;
  
  // Top skills (by score)
  const topSkills = [...skills].sort((a, b) => b.score - a.score).slice(0, 10);
  
  // Emerging skills (recent activity)
  const emergingSkills = skills
    .filter((s) => s.dateRange.latest > thirtyDaysAgo && s.bookmarkCount >= 3)
    .sort((a, b) => b.dateRange.latest - a.dateRange.latest)
    .slice(0, 10);
  
  // Neglected skills (old, many bookmarks)
  const neglectedSkills = skills
    .filter((s) => s.dateRange.latest < ninetyDaysAgo && s.bookmarkCount >= 5)
    .sort((a, b) => a.dateRange.latest - b.dateRange.latest)
    .slice(0, 10);
  
  return {
    totalBookmarks: bookmarkCount,
    totalSkills: skills.length,
    averageScore: Math.round(avgScore * 10) / 10,
    levelBreakdown,
    topSkills,
    emergingSkills,
    neglectedSkills,
  };
}

export function formatAnalytics(analytics: SkillAnalytics): string {
  let out = `📈 Skill Analytics\n`;
  out += `═`.repeat(40) + "\n";
  out += `Total Bookmarks: ${analytics.totalBookmarks}\n`;
  out += `Total Skills: ${analytics.totalSkills}\n`;
  out += `Average Score: ${analytics.averageScore}\n\n`;
  
  out += `Level Breakdown:\n`;
  out += `  🧠 Expert: ${analytics.levelBreakdown.Expert}\n`;
  out += `  💡 Specialist: ${analytics.levelBreakdown.Specialist}\n`;
  out += `  📚 Practitioner: ${analytics.levelBreakdown.Practitioner}\n`;
  out += `  🌱 Novice: ${analytics.levelBreakdown.Novice}\n\n`;
  
  if (analytics.topSkills.length > 0) {
    out += `Top Skills:\n`;
    for (const skill of analytics.topSkills.slice(0, 5)) {
      out += `  • ${skill.name} (${skill.score})\n`;
    }
    out += "\n";
  }
  
  if (analytics.emergingSkills.length > 0) {
    out += `🔥 Emerging (recent activity):\n`;
    for (const skill of analytics.emergingSkills.slice(0, 5)) {
      out += `  • ${skill.name}\n`;
    }
    out += "\n";
  }
  
  if (analytics.neglectedSkills.length > 0) {
    out += `💤 Neglected (no recent activity):\n`;
    for (const skill of analytics.neglectedSkills.slice(0, 5)) {
      out += `  • ${skill.name}\n`;
    }
  }
  
  return out;
}
