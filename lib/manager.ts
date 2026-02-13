/**
 * Skill management storage.
 * Handles skill customizations: merges, splits, tags, ignored keywords.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const MANAGER_FILE = join(DATA_DIR, "skill-manager.json");

interface SkillManager {
  merges: Record<string, string[]>;      // merged skill ID -> [child skill IDs]
  splits: Record<string, string[]>;      // original skill ID -> [new skill IDs]
  customTags: Record<string, string[]>;  // skill ID -> custom tags
  ignoredKeywords: string[];              // keywords to ignore in clustering
  customNames: Record<string, string>;    // skill ID -> custom name
}

function getManagerPath(): string {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  return MANAGER_FILE;
}

function loadManager(): SkillManager {
  const path = getManagerPath();
  if (!existsSync(path)) {
    return {
      merges: {},
      splits: {},
      customTags: {},
      ignoredKeywords: [],
      customNames: {},
    };
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {
      merges: {},
      splits: {},
      customTags: {},
      ignoredKeywords: [],
      customNames: {},
    };
  }
}

function saveManager(manager: SkillManager): void {
  const path = getManagerPath();
  writeFileSync(path, JSON.stringify(manager, null, 2));
}

// Merge skills
export function mergeSkills(parentId: string, childIds: string[]): void {
  const m = loadManager();
  m.merges[parentId] = childIds;
  saveManager(m);
}

// Get merges
export function getMerges(): Record<string, string[]> {
  return loadManager().merges;
}

// Add custom tags to skill
export function addCustomTags(skillId: string, tags: string[]): void {
  const m = loadManager();
  const existing = m.customTags[skillId] || [];
  m.customTags[skillId] = [...new Set([...existing, ...tags])];
  saveManager(m);
}

// Get custom tags
export function getCustomTags(skillId: string): string[] {
  return loadManager().customTags[skillId] || [];
}

// Get all custom tags
export function getAllCustomTags(): Record<string, string[]> {
  return loadManager().customTags;
}

// Add ignored keyword
export function addIgnoredKeyword(keyword: string): void {
  const m = loadManager();
  if (!m.ignoredKeywords.includes(keyword)) {
    m.ignoredKeywords.push(keyword.toLowerCase());
    saveManager(m);
  }
}

// Remove ignored keyword
export function removeIgnoredKeyword(keyword: string): void {
  const m = loadManager();
  m.ignoredKeywords = m.ignoredKeywords.filter(k => k !== keyword.toLowerCase());
  saveManager(m);
}

// Get ignored keywords
export function getIgnoredKeywords(): string[] {
  return loadManager().ignoredKeywords;
}

// Set custom skill name
export function setCustomName(skillId: string, name: string): void {
  const m = loadManager();
  m.customNames[skillId] = name;
  saveManager(m);
}

// Get custom name
export function getCustomName(skillId: string): string | null {
  return loadManager().customNames[skillId] || null;
}

// Get all custom names
export function getAllCustomNames(): Record<string, string> {
  return loadManager().customNames;
}

// Clear all customizations
export function resetManager(): void {
  saveManager({
    merges: {},
    splits: {},
    customTags: {},
    ignoredKeywords: [],
    customNames: {},
  });
}
