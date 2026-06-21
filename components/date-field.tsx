"use client";

import { formatDateLabel } from "@/lib/workout-utils";

interface DateFieldProps {
  /** date_iso in YYYY-MM-DD form (or "" when unset). */
  value: string;
  /** Emits the picked ISO date and its derived human-readable label. */
  onChange: (dateIso: string, label: string) => void;
}

// Native date picker bound to date_iso, with the derived human-readable label shown
// beneath it. Single source of truth for the entry date across the manual, photo-confirm,
// and edit forms — the label is always derived, never free-typed, so it can't drift.
export function DateField({ value, onChange }: DateFieldProps) {
  return (
    <div>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value, formatDateLabel(e.target.value))}
        // colorScheme keeps the native picker dark to match the app theme.
        style={{ colorScheme: "dark" }}
        className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] glass-input text-[15px] outline-none"
      />
      {value && (
        <p className="text-caption text-[var(--color-muted)] mt-1">
          {formatDateLabel(value) || "Invalid date"}
        </p>
      )}
    </div>
  );
}
