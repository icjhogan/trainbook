"use client";

import { createClient } from "@/lib/supabase/client";
import { WorkoutCard } from "@/components/workout-card";
import { WorkoutRow } from "@/components/workout-row";
import { Toast } from "@/components/toast";
import { useSearch } from "@/lib/search-context";
import { getTypeColor, getEventColor } from "@/lib/workout-colors";
import { getWeekKey } from "@/lib/workout-utils";
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
    const key = getWeekKey(w.date_iso);
    if (!key) continue;

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
  const { isSearching, query, setQuery, setIsSearching } = useSearch();
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
      } else {
        setToast("couldn't delete entry");
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
        {/* Search header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => { setIsSearching(false); setQuery(""); }}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-full glass-button active:scale-90 transition-transform flex-shrink-0"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="relative flex-1">
            <svg
              width="15"
              height="15"
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
              className="w-full pl-9 pr-9 py-2.5 rounded-full glass-input text-[15px] outline-none placeholder:text-[var(--color-muted)]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-[var(--color-muted)]/30 flex items-center justify-center"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Quick filters */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 -mx-5 px-5">
          {[
            { label: "Tempo", kind: "type" as const },
            { label: "Practice", kind: "type" as const },
            { label: "Meet", kind: "type" as const },
            { label: "Lift", kind: "type" as const },
            { label: "High Jump", kind: "event" as const },
            { label: "Hurdles", kind: "event" as const },
            { label: "Long Jump", kind: "event" as const },
            { label: "Shot Put", kind: "event" as const },
            { label: "Javelin", kind: "event" as const },
          ].map(({ label, kind }) => {
            const isActive = query.toLowerCase() === label.toLowerCase();
            const color = kind === "type" ? getTypeColor(label) : getEventColor(label);
            return (
              <button
                key={label}
                onClick={() => setQuery(isActive ? "" : label)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95"
                style={
                  isActive
                    ? { backgroundColor: color.text, color: "#191919" }
                    : { backgroundColor: color.bg, color: color.text }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        {query ? (
          <>
            <p className="text-[12px] text-[var(--color-muted)] mb-3">
              {filteredWorkouts.length} result{filteredWorkouts.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-1">
              {filteredWorkouts.map((w) => (
                expandedId === w.id ? (
                  /* Expanded — full workout card inline */
                  <div key={w.id} className="animate-fade-in">
                    <button
                      onClick={() => setExpandedId(null)}
                      className="flex items-center gap-1.5 mb-2 py-1 text-[13px] text-[var(--color-secondary)] active:opacity-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      Back to results
                    </button>
                    <WorkoutCard
                      workout={w}
                      defaultExpanded
                      onDelete={(id) => {
                        handleDelete(id);
                        setExpandedId(null);
                      }}
                      onUpdate={handleUpdate}
                      onOpenChat={openChat}
                    />
                  </div>
                ) : (
                  /* Compact row */
                  <WorkoutRow
                    key={w.id}
                    workout={w}
                    highlight={query}
                    onTap={(id) => setExpandedId(id)}
                  />
                )
              ))}
            </div>
            {filteredWorkouts.length === 0 && (
              <div className="mt-16 text-center">
                <p className="text-[14px] text-[var(--color-muted)]">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="mt-10 text-center">
            <p className="text-[14px] text-[var(--color-muted)]">
              Search by date, workout type, event, or notes
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
