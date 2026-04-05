"use client";

import { useState } from "react";
import type { Workout } from "@/lib/types";

interface WorkoutCardProps {
  workout: Workout;
  onDelete: (id: string) => void;
}

export function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);

  const exercisePreview = workout.exercises.slice(0, 3);
  const hasMore = workout.exercises.length > 3;
  const hasFlags = workout.flags.length > 0;

  return (
    <article
      onClick={() => setExpanded(!expanded)}
      className="py-5 cursor-pointer active:opacity-70 transition-opacity"
    >
      <h3 className="text-base font-semibold tracking-tight">
        {workout.date}
        {hasFlags && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 ml-2 align-middle" />
        )}
      </h3>

      <p className="text-xs text-[var(--color-muted)] mt-0.5 tracking-wide">
        {workout.workout_type}
        {workout.event_focus.length > 0 && (
          <span> — {workout.event_focus.join(", ")}</span>
        )}
      </p>

      {!expanded && (
        <>
          <div className="mt-2 space-y-0.5">
            {exercisePreview.map((ex, i) => (
              <p key={i} className="text-sm text-[var(--color-text)]">
                {ex.description}
                {ex.times?.length > 0 && (
                  <span className="text-[var(--color-muted)]">
                    {" "}&mdash; {ex.times.join(", ")}
                  </span>
                )}
              </p>
            ))}
            {hasMore && (
              <p className="text-xs text-[var(--color-muted)]">
                +{workout.exercises.length - 3} more
              </p>
            )}
          </div>

          {workout.personal_notes && (
            <p className="text-sm italic text-[var(--color-muted)] mt-2 line-clamp-2">
              {workout.personal_notes}
            </p>
          )}
        </>
      )}

      {expanded && (
        <div className="mt-3 space-y-4">
          <div className="space-y-2">
            {workout.exercises.map((ex, i) => (
              <div key={i} className="border-l-2 border-[var(--color-border)] pl-3">
                <p className="text-sm">{ex.description}</p>
                <div className="flex gap-3 text-xs text-[var(--color-muted)]">
                  {ex.times?.length > 0 && <span>{ex.times.join(", ")}</span>}
                  {ex.rest && <span>rest: {ex.rest}</span>}
                </div>
                {ex.notes && (
                  <p className="text-xs text-[var(--color-muted)] italic mt-0.5">
                    {ex.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {workout.technical_cues.length > 0 && (
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-1">
                cues
              </p>
              {workout.technical_cues.map((cue, i) => (
                <p key={i} className="text-sm text-[var(--color-muted)]">
                  {cue}
                </p>
              ))}
            </div>
          )}

          {workout.personal_notes && (
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-1">
                notes
              </p>
              <p className="text-sm italic">{workout.personal_notes}</p>
            </div>
          )}

          {hasFlags && (
            <div className="space-y-1">
              {workout.flags.map((flag, i) => (
                <p key={i} className="text-xs text-amber-600">{flag}</p>
              ))}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this entry?")) onDelete(workout.id);
            }}
            className="text-xs text-[var(--color-muted)] underline min-h-[44px] flex items-center"
          >
            delete
          </button>
        </div>
      )}
    </article>
  );
}
