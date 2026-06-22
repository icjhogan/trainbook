"use client";

import type { Workout } from "@/lib/types";
import { WorkoutPill } from "./workout-pill";

// Read-only expanded view of a single workout, mirroring the feed's expanded training-day
// card. Used as the tap-to-open destination for chat citations (U6).
export function WorkoutDetail({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[60] bg-[var(--color-bg)] flex flex-col animate-fade-in">
      <div className="flex items-center px-3 h-11 border-b border-[var(--color-separator)]">
        <button
          onClick={onClose}
          className="flex items-center gap-0.5 min-h-[44px] active:opacity-50 pr-2"
          aria-label="Back to chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-[15px]">Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <h3 className="text-[20px] font-semibold tracking-tight">{workout.date}</h3>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <WorkoutPill label={workout.workout_type} kind="type" />
          {workout.event_focus?.map((e) => (
            <WorkoutPill key={e} label={e} kind="event" />
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {workout.exercises?.map((ex, i) => (
            <div key={i} className="pl-3 border-l-[2px] border-[var(--color-border)]">
              <p className="text-body">{ex.description}</p>
              {(ex.times?.length > 0 || ex.rest) && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {ex.times?.length > 0 && (
                    <span className="text-caption text-[var(--color-secondary)]">{ex.times.join(", ")}</span>
                  )}
                  {ex.rest && <span className="text-caption text-[var(--color-muted)]">rest: {ex.rest}</span>}
                </div>
              )}
              {ex.notes && (
                <p className="text-caption italic text-[var(--color-secondary)] mt-1">{ex.notes}</p>
              )}
            </div>
          ))}
        </div>

        {workout.technical_cues?.length > 0 && (
          <div className="mt-5">
            <p className="text-label mb-1.5">cues</p>
            <div className="space-y-0.5">
              {workout.technical_cues.map((cue, i) => (
                <p key={i} className="text-caption text-[var(--color-secondary)]">{cue}</p>
              ))}
            </div>
          </div>
        )}

        {workout.personal_notes && (
          <div className="mt-5">
            <p className="text-label mb-1.5">notes</p>
            <p className="text-body italic text-[var(--color-secondary)]">{workout.personal_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
