/**
 * Topic extraction from tweets.
 * Extracts hashtags, URL domains, and keywords from text.
 */

import type { Tweet } from "./api.js";
import { extractDomain } from "./api.js";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "need",
  "this", "that", "these", "those", "it", "its", "how", "what", "when",
  "where", "who", "which", "why", "all", "each", "every", "both",
  "few", "more", "most", "other", "some", "such", "no", "not", "only",
  "own", "same", "so", "than", "too", "very", "just", "about", "into",
  "through", "during", "before", "after", "above", "below", "between",
  "under", "again", "further", "then", "once", "here", "there", "any",
  "http", "https", "www", "com", "org", "net", "io", "html", "htm",
  "rt", "via", "amp", "like", "new", "get", "got", "im", "dont",
  "youre", "theyre", "hes", "shes", "its", "thats", "whats", "heres",
  "theres", "wont", "cant", "didnt", "doesnt", "isnt", "arent", "wasnt",
  "werent", "hasnt", "havent", "hadnt", "shouldnt", "wouldnt", "couldnt",
  "let", "us", "go", "up", "out", "if", "else", "your", "my", "our",
  "their", "his", "her", "me", "him", "them", "we", "they", "he", "she",
  "i", "you", "one", "also", "back", "now", "only", "even", "still",
]);

const TOPIC_ALIASES: Record<string, string> = {
  "ml": "machine learning",
  "dl": "deep learning",
  "ai": "artificial intelligence",
  "llm": "large language model",
  "llms": "large language models",
  "nlp": "natural language processing",
  "cv": "computer vision",
  "rl": "reinforcement learning",
  "gan": "generative adversarial network",
  "gans": "generative adversarial networks",
  "rnns": "recurrent neural networks",
  "cnns": "convolutional neural networks",
  "transformers": "transformers",
  "api": "api",
  "apis": "apis",
  "sdk": "sdk",
  "sdks": "sdks",
  "cli": "cli",
  "css": "css",
  "html": "html",
  "http": "http",
  "url": "url",
  "json": "json",
  "xml": "xml",
  "sql": "sql",
  "nosql": "nosql",
  "devops": "devops",
  "ci": "ci cd",
  "cd": "ci cd",
  "crypto": "cryptocurrency",
  "defi": "defi",
  "nft": "nft",
  "web3": "web3",
  "blockchain": "blockchain",
  "btc": "bitcoin",
  "eth": "ethereum",
  "sol": "solana",
  "twitter": "twitter",
  "x": "x",
  "github": "github",
  "git": "git",
  "aws": "aws",
  "gcp": "gcp",
  "azure": "azure",
  "k8s": "kubernetes",
  "kubernetes": "kubernetes",
  "docker": "docker",
  "react": "react",
  "vue": "vue",
  "angular": "angular",
  "node": "nodejs",
  "js": "javascript",
  "ts": "typescript",
  "py": "python",
  "rust": "rust",
  "go": "golang",
  "golang": "golang",
  "swift": "swift",
  "kotlin": "kotlin",
  "java": "java",
};

export interface TopicExtraction {
  hashtags: string[];
  domains: string[];
  keywords: string[];
  all: string[];
}

export function extractTopics(tweet: Tweet): TopicExtraction {
  const hashtags = tweet.hashtags.map((h) => h.toLowerCase());
  
  const domains = tweet.urls
    .map((u) => extractDomain(u))
    .filter(Boolean)
    .filter((d) => !["x.com", "twitter.com", "t.co"].includes(d));
  
  const textKeywords = extractKeywords(tweet.text);
  
  const all = [...hashtags, ...domains, ...textKeywords];
  
  return {
    hashtags,
    domains,
    keywords: textKeywords,
    all: [...new Set(all)],
  };
}

function extractKeywords(text: string): string[] {
  // Remove URLs
  let cleaned = text.replace(/https?:\/\/[^\s]+/g, "");
  
  // Remove mentions
  cleaned = cleaned.replace(/@\w+/g, "");
  
  // Remove special chars but keep alphanumeric
  cleaned = cleaned.replace(/[^\w\s]/g, " ");
  
  const tokens = cleaned
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .filter((t) => !STOPWORDS.has(t));
  
  // Apply aliases and deduplicate
  const keywords: string[] = [];
  const seen = new Set<string>();
  
  for (const token of tokens) {
    // Check for aliases
    let expanded = TOPIC_ALIASES[token] || token;
    if (!seen.has(expanded)) {
      keywords.push(expanded);
      seen.add(expanded);
    }
  }
  
  return keywords;
}

export function extractPrimaryTopic(topics: TopicExtraction): string {
  // Priority: hashtags > domains > keywords
  if (topics.hashtags.length > 0) {
    return topics.hashtags[0];
  }
  if (topics.domains.length > 0) {
    return topics.domains[0];
  }
  if (topics.keywords.length > 0) {
    return topics.keywords[0];
  }
  return "uncategorized";
}
