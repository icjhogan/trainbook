"use client";

import { createClient } from "@/lib/supabase/client";
import { WorkoutCard } from "@/components/workout-card";
import { WorkoutRow } from "@/components/workout-row";
import { Toast } from "@/components/toast";
import { useSearch } from "@/lib/search-context";
import { getTypeColor, getEventColor } from "@/lib/workout-colors";
import { useChatOpener } from "@/lib/chat-opener-context";
import type { Workout } from "@/lib/types";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

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

function searchWorkouts(workouts: Workout[], query: string): Workout[] {
  const q = query.toLowerCase().trim();
  if (!q) return workouts;

  return workouts.filter((w) => {
    const fields = [
      w.date,
      w.workout_type,
      ...(w.event_focus || []),
      w.personal_notes || "",
      w.raw_text || "",
      ...(w.technical_cues || []),
      ...(w.exercises || []).map((e) => e.description),
    ];
    return fields.some((f) => f.toLowerCase().includes(q));
  });
}

export function FeedClient({
  initialWorkouts,
}: {
  initialWorkouts: Workout[];
}) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const { isSearching, query, setQuery } = useSearch();
  const openChat = useChatOpener();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isSearching) {
      // Small delay so the animation can start
      const timer = setTimeout(() => searchInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isSearching]);

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

  const handleUpdate = useCallback(
    (updated: Workout) => {
      setWorkouts((prev) =>
        prev.map((w) => (w.id === updated.id ? updated : w))
      );
      setToast("entry updated");
    },
    []
  );

  const filteredWorkouts = useMemo(
    () => (isSearching ? searchWorkouts(workouts, query) : workouts),
    [workouts, isSearching, query]
  );

  const groups = groupByWeek(filteredWorkouts);

  // Search mode
  if (isSearching) {
    return (
      <div className="px-5 pt-4 pb-8 animate-fade-in">
        {/* Search input */}
        <div className="relative mb-4">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workouts..."
            className="w-full pl-10 pr-4 py-3 rounded-[var(--radius)] glass-input text-[15px] outline-none placeholder:text-[var(--color-muted)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-[20px] h-[20px] rounded-full bg-[var(--color-border)] flex items-center justify-center"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick filters */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-5 px-5">
          {[
            { label: "Tempo", kind: "type" as const },
            { label: "Practice", kind: "type" as const },
            { label: "Meet", kind: "type" as const },
            { label: "High Jump", kind: "event" as const },
            { label: "Hurdles", kind: "event" as const },
            { label: "Long Jump", kind: "event" as const },
            { label: "Lift", kind: "type" as const },
          ].map(({ label, kind }) => {
            const isActive = query.toLowerCase() === label.toLowerCase();
            const color = kind === "type" ? getTypeColor(label) : getEventColor(label);
            return (
              <button
                key={label}
                onClick={() => setQuery(isActive ? "" : label)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95"
                style={
                  isActive
                    ? { backgroundColor: color.text, color: "#fff" }
                    : { backgroundColor: color.bg, color: color.text }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p className="text-caption text-[var(--color-muted)] mb-2">
          {filteredWorkouts.length} result{filteredWorkouts.length !== 1 ? "s" : ""}
        </p>

        {/* Compact results */}
        <div className="space-y-0.5">
          {filteredWorkouts.map((w) => (
            <WorkoutRow
              key={w.id}
              workout={w}
              highlight={query}
              onTap={(id) => {
                setExpandedId(id === expandedId ? null : id);
              }}
            />
          ))}
        </div>

        {filteredWorkouts.length === 0 && query && (
          <div className="mt-12 text-center">
            <p className="text-body text-[var(--color-muted)]">
              no matches for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        <Toast message={toast} visible={!!toast} onDone={() => setToast("")} />
      </div>
    );
  }

  // Normal feed mode
  return (
    <div className="px-5 pt-4 pb-8 animate-fade-in-up">
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
        <div className="mt-4">
          {groups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-8" : ""}>
              {/* Week header */}
              <div className="sticky top-0 z-10 bg-[var(--color-bg)] pt-4 pb-3">
                <p className="text-[13px] font-semibold text-[var(--color-secondary)] tracking-wide">
                  {group.label}
                </p>
              </div>

              {/* Cards */}
              <div className="space-y-1">
                {group.workouts.map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                    onOpenChat={openChat}
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
