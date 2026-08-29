"use client";

import { useState } from "react";
import { parseEventFocusInput } from "@/lib/event-focus";

interface EventFocusInputProps {
  events: string[];
  onChange: (events: string[]) => void;
  className?: string;
  placeholder?: string;
}

// Keep the exact text as local UI state. Rebuilding the value from the normalized events
// array on every keystroke removes a just-typed space on iOS before the next letter arrives.
export function EventFocusInput({
  events,
  onChange,
  className,
  placeholder,
}: EventFocusInputProps) {
  const [draft, setDraft] = useState(() => events.join(", "));

  return (
    <input
      value={draft}
      onChange={(event) => {
        const next = parseEventFocusInput(event.target.value);
        setDraft(next.draft);
        onChange(next.events);
      }}
      onBlur={() => setDraft(parseEventFocusInput(draft).events.join(", "))}
      placeholder={placeholder}
      className={className}
    />
  );
}
