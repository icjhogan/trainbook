import type { Workout } from "./types";
import { calculateRunningVolume, getWeekKey, isValidDateIso } from "./workout-utils";

// Workout types that are planning/reference entries, not training sessions. The dashboard
// excludes these from session counts and event coverage (but NOT from running volume).
// Keep in sync with app/(app)/dashboard/dashboard-client.tsx — this module is the shared
// source of truth so the chat assistant and the dashboard can never disagree.
export const NON_PRACTICE_TYPES = [
  "Season Schedule",
  "Weekly Plan",
  "Goals",
  "Reflection",
  "Competition Cues",
];

export function isPractice(w: Pick<Workout, "workout_type">): boolean {
  return !NON_PRACTICE_TYPES.includes(w.workout_type);
}

/** Inclusive YYYY-MM-DD date range. Omitted bound = open on that side. */
export interface DateRange {
  from?: string;
  to?: string;
}

export interface MetricFilter {
  range?: DateRange;
  /** Restrict to workouts whose event_focus includes this event (case-insensitive). */
  event?: string;
  /** Restrict to a specific workout_type. */
  type?: string;
  /** Exclude planning/reference entries (default true for counts/coverage). */
  practiceOnly?: boolean;
}

/** A source session a number was computed from — the basis for a tap-to-open citation. */
export interface MetricCitation {
  id: string;
  date: string;
  date_iso: string;
}

function citation(w: Workout): MetricCitation {
  return { id: w.id, date: w.date, date_iso: w.date_iso };
}

function inRange(dateIso: string, range?: DateRange): boolean {
  if (!range) return true;
  if (!isValidDateIso(dateIso)) return false;
  if (range.from && dateIso < range.from) return false;
  if (range.to && dateIso > range.to) return false;
  return true;
}

/** Apply the structured filters. Lexicographic date comparison is valid for YYYY-MM-DD. */
export function filterWorkouts(workouts: Workout[], filter: MetricFilter = {}): Workout[] {
  const ev = filter.event?.toLowerCase().trim();
  return workouts.filter((w) => {
    if (filter.practiceOnly && !isPractice(w)) return false;
    if (filter.type && w.workout_type !== filter.type) return false;
    if (ev && !(w.event_focus || []).some((e) => e.toLowerCase() === ev)) return false;
    if (!inRange(w.date_iso, filter.range)) return false;
    return true;
  });
}

export interface VolumeResult {
  meters: number;
  sessionCount: number;
  citations: MetricCitation[];
}

// Total running volume (meters). Matches the dashboard: counts ALL matching workouts
// (not practice-only) and skips combo distances ("400m + 200m") via calculateRunningVolume.
export function totalVolume(workouts: Workout[], filter: MetricFilter = {}): VolumeResult {
  const rows = filterWorkouts(workouts, filter);
  let meters = 0;
  const citations: MetricCitation[] = [];
  for (const w of rows) {
    const vol = calculateRunningVolume(w.exercises || []);
    if (vol > 0) {
      meters += vol;
      citations.push(citation(w));
    }
  }
  return { meters, sessionCount: rows.length, citations };
}

export interface WeeklyVolumePoint {
  week: string;
  meters: number;
  citations: MetricCitation[];
}

// Running volume bucketed by Monday-anchored week. Matches the dashboard's volumeByWeek.
export function weeklyVolume(workouts: Workout[], filter: MetricFilter = {}): WeeklyVolumePoint[] {
  const rows = filterWorkouts(workouts, filter);
  const byWeek = new Map<string, { meters: number; citations: MetricCitation[] }>();
  for (const w of rows) {
    const week = getWeekKey(w.date_iso);
    if (!week) continue;
    const vol = calculateRunningVolume(w.exercises || []);
    if (vol <= 0) continue;
    const bucket = byWeek.get(week) || { meters: 0, citations: [] };
    bucket.meters += vol;
    bucket.citations.push(citation(w));
    byWeek.set(week, bucket);
  }
  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, b]) => ({ week, meters: b.meters, citations: b.citations }));
}

export interface EventCoverageItem {
  event: string;
  count: number;
  lastTrainedIso: string | null;
  citations: MetricCitation[];
}

// Sessions per event_focus over practice workouts (matches the dashboard's eventCounts +
// lastTrained), sorted by count desc. Coverage is a COUNT of sessions, not weighted volume.
export function eventCoverage(workouts: Workout[], filter: MetricFilter = {}): EventCoverageItem[] {
  const rows = filterWorkouts(workouts, { ...filter, practiceOnly: filter.practiceOnly ?? true });
  const map = new Map<string, { count: number; last: string | null; citations: MetricCitation[] }>();
  for (const w of rows) {
    for (const ef of w.event_focus || []) {
      const item = map.get(ef) || { count: 0, last: null, citations: [] };
      item.count += 1;
      item.citations.push(citation(w));
      if (w.date_iso && (!item.last || w.date_iso > item.last)) item.last = w.date_iso;
      map.set(ef, item);
    }
  }
  return Array.from(map.entries())
    .map(([event, v]) => ({ event, count: v.count, lastTrainedIso: v.last, citations: v.citations }))
    .sort((a, b) => b.count - a.count);
}

export interface CountResult {
  count: number;
  citations: MetricCitation[];
}

// Session count. Defaults to practice-only (matches the dashboard's totalSessions).
export function sessionCount(workouts: Workout[], filter: MetricFilter = {}): CountResult {
  const rows = filterWorkouts(workouts, { ...filter, practiceOnly: filter.practiceOnly ?? true });
  return { count: rows.length, citations: rows.map(citation) };
}

export type MetricName = "volume" | "weekly_volume" | "event_coverage" | "session_count";

// Dispatch entry point the compute_metric tool calls. Returns a discriminated result so the
// tool layer can serialize a stable shape regardless of which metric was requested.
export function computeMetric(name: MetricName, workouts: Workout[], filter: MetricFilter = {}) {
  switch (name) {
    case "volume":
      return { name, ...totalVolume(workouts, filter) };
    case "weekly_volume":
      return { name, weeks: weeklyVolume(workouts, filter) };
    case "event_coverage":
      return { name, events: eventCoverage(workouts, filter) };
    case "session_count":
      return { name, ...sessionCount(workouts, filter) };
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown metric: ${_exhaustive}`);
    }
  }
}
