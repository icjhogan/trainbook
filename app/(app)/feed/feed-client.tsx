"use client";

import { createClient } from "@/lib/supabase/client";
import { WorkoutCard } from "@/components/workout-card";
import { Toast } from "@/components/toast";
import type { Workout } from "@/lib/types";
import { useState, useCallback } from "react";

interface WeekGroup {
  label: string;
  workouts: Workout[];
}

function groupByWeek(workouts: Workout[]): WeekGroup[] {
  const groups: Map<string, Workout[]> = new Map();

  for (const w of workouts) {
    if (!w.date_iso) continue;
    const d = new Date(w.date_iso + "T00:00:00");
    const monday = new Date(d);
    monday.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    const key = monday.toISOString().slice(0, 10);

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(w);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, workouts]) => {
      const monday = new Date(key + "T00:00:00");
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const label = `${monday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} — ${sunday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
      return { label, workouts };
    });
}

export function FeedClient({
  initialWorkouts,
}: {
  initialWorkouts: Workout[];
}) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [toast, setToast] = useState("");
  const supabase = createClient();

  const handleDelete = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (!error) {
        setWorkouts((prev) => prev.filter((w) => w.id !== id));
        setToast("entry deleted");
      }
    },
    [supabase]
  );

  const groups = groupByWeek(workouts);

  return (
    <div className="px-5 pt-[60px] pb-8 animate-fade-in-up">
      <h1 className="text-title">entries</h1>

      {workouts.length === 0 ? (
        <div className="mt-24 text-center">
          <p className="text-heading text-[var(--color-secondary)] mb-2">
            no entries yet
          </p>
          <p className="text-body text-[var(--color-muted)]">
            tap + to capture your first workout
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {groups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-2" : ""}>
              <div className="sticky top-0 z-10 bg-[var(--color-bg)] pt-3 pb-2">
                <p className="text-label">
                  {group.label}
                </p>
              </div>
              <div className="divide-y divide-[var(--color-separator)]">
                {group.workouts.map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast message={toast} visible={!!toast} onDone={() => setToast("")} />
    </div>
  );
}
