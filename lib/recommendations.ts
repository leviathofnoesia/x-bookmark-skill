/**
 * Skill recommendations based on gaps and trends.
 * Uses X search to find trending topics and recommends learning paths.
 */

import * as api from "./api.js";
import type { Skill } from "./skill.js";

const MAX_RESULTS = 50;  // Match with trendStrength denominator

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
  limit: number = 5,
  skipConfirmation: boolean = false
): Promise<RecommendationsResult> {
  const recommendations: Recommendation[] = [];
  const skillKeywords = new Set(skills.flatMap(s => s.topKeywords.map(k => k.toLowerCase())));
  const basedOnSkills = skills.filter(s => s.level !== "Novice").slice(0, 3).map(s => s.name);
  
  // Calculate planned API calls for cost estimation
  const targetSkills = skills.slice(0, 5);
  let plannedCalls = 0;
  for (const skill of targetSkills) {
    plannedCalls += skill.suggestedQueries?.slice(0, 2).length || 1;
  }
  
  const costEstimate = plannedCalls * 0.50;  // $0.50 per search
  
  // Return cost info for CLI to handle confirmation
  if (!skipConfirmation) {
    return {
      recommendations: [],
      basedOnSkills,
      generatedAt: Date.now(),
    };
  }
  
  // Search for trending topics related to user's skills
  for (const skill of targetSkills) {
    // Use suggested queries to find trending topics
    for (const query of skill.suggestedQueries?.slice(0, 2) || [skill.name]) {
      try {
        const tweets = await api.searchTweets(query, {
          maxResults: MAX_RESULTS,
          quick: true,
          since: "7d",
        });
        
        if (tweets.length === 0) continue;
        
        // Calculate trend strength based on volume (aligned with MAX_RESULTS)
        const trendStrength = Math.min(tweets.length / MAX_RESULTS, 1);
        
        // Extract hashtags and keywords from tweets to check against known skills
        const tweetKeywords = new Set<string>();
        for (const t of tweets) {
          // Add hashtags
          for (const tag of t.hashtags || []) {
            tweetKeywords.add(tag.toLowerCase());
          }
          // Add significant words from text (simple extraction)
          const words = t.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          for (const w of words.slice(0, 10)) {
            if (/^[a-z0-9]+$/.test(w)) {
              tweetKeywords.add(w);
            }
          }
        }
        
        // Check if extracted keywords are already in user's skills
        const isKnown = [...tweetKeywords].some(kw => skillKeywords.has(kw));
        
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
 * Get cost estimate for recommendations (for CLI confirmation).
 */
export function estimateCost(skills: Skill[]): number {
  const targetSkills = skills.slice(0, 5);
  let plannedCalls = 0;
  for (const skill of targetSkills) {
    plannedCalls += skill.suggestedQueries?.slice(0, 2).length || 1;
  }
  return plannedCalls * 0.50;
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
