// Dark mode color system for workout types
// Each returns [bg, text] — muted, low-contrast tints for dark backgrounds

const TYPE_COLORS: Record<string, [string, string]> = {
  "Tempo":            ["#3d2e0a", "#f0c340"],  // amber
  "Extensive Tempo":  ["#3d2e0a", "#f0c340"],
  "Intensive Tempo":  ["#3b2014", "#f4a261"],  // warm coral
  "Practice":         ["#1e1b4b", "#a5b4fc"],  // indigo
  "Meet":             ["#0a2e1f", "#6ee7b7"],  // emerald
  "Lift":             ["#2e1065", "#c4b5fd"],  // purple
  "Off/Recovery":     ["#27272a", "#a1a1aa"],  // zinc
  "Reflection":       ["#2a1a2e", "#d8b4fe"],  // soft violet
  "Goals":            ["#2a1a2e", "#d8b4fe"],
  "Speed":            ["#3b2014", "#f4a261"],  // warm coral
  "Hurdles":          ["#3b1a0a", "#fdba74"],  // orange
  "Travel":           ["#27272a", "#a1a1aa"],
  "Weekly Plan":      ["#27272a", "#a1a1aa"],
  "Season Schedule":  ["#27272a", "#a1a1aa"],
  "Competition Cues": ["#0a2e1f", "#6ee7b7"],
};

const EVENT_COLORS: Record<string, [string, string]> = {
  "High Jump":        ["#172554", "#93c5fd"],  // blue
  "Long Jump":        ["#0a2e1f", "#6ee7b7"],  // emerald
  "Hurdles":          ["#3b1a0a", "#fdba74"],  // orange
  "Shot Put":         ["#2e1065", "#c4b5fd"],  // purple
  "Javelin":          ["#3d2e0a", "#fde047"],  // yellow
  "Sprints":          ["#1a2e3b", "#7dd3fc"],  // sky blue
  "200m":             ["#1a2e3b", "#7dd3fc"],  // sky blue
  "800m":             ["#1e1b4b", "#a5b4fc"],  // indigo
  "Speed Endurance":  ["#1a2e3b", "#7dd3fc"],  // sky blue
  "Tempo":            ["#3d2e0a", "#f0c340"],  // amber
  "Strength":         ["#2e1065", "#c4b5fd"],
  "Heptathlon":       ["#0a2e1f", "#6ee7b7"],
  "Recovery":         ["#27272a", "#a1a1aa"],
};

const DEFAULT_COLOR: [string, string] = ["#27272a", "#a1a1aa"];

export function getTypeColor(type: string): { bg: string; text: string } {
  const [bg, text] = TYPE_COLORS[type] || DEFAULT_COLOR;
  return { bg, text };
}

export function getEventColor(event: string): { bg: string; text: string } {
  const [bg, text] = EVENT_COLORS[event] || DEFAULT_COLOR;
  return { bg, text };
}
