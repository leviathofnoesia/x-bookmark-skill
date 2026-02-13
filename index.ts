#!/usr/bin/env bun
/**
 * x-bookmark-skill — CLI for X bookmark-based skill analysis.
 * 
 * Commands:
 *   import [--count N]              Fetch bookmarks from X API
 *   skills [--level L] [--sort X]   List skills
 *   skill <name>                   Show skill details
 *   analytics                      Show analytics
 *   export [--format F] [--output]  Export skills
 *   serve [--port N]               Start REST API
 *   auth <token>                   Set X bearer token
 *   help                           Show help
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";

import * as api from "./lib/api.js";
import * as cluster from "./lib/cluster.js";
import * as skill from "./lib/skill.js";
import * as format from "./lib/format.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const BOOKMARKS_FILE = join(DATA_DIR, "bookmarks.json");
const SKILLS_FILE = join(DATA_DIR, "skills.json");

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// ============ CLI Parsing ============

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): boolean {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0) {
    args.splice(idx, 1);
    return true;
  }
  return false;
}

function getOpt(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) {
    const val = args[idx + 1];
    args.splice(idx, 2);
    return val;
  }
  return undefined;
}

// ============ Commands ============

async function cmdImport() {
  const count = Math.min(parseInt(getOpt("count") || "100"), 800);
  const force = getFlag("force");
  
  // Check cache
  if (!force && existsSync(BOOKMARKS_FILE)) {
    const cached = JSON.parse(readFileSync(BOOKMARKS_FILE, "utf-8"));
    if (cached.tweets && cached.tweets.length > 0) {
      console.error(`Using cached bookmarks (${cached.tweets.length}). Use --force to re-fetch.`);
      return cached.tweets;
    }
  }
  
  console.error(`Fetching ${count} bookmarks from X API...`);
  
  try {
    const tweets = await api.fetchBookmarks(count);
    
    // Cache
    const cacheData = {
      fetchedAt: Date.now(),
      count: tweets.length,
      tweets,
    };
    writeFileSync(BOOKMARKS_FILE, JSON.stringify(cacheData, null, 2));
    
    console.error(`Fetched ${tweets.length} bookmarks.`);
    return tweets;
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

async function cmdSkills() {
  const level = getOpt("level");
  const sort = getOpt("sort") || "score";
  const limit = parseInt(getOpt("limit") || "20");
  const jsonFlag = getFlag("json");
  const treeFlag = getFlag("tree");
  
  // Load or compute skills
  let skills = await getSkills();
  
  // Filter by level
  if (level) {
    skills = skills.filter((s) => s.level.toLowerCase() === level.toLowerCase());
  }
  
  // Sort
  if (sort === "count") {
    skills.sort((a, b) => b.bookmarkCount - a.bookmarkCount);
  } else if (sort === "recent") {
    skills.sort((a, b) => b.dateRange.latest - a.dateRange.latest);
  } else {
    skills.sort((a, b) => b.score - a.score);
  }
  
  // Limit
  skills = skills.slice(0, limit);
  
  // Output
  if (jsonFlag) {
    console.log(format.formatSkillsJson(skills));
  } else if (treeFlag) {
    console.log(format.formatSkillsTelegram(skills));
  } else {
    console.log(format.formatSkillsTelegram(skills));
  }
}

async function cmdSkill() {
  const nameOrId = args[1];
  if (!nameOrId) {
    console.error("Usage: x-bookmark-skill skill <name-or-id>");
    process.exit(1);
  }
  
  const jsonFlag = getFlag("json");
  const evidenceFlag = getFlag("evidence");
  
  const skills = await getSkills();
  const skillData = skills.find(
    (s) =>
      s.name.toLowerCase() === nameOrId.toLowerCase() ||
      s.id.toLowerCase() === nameOrId.toLowerCase() ||
      s.slug.toLowerCase() === nameOrId.toLowerCase()
  );
  
  if (!skillData) {
    console.error(`Skill not found: ${nameOrId}`);
    process.exit(1);
  }
  
  // Include full evidence if requested
  if (evidenceFlag) {
    // Already included
  }
  
  if (jsonFlag) {
    console.log(JSON.stringify(skillData, null, 2));
  } else {
    console.log(format.formatSkillDetail(skillData));
  }
}

async function cmdAnalytics() {
  const jsonFlag = getFlag("json");
  
  const skills = await getSkills();
  const bookmarks = await getBookmarks();
  const analytics = format.calculateAnalytics(skills, bookmarks.length);
  
  if (jsonFlag) {
    console.log(JSON.stringify(analytics, null, 2));
  } else {
    console.log(format.formatAnalytics(analytics));
  }
}

async function cmdExport() {
  const exportFormat = getOpt("format") || "json";
  const outputFile = getOpt("output");
  const minLevel = getOpt("min-level");
  const minConfidence = parseFloat(getOpt("min-confidence") || "0");
  
  let skills = await getSkills();
  const bookmarks = await getBookmarks();
  
  // Filters
  if (minLevel) {
    const levels: skill.SkillLevel[] = ["Novice", "Practitioner", "Specialist", "Expert"];
    const minIdx = levels.findIndex((l) => l.toLowerCase() === minLevel.toLowerCase());
    if (minIdx >= 0) {
      skills = skills.filter((s) => levels.indexOf(s.level) >= minIdx);
    }
  }
  
  skills = skills.filter((s) => s.confidence >= minConfidence);
  
  let output: string;
  
  if (exportFormat === "agent-compiler") {
    output = JSON.stringify(format.formatAgentCompiler(skills, bookmarks.length), null, 2);
  } else if (exportFormat === "json") {
    output = format.formatSkillsJson(skills);
  } else {
    output = format.formatSkillsTelegram(skills);
  }
  
  if (outputFile) {
    writeFileSync(outputFile, output);
    console.error(`Exported to ${outputFile}`);
  } else {
    console.log(output);
  }
}

function cmdAuth() {
  const token = args[1];
  if (!token) {
    console.error("Usage: x-bookmark-skill auth <bearer-token>");
    console.error("Or set X_BEARER_TOKEN environment variable.");
    process.exit(1);
  }
  
  // Save to global.env
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    console.error("Could not find home directory");
    process.exit(1);
  }
  
  const configDir = join(home, ".config", "env");
  
  try {
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    const envFile = join(configDir, "global.env");
    let content = "";
    
    if (existsSync(envFile)) {
      content = readFileSync(envFile, "utf-8");
      // Remove existing X_BEARER_TOKEN
      content = content.replace(/X_BEARER_TOKEN=.*\n?/g, "");
    }
    
    content += `X_BEARER_TOKEN=${token}\n`;
    writeFileSync(envFile, content);
    
    console.error(`Saved token to ${envFile}`);
  } catch (e: any) {
    console.error(`Error saving token: ${e.message}`);
    process.exit(1);
  }
}

async function cmdServe() {
  const port = parseInt(getOpt("port") || "3456");
  
  const app = express();
  app.use(express.json());
  
  // CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  
  // Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  app.get("/api/skills", async (req, res) => {
    try {
      const skills = await getSkills();
      const { level, sort, limit, offset } = req.query;
      
      let filtered = [...skills];
      
      if (level) {
        filtered = filtered.filter((s) => s.level.toLowerCase() === (level as string).toLowerCase());
      }
      
      if (sort === "count") {
        filtered.sort((a, b) => b.bookmarkCount - a.bookmarkCount);
      } else if (sort === "recent") {
        filtered.sort((a, b) => b.dateRange.latest - a.dateRange.latest);
      } else {
        filtered.sort((a, b) => b.score - a.score);
      }
      
      const offsetNum = parseInt(offset as string) || 0;
      const limitNum = parseInt(limit as string) || 20;
      
      res.json({
        total: filtered.length,
        skills: filtered.slice(offsetNum, offsetNum + limitNum),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get("/api/skills/:id", async (req, res) => {
    try {
      const skills = await getSkills();
      const skillData = skills.find((s) => s.id === req.params.id);
      
      if (!skillData) {
        return res.status(404).json({ error: "Skill not found" });
      }
      
      res.json(skillData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get("/api/analytics", async (req, res) => {
    try {
      const skills = await getSkills();
      const bookmarks = await getBookmarks();
      const analytics = format.calculateAnalytics(skills, bookmarks.length);
      res.json(analytics);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get("/api/export/agent-compiler", async (req, res) => {
    try {
      const skills = await getSkills();
      const bookmarks = await getBookmarks();
      const exportData = format.formatAgentCompiler(skills, bookmarks.length);
      res.json(exportData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.post("/api/import", async (req, res) => {
    try {
      const count = Math.min(parseInt(req.query.count as string) || 100, 800);
      const tweets = await api.fetchBookmarks(count);
      
      // Process into skills
      const bookmarks = cluster.parseBookmarks(tweets);
      const rawClusters = cluster.clusterByTopics(bookmarks);
      let skills = skill.buildSkills(rawClusters, bookmarks);
      skills = skill.buildSkillHierarchy(skills);
      
      // Cache
      writeFileSync(BOOKMARKS_FILE, JSON.stringify({
        fetchedAt: Date.now(),
        count: tweets.length,
        tweets,
      }, null, 2));
      
      writeFileSync(SKILLS_FILE, JSON.stringify({
        generatedAt: Date.now(),
        skills,
      }, null, 2));
      
      res.json({
        imported: tweets.length,
        skills: skills.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.post("/api/refresh", async (req, res) => {
    try {
      // Re-process existing bookmarks
      const bookmarks = await getBookmarks();
      const parsedBookmarks = cluster.parseBookmarks(bookmarks);
      const rawClusters = cluster.clusterByTopics(parsedBookmarks);
      let skills = skill.buildSkills(rawClusters, parsedBookmarks);
      skills = skill.buildSkillHierarchy(skills);
      
      writeFileSync(SKILLS_FILE, JSON.stringify({
        generatedAt: Date.now(),
        skills,
      }, null, 2));
      
      res.json({
        skills: skills.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  console.error(`Starting server on http://localhost:${port}`);
  app.listen(port);
}

// ============ Helpers ============

async function getBookmarks(): Promise<api.Tweet[]> {
  // Try cache first
  if (existsSync(BOOKMARKS_FILE)) {
    const data = JSON.parse(readFileSync(BOOKMARKS_FILE, "utf-8"));
    if (data.tweets) return data.tweets;
  }
  
  // Fetch fresh
  return api.fetchBookmarks(100);
}

async function getSkills(): Promise<skill.Skill[]> {
  // Try cache first
  if (existsSync(SKILLS_FILE)) {
    const data = JSON.parse(readFileSync(SKILLS_FILE, "utf-8"));
    if (data.skills) return data.skills;
  }
  
  // Process bookmarks
  const tweets = await getBookmarks();
  const bookmarks = cluster.parseBookmarks(tweets);
  const rawClusters = cluster.clusterByTopics(bookmarks);
  let skills = skill.buildSkills(rawClusters, bookmarks);
  skills = skill.buildSkillHierarchy(skills);
  
  // Cache
  writeFileSync(SKILLS_FILE, JSON.stringify({
    generatedAt: Date.now(),
    skills,
  }, null, 2));
  
  return skills;
}

function usage() {
  console.log(`x-bookmark-skill — X bookmark-based skill analysis

Commands:
  import [--count N]              Fetch bookmarks from X API (default: 100, max: 800)
    --force                       Ignore cache, re-fetch
  
  skills [--level L] [--sort X]   List skills (default: sort by score)
    --level Expert|Specialist|Practitioner|Novice
    --sort score|count|recent
    --limit N                     Max results (default: 20)
    --json                        JSON output
    --tree                        Tree view
  
  skill <name-or-id>              Show skill details
    --evidence                    Include all evidence
  
  analytics                       Show analytics summary
    --json                        JSON output
  
  export                          Export skills
    --format agent-compiler|json|telegram
    --output <file>               Output file (default: stdout)
    --min-level Practitioner      Filter by minimum level
    --min-confidence 0.5          Filter by confidence
  
  serve [--port N]                Start REST API (default: 3456)
  
  auth <token>                    Set X bearer token (or use X_BEARER_TOKEN env)
  
  help                            Show this help

Examples:
  bun run index.ts import --count 200
  bun run index.ts skills --level Expert --limit 10
  bun run index.ts analytics --json
  bun run index.ts export --format agent-compiler --output skills.json
  bun run index.ts serve --port 3456
`);
}

// ============ Main ============

async function main() {
  switch (command) {
    case "import":
      await cmdImport();
      break;
    case "skills":
    case "skill":
      if (command === "skills") {
        await cmdSkills();
      } else {
        await cmdSkill();
      }
      break;
    case "analytics":
      await cmdAnalytics();
      break;
    case "export":
      await cmdExport();
      break;
    case "serve":
      await cmdServe();
      break;
    case "auth":
      cmdAuth();
      break;
    case "help":
    case "--help":
    case "-h":
    default:
      usage();
  }
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
