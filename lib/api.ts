/**
 * X API client for fetching bookmarks and user info.
 * Adapted from x-research-skill pattern.
 * 
 * Cost tracking: X API uses pay-per-use pricing.
 * Bookmark read: $0.005 per request
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE = "https://api.x.com/2";
const RATE_DELAY_MS = 350;

// Cost tracking
export interface ApiUsage {
  requests: number;
  estimatedCost: number;
}

let usage: ApiUsage = { requests: 0, estimatedCost: 0 };

export function getUsage(): ApiUsage {
  return { ...usage };
}

export function resetUsage(): void {
  usage = { requests: 0, estimatedCost: 0 };
}

const COST_PER_BOOKMARK_READ = 0.005;
const COST_PER_USER_LOOKUP = 0.010;

function getToken(): string {
  // Try env first
  if (process.env.X_BEARER_TOKEN) return process.env.X_BEARER_TOKEN;

  // Try global.env
  try {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) throw new Error("No home directory");
    const envFile = readFileSync(join(home, ".config", "env", "global.env"), "utf-8");
    const match = envFile.match(/X_BEARER_TOKEN=["']?([^"'\n]+)/);
    if (match) return match[1];
  } catch {}

  throw new Error("X_BEARER_TOKEN not found in env or ~/.config/env/global.env");
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  username: string;
  name: string;
  created_at: string;
  conversation_id?: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    impressions: number;
    bookmarks: number;
  };
  urls: string[];
  hashtags: string[];
  mentions: string[];
  tweet_url: string;
}

interface RawResponse {
  data?: any[];
  includes?: { users?: any[] };
  meta?: { next_token?: string; previous_token?: string; result_count?: number };
  errors?: any[];
  detail?: string;
  status?: number;
}

function parseTweets(raw: RawResponse): Tweet[] {
  if (!raw.data) return [];
  
  const users: Record<string, any> = {};
  for (const u of raw.includes?.users || []) {
    users[u.id] = u;
  }

  return raw.data.map((t: any) => {
    const u = users[t.author_id] || {};
    const m = t.public_metrics || {};
    return {
      id: t.id,
      text: t.text,
      author_id: t.author_id,
      username: u.username || "?",
      name: u.name || "?",
      created_at: t.created_at,
      conversation_id: t.conversation_id,
      metrics: {
        likes: m.like_count || 0,
        retweets: m.retweet_count || 0,
        replies: m.reply_count || 0,
        quotes: m.quote_count || 0,
        impressions: m.impression_count || 0,
        bookmarks: m.bookmark_count || 0,
      },
      urls: (t.entities?.urls || [])
        .map((u: any) => u.expanded_url)
        .filter(Boolean),
      hashtags: (t.entities?.hashtags || [])
        .map((h: any) => h.tag)
        .filter(Boolean),
      mentions: (t.entities?.mentions || [])
        .map((m: any) => m.username)
        .filter(Boolean),
      tweet_url: `https://x.com/${u.username || "?"}/status/${t.id}`,
    };
  });
}

const TWEET_FIELDS = "tweet.fields=created_at,public_metrics,author_id,conversation_id,entities";
const USER_FIELDS = "user.fields=username,name,public_metrics";

async function apiGet(url: string, cost: number = 0): Promise<RawResponse> {
  usage.requests++;
  usage.estimatedCost += cost;
  
  const token = getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    const reset = res.headers.get("x-rate-limit-reset");
    const waitSec = reset
      ? Math.max(parseInt(reset) - Math.floor(Date.now() / 1000), 1)
      : 60;
    throw new Error(`Rate limited. Resets in ${waitSec}s`);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Get the authenticated user's ID.
 * Costs $0.010 per user lookup.
 */
export async function getCurrentUser(): Promise<{ id: string; username: string; name: string }> {
  const url = `${BASE}/2/users/me?${USER_FIELDS}`;
  const raw = await apiGet(url, COST_PER_USER_LOOKUP);
  
  if (!raw.data || Array.isArray(raw.data)) {
    throw new Error("Failed to get current user");
  }
  
  return {
    id: (raw.data as any).id,
    username: (raw.data as any).username,
    name: (raw.data as any).name,
  };
}

/**
 * Fetch bookmarks for the authenticated user.
 * @param count Number of bookmarks to fetch (max 100 per request)
 * @param maxId Pagination cursor
 */
export async function fetchBookmarks(count: number = 100, maxId?: string): Promise<Tweet[]> {
  // First get current user (costs $0.010)
  const user = await getCurrentUser();
  
  let allTweets: Tweet[] = [];
  let nextToken: string | undefined;
  let requests = 0;
  const maxRequests = Math.ceil(count / 100);
  
  while (requests < maxRequests) {
    const maxResults = Math.min(100, count - allTweets.length);
    const pagination = nextToken ? `&pagination_token=${nextToken}` : "";
    const maxIdParam = requests === 0 && maxId ? `&max_bookmark_id=${maxId}` : "";
    
    const url = `${BASE}/users/${user.id}/bookmarks?max_results=${maxResults}&${TWEET_FIELDS}&expansions=author_id&${USER_FIELDS}${pagination}${maxIdParam}`;
    
    // Each request reads up to maxResults tweets = maxResults * $0.005
    const requestCost = maxResults * COST_PER_BOOKMARK_READ;
    const raw = await apiGet(url, requestCost);
    const tweets = parseTweets(raw);
    allTweets.push(...tweets);
    
    nextToken = raw.meta?.next_token;
    if (!nextToken) break;
    
    requests++;
    if (requests < maxRequests) await sleep(RATE_DELAY_MS);
  }
  
  return allTweets;
}

/**
 * Fetch a single tweet by ID.
 */
export async function getTweet(tweetId: string): Promise<Tweet | null> {
  const url = `${BASE}/tweets/${tweetId}?${TWEET_FIELDS}&expansions=author_id&${USER_FIELDS}`;
  const raw = await apiGet(url);
  
  if (raw.data && !Array.isArray(raw.data)) {
    const parsed = parseTweets({ ...raw, data: [raw.data as any] });
    return parsed[0] || null;
  }
  return null;
}

/**
 * Extract domain from URL.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
