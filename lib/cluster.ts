/**
 * Topic clustering for bookmarks.
 * Groups tweets by primary topic and merges related clusters.
 */

import type { Tweet } from "./api.js";
import { extractTopics, extractPrimaryTopic, type TopicExtraction } from "./keywords.js";

export interface Bookmark {
  id: string;
  tweet: Tweet;
  topics: TopicExtraction;
  primaryTopic: string;
  savedAt: number;
}

export interface TopicCluster {
  id: string;
  name: string;
  keywords: Set<string>;
  domains: Set<string>;
  authors: Set<string>;
  bookmarkIds: string[];
  tweetIds: string[];
  cohesion: number;
}

/**
 * Convert raw tweets to bookmarks with topic extraction.
 */
export function parseBookmarks(tweets: Tweet[]): Bookmark[] {
  return tweets.map((tweet) => {
    const topics = extractTopics(tweet);
    const primaryTopic = extractPrimaryTopic(topics);
    
    return {
      id: tweet.id,
      tweet,
      topics,
      primaryTopic,
      savedAt: new Date(tweet.created_at).getTime(),
    };
  });
}

/**
 * Cluster bookmarks by primary topic.
 * Merges small clusters into larger related ones.
 */
export function clusterByTopics(bookmarks: Bookmark[], minClusterSize: number = 3): TopicCluster[] {
  const clusters = new Map<string, TopicCluster>();
  
  // Group by primary topic
  for (const bookmark of bookmarks) {
    const topic = bookmark.primaryTopic;
    
    if (!clusters.has(topic)) {
      clusters.set(topic, {
        id: topic.toLowerCase().replace(/\s+/g, "-"),
        name: formatTopicName(topic),
        keywords: new Set(bookmark.topics.all),
        domains: new Set(bookmark.topics.domains),
        authors: new Set([bookmark.tweet.username]),
        bookmarkIds: [bookmark.id],
        tweetIds: [bookmark.id],
        cohesion: 0,
      });
    } else {
      const cluster = clusters.get(topic)!;
      cluster.bookmarkIds.push(bookmark.id);
      cluster.tweetIds.push(bookmark.id);
      cluster.authors.add(bookmark.tweet.username);
      
      for (const k of bookmark.topics.all) cluster.keywords.add(k);
      for (const d of bookmark.topics.domains) cluster.domains.add(d);
    }
  }
  
  // Filter by minimum size
  const filtered = Array.from(clusters.values()).filter(
    (c) => c.bookmarkIds.length >= minClusterSize
  );
  
  // Calculate cohesion (keyword overlap within cluster)
  for (const cluster of filtered) {
    cluster.cohesion = calculateCohesion(cluster, bookmarks);
  }
  
  // Sort by size
  return filtered.sort((a, b) => b.bookmarkIds.length - a.bookmarkIds.length);
}

/**
 * Calculate cluster cohesion based on keyword overlap.
 */
function calculateCohesion(cluster: TopicCluster, bookmarks: Bookmark[]): number {
  const clusterBookmarks = bookmarks.filter((b) =>
    cluster.bookmarkIds.includes(b.id)
  );
  
  if (clusterBookmarks.length < 2) return 0.5;
  
  let totalOverlap = 0;
  let pairs = 0;
  
  for (let i = 0; i < clusterBookmarks.length; i++) {
    for (let j = i + 1; j < clusterBookmarks.length; j++) {
      const topicsA = new Set(clusterBookmarks[i].topics.all);
      const topicsB = new Set(clusterBookmarks[j].topics.all);
      
      const intersection = [...topicsA].filter((x) => topicsB.has(x)).length;
      const union = new Set([...topicsA, ...topicsB]).size;
      
      totalOverlap += union > 0 ? intersection / union : 0;
      pairs++;
    }
  }
  
  return pairs > 0 ? totalOverlap / pairs : 0;
}

/**
 * Format topic name for display.
 */
function formatTopicName(topic: string): string {
  return topic
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Find related clusters that could be merged or linked.
 */
export function findRelatedClusters(
  clusters: TopicCluster[],
  similarityThreshold: number = 0.3
): Map<string, string[]> {
  const related = new Map<string, string[]>();
  
  for (const a of clusters) {
    const relatedIds: string[] = [];
    
    for (const b of clusters) {
      if (a.id === b.id) continue;
      
      const similarity = calculateClusterSimilarity(a, b);
      if (similarity >= similarityThreshold) {
        relatedIds.push(b.id);
      }
    }
    
    if (relatedIds.length > 0) {
      related.set(a.id, relatedIds);
    }
  }
  
  return related;
}

function calculateClusterSimilarity(a: TopicCluster, b: TopicCluster): number {
  // Keyword overlap
  const keywordIntersection = [...a.keywords].filter((k) => b.keywords.has(k));
  const keywordUnion = new Set([...a.keywords, ...b.keywords]).size;
  const keywordSimilarity = keywordUnion > 0 ? keywordIntersection.length / keywordUnion : 0;
  
  // Domain overlap
  const domainIntersection = [...a.domains].filter((d) => b.domains.has(d));
  const domainUnion = new Set([...a.domains, ...b.domains]).size;
  const domainSimilarity = domainUnion > 0 ? domainIntersection.length / domainUnion : 0;
  
  // Weighted average
  return keywordSimilarity * 0.7 + domainSimilarity * 0.3;
}

/**
 * Build hierarchical relationships between clusters.
 */
export function buildHierarchy(clusters: TopicCluster[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  
  // Simple hierarchy: clusters with shared keywords form groups
  const keywordGroups = new Map<string, string[]>();
  
  for (const cluster of clusters) {
    for (const keyword of cluster.keywords) {
      // Extract potential parent keywords (shorter versions)
      const parts = keyword.split(/\s+/);
      if (parts.length > 1) {
        const parent = parts[0];
        if (!keywordGroups.has(parent)) {
          keywordGroups.set(parent, []);
        }
        keywordGroups.get(parent)!.push(cluster.id);
      }
    }
  }
  
  // If a group has multiple clusters, mark them as related siblings
  for (const [parent, clusterIds] of keywordGroups) {
    if (clusterIds.length > 1) {
      for (const id of clusterIds) {
        if (!children.has(parent)) {
          children.set(parent, []);
        }
        children.get(parent)!.push(...clusterIds.filter((c) => c !== id));
      }
    }
  }
  
  return children;
}
