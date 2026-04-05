"use client";

import { useState } from "react";
import type { Workout } from "@/lib/types";
import { WorkoutPill } from "./workout-pill";

interface WorkoutCardProps {
  workout: Workout;
  onDelete: (id: string) => void;
}

export function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const exercisePreview = workout.exercises.slice(0, 2);
  const hasMore = workout.exercises.length > 2;
  const hasFlags = workout.flags?.length > 0;

  return (
    <article
      onClick={() => setExpanded(!expanded)}
      className="py-4 active:bg-[var(--color-surface)] -mx-5 px-5 transition-colors rounded-lg cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h3 className="text-subheading">
          {workout.date}
        </h3>
        {hasFlags && (
          <span className="w-[6px] h-[6px] rounded-full bg-amber-400 flex-shrink-0" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        <WorkoutPill label={workout.workout_type} kind="type" />
        {workout.event_focus?.map((e) => (
          <WorkoutPill key={e} label={e} kind="event" />
        ))}
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <div className="mt-2.5">
          <div className="space-y-1">
            {exercisePreview.map((ex, i) => (
              <p key={i} className="text-body text-[var(--color-text)]">
                {ex.description}
                {ex.times?.length > 0 && (
                  <span className="text-[var(--color-secondary)]">
                    {" "}&mdash; {ex.times.join(", ")}
                  </span>
                )}
              </p>
            ))}
          </div>
          {hasMore && (
            <p className="text-caption text-[var(--color-muted)] mt-1">
              +{workout.exercises.length - 2} more
            </p>
          )}

          {workout.personal_notes && (
            <p className="text-caption italic text-[var(--color-secondary)] mt-2 line-clamp-2">
              {workout.personal_notes}
            </p>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-5 animate-fade-in">
          {/* Exercises */}
          <div className="space-y-3">
            {workout.exercises.map((ex, i) => (
              <div
                key={i}
                className="pl-3 border-l-[2px] border-[var(--color-border)]"
              >
                <p className="text-body">{ex.description}</p>
                {(ex.times?.length > 0 || ex.rest) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                    {ex.times?.length > 0 && (
                      <span className="text-caption text-[var(--color-secondary)]">
                        {ex.times.join(", ")}
                      </span>
                    )}
                    {ex.rest && (
                      <span className="text-caption text-[var(--color-muted)]">
                        rest: {ex.rest}
                      </span>
                    )}
                  </div>
                )}
                {ex.notes && (
                  <p className="text-caption italic text-[var(--color-secondary)] mt-1">
                    {ex.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Cues */}
          {workout.technical_cues?.length > 0 && (
            <div>
              <p className="text-label mb-1.5">cues</p>
              <div className="space-y-0.5">
                {workout.technical_cues.map((cue, i) => (
                  <p key={i} className="text-caption text-[var(--color-secondary)]">
                    {cue}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {workout.personal_notes && (
            <div>
              <p className="text-label mb-1.5">notes</p>
              <p className="text-body italic text-[var(--color-secondary)]">
                {workout.personal_notes}
              </p>
            </div>
          )}

          {/* Flags */}
          {hasFlags && (
            <div className="space-y-1 py-2 px-3 bg-amber-50 rounded-[var(--radius-sm)]">
              {workout.flags.map((flag, i) => (
                <p key={i} className="text-caption text-amber-700">{flag}</p>
              ))}
            </div>
          )}

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="text-caption text-[var(--color-muted)] min-h-[44px] flex items-center"
            >
              delete entry
            </button>
          ) : (
            <div
              className="flex items-center gap-4 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onDelete(workout.id)}
                className="text-caption text-[var(--color-danger)] font-medium min-h-[44px] flex items-center"
              >
                confirm delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-caption text-[var(--color-muted)] min-h-[44px] flex items-center"
              >
                cancel
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
