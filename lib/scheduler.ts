/**
 * Simple scheduling for periodic imports.
 * Stores schedule config and calculates next run times.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SCHEDULE_FILE = join(import.meta.dir, "..", "data", "schedule.json");

export type ScheduleFrequency = "daily" | "weekly";

export interface ScheduleConfig {
  enabled: boolean;
  frequency: ScheduleFrequency;
  nextRunAt: number;
  lastRunAt: number | null;
  createdAt: number;
}

/**
 * Get schedule configuration.
 */
export function getSchedule(): ScheduleConfig {
  try {
    if (existsSync(SCHEDULE_FILE)) {
      return JSON.parse(readFileSync(SCHEDULE_FILE, "utf-8"));
    }
  } catch {}
  return {
    enabled: false,
    frequency: "daily",
    nextRunAt: 0,
    lastRunAt: null,
    createdAt: 0,
  };
}

/**
 * Save schedule configuration.
 */
function saveSchedule(config: ScheduleConfig): void {
  const dataDir = join(import.meta.dir, "..", "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(SCHEDULE_FILE, JSON.stringify(config, null, 2));
}

/**
 * Calculate next run time based on frequency.
 */
function calculateNextRun(frequency: ScheduleFrequency, fromTime: number = Date.now()): number {
  const intervals: Record<ScheduleFrequency, number> = {
    daily: 24 * 60 * 60 * 1000,      // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000,  // 7 days
  };
  
  return fromTime + intervals[frequency];
}

/**
 * Set up a schedule.
 */
export function setSchedule(frequency: ScheduleFrequency): ScheduleConfig {
  const now = Date.now();
  const config: ScheduleConfig = {
    enabled: true,
    frequency,
    nextRunAt: calculateNextRun(frequency, now),
    lastRunAt: null,
    createdAt: now,
  };
  
  saveSchedule(config);
  return config;
}

/**
 * Check if it's time to run.
 */
export function shouldRun(): boolean {
  const config = getSchedule();
  if (!config.enabled) return false;
  return Date.now() >= config.nextRunAt;
}

/**
 * Record that a run happened and schedule next.
 */
export function recordRun(): void {
  const config = getSchedule();
  if (!config.enabled) return;
  
  const now = Date.now();
  config.lastRunAt = now;
  config.nextRunAt = calculateNextRun(config.frequency, now);
  saveSchedule(config);
}

/**
 * Cancel the schedule.
 */
export function cancelSchedule(): void {
  const config = getSchedule();
  config.enabled = false;
  saveSchedule(config);
}

/**
 * Get time until next run.
 */
export function getTimeUntilNextRun(): { ms: number; human: string } | null {
  const config = getSchedule();
  if (!config.enabled) return null;
  
  const ms = config.nextRunAt - Date.now();
  if (ms <= 0) return { ms: 0, human: "now" };
  
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  let human: string;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    human = `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    human = `${hours}h ${minutes}m`;
  } else {
    human = `${minutes}m`;
  }
  
  return { ms, human };
}
