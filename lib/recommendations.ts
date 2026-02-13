/**
 * Skill recommendations based on gaps and trends.
 * Uses X search to find trending topics and recommends learning paths.
 */

import * as api from "./api.js";
import type { Skill } from "./skill.js";

export interface Recommendation {
  topic: string;
  relevance: number;
  trendStrength: number; // 0-1 based on tweet volume
  learningCurve: "beginner" | "intermediate" | "advanced";
  basedOnSkill: string; // Which skill this leverages
  suggestedQuery: string;
  description: string;
}

export interface RecommendationsResult {
  recommendations: Recommendation[];
  basedOnSkills: string[];
  generatedAt: number;
}

/**
 * Get recommendations based on user's skills and current trends.
 */
export async function getRecommendations(
  skills: Skill[],
  limit: number = 5
): Promise<RecommendationsResult> {
  const recommendations: Recommendation[] = [];
  const skillKeywords = new Set(skills.flatMap(s => s.topKeywords.map(k => k.toLowerCase())));
  const basedOnSkills = skills.filter(s => s.level !== "Novice").slice(0, 3).map(s => s.name);
  
  // Search for trending topics related to user's skills
  for (const skill of skills.slice(0, 5)) {
    // Use suggested queries to find trending topics
    for (const query of skill.suggestedQueries?.slice(0, 2) || [skill.name]) {
      try {
        const tweets = await api.searchTweets(query, {
          maxResults: 20,
          quick: true,
          since: "7d",
        });
        
        if (tweets.length === 0) continue;
        
        // Calculate trend strength based on volume
        const trendStrength = Math.min(tweets.length / 50, 1);
        
        // Check if this is already in user's skills
        const isKnown = skillKeywords.has(query.toLowerCase()) || 
          skillKeywords.has(skill.name.toLowerCase());
        
        if (isKnown) continue;
        
        recommendations.push({
          topic: query,
          relevance: skill.confidence * trendStrength,
          trendStrength,
          learningCurve: estimateLearningCurve(query),
          basedOnSkill: skill.name,
          suggestedQuery: query,
          description: generateDescription(query, skill.name),
        });
      } catch {
        // Skip failed searches
      }
    }
  }
  
  // Sort by relevance and limit
  recommendations.sort((a, b) => b.relevance - a.relevance);
  
  return {
    recommendations: recommendations.slice(0, limit),
    basedOnSkills,
    generatedAt: Date.now(),
  };
}

/**
 * Estimate learning curve based on topic keywords.
 */
function estimateLearningCurve(topic: string): Recommendation["learningCurve"] {
  const lower = topic.toLowerCase();
  
  // Beginner topics
  if (lower.includes("tutorial") || lower.includes("intro") || lower.includes("basics") ||
      lower.includes("getting started") || lower.includes("beginner")) {
    return "beginner";
  }
  
  // Advanced topics
  if (lower.includes("architecture") || lower.includes("advanced") || lower.includes("optimization") ||
      lower.includes("performance") || lower.includes(" internals")) {
    return "advanced";
  }
  
  return "intermediate";
}

/**
 * Generate a description for the recommendation.
 */
function generateDescription(topic: string, basedOnSkill: string): string {
  return `Trending topic related to your ${basedOnSkill} expertise.`;
}
