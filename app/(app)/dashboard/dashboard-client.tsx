"use client";

import type { Workout } from "@/lib/types";
import { calculateRunningVolume } from "@/lib/workout-utils";
import { VolumeChart } from "@/components/volume-chart";
import { EVENT_MAP, HEP_EVENTS } from "@/components/event-heatmap";
import { getTypeColor, getEventColor } from "@/lib/workout-colors";

function getWeekKey(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00");
  const monday = new Date(d);
  monday.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
  return monday.toISOString().slice(0, 10);
}

function weekLabel(mondayStr: string): string {
  const d = new Date(mondayStr + "T00:00:00");
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function daysAgo(dateIso: string): number {
  const d = new Date(dateIso + "T00:00:00");
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function DashboardClient({ workouts }: { workouts: Workout[] }) {
  if (workouts.length === 0) {
    return (
      <div className="px-5 pt-14 animate-fade-in-up">
        <div className="mt-24 text-center">
          <p className="text-body text-[var(--color-muted)]">
            add some entries to see your training data here
          </p>
        </div>
      </div>
    );
  }

  const practiceWorkouts = workouts.filter(
    (w) => !["Season Schedule", "Weekly Plan", "Goals", "Reflection", "Competition Cues"].includes(w.workout_type)
  );

  // ── Stats ──
  const totalSessions = practiceWorkouts.length;
  const totalVolume = workouts.reduce((sum, w) => sum + calculateRunningVolume(w.exercises || []), 0);
  const dates = workouts.map((w) => w.date_iso).filter(Boolean).sort();
  const weekSet = new Set(dates.map(getWeekKey));

  // ── This week vs last week ──
  const now = new Date();
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  const thisWeekKey = thisMon.toISOString().slice(0, 10);
  const lastMon = new Date(thisMon);
  lastMon.setDate(thisMon.getDate() - 7);
  const lastWeekKey = lastMon.toISOString().slice(0, 10);

  const thisWeekWorkouts = practiceWorkouts.filter((w) => w.date_iso && getWeekKey(w.date_iso) === thisWeekKey);
  const lastWeekWorkouts = practiceWorkouts.filter((w) => w.date_iso && getWeekKey(w.date_iso) === lastWeekKey);
  const thisWeekVol = thisWeekWorkouts.reduce((s, w) => s + calculateRunningVolume(w.exercises || []), 0);
  const lastWeekVol = lastWeekWorkouts.reduce((s, w) => s + calculateRunningVolume(w.exercises || []), 0);

  // ── Weekly volume for chart ──
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
      label: new Date(week + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      meters,
    }));

  // ── Event frequency (all time) ──
  const eventCounts: Record<string, number> = {};
  for (const w of practiceWorkouts) {
    for (const ef of w.event_focus || []) {
      eventCounts[ef] = (eventCounts[ef] || 0) + 1;
    }
  }
  const sortedEvents = Object.entries(eventCounts).sort(([, a], [, b]) => b - a);
  const maxEventCount = sortedEvents[0]?.[1] || 1;

  // ── Recurring cues (what keeps coming up) ──
  const cueFreq: Record<string, number> = {};
  for (const w of workouts) {
    for (const cue of w.technical_cues || []) {
      // Normalize: lowercase, trim
      const key = cue.toLowerCase().trim();
      if (key.length > 5) {
        cueFreq[key] = (cueFreq[key] || 0) + 1;
      }
    }
  }
  const recurringCues = Object.entries(cueFreq)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // ── Recent streak ──
  const sortedDates = [...new Set(dates)].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (sortedDates.includes(expectedStr)) {
      streak++;
    } else {
      break;
    }
  }

  // ── Events not trained in 14+ days ──
  const lastTrained: Record<string, string> = {};
  for (const w of practiceWorkouts) {
    for (const ef of w.event_focus || []) {
      if (!lastTrained[ef] || (w.date_iso && w.date_iso > lastTrained[ef])) {
        lastTrained[ef] = w.date_iso || "";
      }
    }
  }
  const neglected = Object.entries(lastTrained)
    .filter(([, date]) => date && daysAgo(date) > 14)
    .sort(([, a], [, b]) => daysAgo(b) - daysAgo(a));

  return (
    <div className="px-5 pt-14 pb-8 animate-fade-in-up">

      {/* ── This Week ── */}
      <section className="mb-10">
        <h2 className="text-[13px] font-semibold text-[var(--color-secondary)] tracking-wide mb-4">
          This week
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={thisWeekWorkouts.length.toString()}
            label="sessions"
            sub={lastWeekWorkouts.length > 0 ? `${lastWeekWorkouts.length} last week` : undefined}
          />
          <StatCard
            value={thisWeekVol > 0 ? `${(thisWeekVol / 1000).toFixed(1)}k` : "0"}
            label="meters"
            sub={lastWeekVol > 0 ? `${(lastWeekVol / 1000).toFixed(1)}k last week` : undefined}
          />
          <StatCard
            value={streak > 0 ? streak.toString() : "–"}
            label={streak === 1 ? "day streak" : "day streak"}
          />
        </div>
      </section>

      {/* ── Volume Trend ── */}
      {volumeData.length > 1 && (
        <section className="mb-10">
          <h2 className="text-[13px] font-semibold text-[var(--color-secondary)] tracking-wide mb-4">
            Volume
          </h2>
          <VolumeChart data={volumeData} />
        </section>
      )}

      {/* ── Event Balance ── */}
      {sortedEvents.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[13px] font-semibold text-[var(--color-secondary)] tracking-wide mb-4">
            Event balance
          </h2>
          <div className="space-y-2.5">
            {sortedEvents.map(([event, count]) => {
              const color = getEventColor(event);
              const pct = (count / maxEventCount) * 100;
              return (
                <div key={event} className="flex items-center gap-3">
                  <span className="text-[13px] text-[var(--color-secondary)] w-[80px] flex-shrink-0 truncate">
                    {event}
                  </span>
                  <div className="flex-1 h-[6px] rounded-full bg-[var(--color-surface)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color.text }}
                    />
                  </div>
                  <span className="text-[12px] text-[var(--color-muted)] w-[24px] text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Gaps ── */}
      {neglected.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[13px] font-semibold text-[var(--color-secondary)] tracking-wide mb-4">
            Needs attention
          </h2>
          <div className="space-y-2">
            {neglected.map(([event, date]) => (
              <div key={event} className="flex items-center justify-between py-2 px-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)]/50">
                <span className="text-[14px]">{event}</span>
                <span className="text-[12px] text-[var(--color-muted)]">
                  {daysAgo(date)}d ago
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Recurring Cues ── */}
      {recurringCues.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[13px] font-semibold text-[var(--color-secondary)] tracking-wide mb-3">
            Recurring cues
          </h2>
          <p className="text-[12px] text-[var(--color-muted)] mb-3">
            Technical notes that keep appearing — likely still needs work
          </p>
          <div className="space-y-1.5">
            {recurringCues.map(([cue, count]) => (
              <div key={cue} className="flex items-start gap-2 py-1.5">
                <span className="text-[12px] text-[var(--color-muted)] mt-0.5 flex-shrink-0 w-[20px] text-right">
                  {count}x
                </span>
                <span className="text-[13px] text-[var(--color-secondary)] leading-snug">
                  {cue}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── All-time summary ── */}
      <section>
        <div className="py-3 border-t border-[var(--color-separator)]">
          <p className="text-[12px] text-[var(--color-muted)] text-center">
            {weekSet.size} weeks &middot; {totalSessions} sessions &middot; {(totalVolume / 1000).toFixed(1)}km total
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="py-3 px-3 rounded-[var(--radius)] bg-[var(--color-surface)]/50 text-center">
      <p className="text-[22px] font-bold tracking-tight">{value}</p>
      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[var(--color-muted)]/60 mt-0.5">{sub}</p>}
    </div>
  );
}
