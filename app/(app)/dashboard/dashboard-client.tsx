"use client";

import type { Workout } from "@/lib/types";
import { calculateRunningVolume } from "@/lib/workout-utils";
import { VolumeChart } from "@/components/volume-chart";
import { EventHeatmap, EVENT_MAP, HEP_EVENTS } from "@/components/event-heatmap";

function getWeekKey(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00");
  const monday = new Date(d);
  monday.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
  return monday.toISOString().slice(0, 10);
}

function weekLabel(mondayStr: string): string {
  const d = new Date(mondayStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DashboardClient({ workouts }: { workouts: Workout[] }) {
  const practiceWorkouts = workouts.filter(
    (w) =>
      !["Season Schedule", "Weekly Plan", "Goals", "Reflection", "Competition Cues"].includes(
        w.workout_type
      )
  );

  const totalSessions = practiceWorkouts.length;
  const totalVolume = workouts.reduce(
    (sum, w) => sum + calculateRunningVolume(w.exercises || []),
    0
  );

  // Weekly volume
  const volumeByWeek = new Map<string, number>();
  for (const w of workouts) {
    if (!w.date_iso) continue;
    const week = getWeekKey(w.date_iso);
    const vol = calculateRunningVolume(w.exercises || []);
    volumeByWeek.set(week, (volumeByWeek.get(week) || 0) + vol);
  }
  const volumeData = Array.from(volumeByWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, meters]) => ({
      week,
      label: weekLabel(week),
      meters,
    }));

  // Event coverage
  const eventsByWeek = new Map<string, Record<string, number>>();
  for (const w of workouts) {
    if (!w.date_iso) continue;
    const week = getWeekKey(w.date_iso);
    if (!eventsByWeek.has(week)) {
      eventsByWeek.set(week, Object.fromEntries(HEP_EVENTS.map((e) => [e, 0])));
    }
    const row = eventsByWeek.get(week)!;
    for (const ef of w.event_focus || []) {
      const mapped = EVENT_MAP[ef];
      if (mapped && mapped in row) {
        row[mapped]++;
      }
    }
  }
  const heatmapData = Array.from(eventsByWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, events]) => ({ label: weekLabel(week), events }));

  // Weeks count
  const weeks = new Set<string>();
  for (const w of workouts) {
    if (w.date_iso) weeks.add(getWeekKey(w.date_iso));
  }

  if (workouts.length === 0) {
    return (
      <div className="px-5 pt-[60px] animate-fade-in-up">
        <h1 className="text-title">dashboard</h1>
        <div className="mt-24 text-center">
          <p className="text-body text-[var(--color-muted)]">
            add some entries to see your training data here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-[60px] pb-8 animate-fade-in-up">
      <h1 className="text-title mb-2">dashboard</h1>

      <p className="text-body text-[var(--color-secondary)] mb-10">
        {weeks.size} weeks &middot; {totalSessions} sessions &middot;{" "}
        {(totalVolume / 1000).toFixed(1)}km
      </p>

      <section className="mb-10">
        <h2 className="text-label mb-4">weekly volume</h2>
        <VolumeChart data={volumeData} />
      </section>

      <section>
        <h2 className="text-label mb-4">event coverage</h2>
        <EventHeatmap data={heatmapData} />
      </section>
    </div>
  );
}
