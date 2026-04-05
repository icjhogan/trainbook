"use client";

import type { Workout } from "@/lib/types";
import { WorkoutPill } from "./workout-pill";
import { getTypeColor } from "@/lib/workout-colors";

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
      <mark key={i} className="bg-[#3d2e0a] text-[#f0c340] rounded-sm px-0.5">
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
  const typeColor = getTypeColor(workout.workout_type);

  return (
    <button
      onClick={() => onTap(workout.id)}
      className="w-full flex items-center gap-3 py-2.5 px-1 text-left active:bg-[var(--color-surface)] rounded-[var(--radius-sm)] transition-colors"
    >
      {/* Color accent bar */}
      <div
        className="w-[3px] h-8 rounded-full flex-shrink-0"
        style={{ backgroundColor: typeColor.text + "40" }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] font-medium truncate">
            {highlightText(workout.date, highlight)}
          </p>
          <WorkoutPill label={workout.workout_type} kind="type" />
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {workout.event_focus?.slice(0, 2).map((e) => (
            <WorkoutPill key={e} label={e} kind="event" />
          ))}
          {firstExercise && (
            <span className="text-[12px] text-[var(--color-muted)] truncate ml-0.5">
              {highlightText(firstExercise.description, highlight)}
              {exerciseCount > 1 && ` +${exerciseCount - 1}`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
