"use client";

import type { Workout } from "@/lib/types";

interface WorkoutRowProps {
  workout: Workout;
  onTap: (id: string) => void;
  highlight?: string;
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-100 text-[var(--color-text)] rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function WorkoutRow({ workout, onTap, highlight = "" }: WorkoutRowProps) {
  const firstExercise = workout.exercises?.[0];
  const exerciseCount = workout.exercises?.length || 0;

  return (
    <button
      onClick={() => onTap(workout.id)}
      className="w-full flex items-center gap-3 py-3 px-1 text-left active:bg-[var(--color-surface)] rounded-[var(--radius-sm)] transition-colors"
    >
      {/* Left accent */}
      <div className="w-[3px] h-8 rounded-full bg-[var(--color-border)] flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[14px] font-medium truncate">
            {highlightText(workout.date, highlight)}
          </p>
          <span className="text-[11px] text-[var(--color-muted)] flex-shrink-0">
            {highlightText(workout.workout_type, highlight)}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          {workout.event_focus?.length > 0 && (
            <span className="text-[12px] text-[var(--color-secondary)] truncate">
              {highlightText(workout.event_focus.join(", "), highlight)}
            </span>
          )}
          {firstExercise && (
            <span className="text-[12px] text-[var(--color-muted)] truncate">
              &middot; {highlightText(firstExercise.description, highlight)}
              {exerciseCount > 1 && ` +${exerciseCount - 1}`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
