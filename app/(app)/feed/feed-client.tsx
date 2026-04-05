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
    <div className="px-5 pt-14 pb-8">
      <h1 className="text-xl font-semibold tracking-tight">entries</h1>

      {workouts.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)] mt-8 text-center leading-relaxed">
          your training journal is empty.
          <br />
          tap + to add your first workout.
        </p>
      ) : (
        <div className="mt-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider pt-4 pb-1 border-b border-[var(--color-border)]">
                {group.label}
              </p>
              {group.workouts.map((w) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <Toast message={toast} visible={!!toast} onDone={() => setToast("")} />
    </div>
  );
}
