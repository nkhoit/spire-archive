import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type StatRow = Record<string, string | number | null>;
export type MetricSummary = { n: number; mean: number; median: number; p10: number; p90: number } | null;
export type StatsPeriod = { id: string; runs: number };

export interface StatsSegment {
  runs: number;
  wins: number;
  win_rate: number;
  metrics: Record<string, { win: MetricSummary; loss: MetricSummary }>;
  deck_size_wins: [number, number][];
  survival: [number, number][];
  acts: StatRow[];
  encounters: StatRow[];
  cards: StatRow[];
  relics: StatRow[];
  potions: StatRow[];
  neow: StatRow[];
  killed_by: StatRow[];
}

export interface RunStats {
  meta: { generated_at: string; runs_read: number; runs_used: number; min_sample: number; periods: StatsPeriod[] };
  segments: Record<string, StatsSegment>;
}

type Segments = Record<string, StatsSegment>;

function statsFile() {
  return process.env.STATS_FILE ? path.resolve(process.env.STATS_FILE) : path.join(process.cwd(), 'data', 'sts1', 'stats.json');
}

export function hasStats(): boolean {
  return existsSync(statsFile());
}

// ponytail: cached until restart; the files only change when the aggregate script is re-run.
let cache: Promise<RunStats | null> | null = null;
const periodCache = new Map<string, Promise<Segments>>();

export function getStats(): Promise<RunStats | null> {
  cache ??= hasStats() ? fs.readFile(statsFile(), 'utf-8').then((raw) => JSON.parse(raw) as RunStats) : Promise.resolve(null);
  return cache;
}

/** Segments for 'all', a year ('2020') or a quarter ('2020-Q3') of game builds. */
export async function getPeriodSegments(period: string): Promise<Segments | null> {
  if (period === 'all') return (await getStats())?.segments ?? null;
  if (!/^\d{4}(-Q[1-4])?$/.test(period)) return null;

  const file = statsFile();
  const periodFile = path.join(path.dirname(file), `${path.basename(file, '.json')}-periods`, `${period}.json`);
  if (!existsSync(periodFile)) return null;
  let segments = periodCache.get(period);
  if (!segments) {
    segments = fs.readFile(periodFile, 'utf-8').then((raw) => JSON.parse(raw) as Segments);
    periodCache.set(period, segments);
  }
  return segments;
}
