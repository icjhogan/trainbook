export function normalizeEventFocus(events: readonly string[]): string[] {
  return events.map((event) => event.trim()).filter(Boolean);
}

// The raw draft and normalized data intentionally travel together. The input must render
// the untouched draft while typing (including a trailing space after "High"), while the
// workout model remains a clean array that is ready to save.
export function parseEventFocusInput(value: string): {
  draft: string;
  events: string[];
} {
  return {
    draft: value,
    events: normalizeEventFocus(value.split(",")),
  };
}
