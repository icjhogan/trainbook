// Muted, warm-toned color system for workout types
// Each returns [bg, text] tailwind-compatible CSS values

const TYPE_COLORS: Record<string, [string, string]> = {
  "Tempo":            ["#fef3c7", "#92400e"],  // warm amber
  "Extensive Tempo":  ["#fef3c7", "#92400e"],
  "Intensive Tempo":  ["#fee2e2", "#991b1b"],  // soft red
  "Practice":         ["#e0e7ff", "#3730a3"],  // indigo
  "Meet":             ["#d1fae5", "#065f46"],  // emerald
  "Lift":             ["#f3e8ff", "#6b21a8"],  // purple
  "Off/Recovery":     ["#f1f5f9", "#475569"],  // slate
  "Reflection":       ["#fce7f3", "#9d174d"],  // pink
  "Goals":            ["#fce7f3", "#9d174d"],
  "Speed":            ["#fee2e2", "#991b1b"],
  "Hurdles":          ["#ffedd5", "#9a3412"],  // orange
  "Travel":           ["#f1f5f9", "#475569"],
  "Weekly Plan":      ["#f1f5f9", "#475569"],
  "Season Schedule":  ["#f1f5f9", "#475569"],
  "Competition Cues": ["#d1fae5", "#065f46"],
};

const EVENT_COLORS: Record<string, [string, string]> = {
  "High Jump":        ["#dbeafe", "#1e40af"],  // blue
  "Long Jump":        ["#d1fae5", "#065f46"],  // emerald
  "Hurdles":          ["#ffedd5", "#9a3412"],  // orange
  "Shot Put":         ["#f3e8ff", "#6b21a8"],  // purple
  "Javelin":          ["#fef9c3", "#854d0e"],  // yellow
  "Sprints":          ["#fee2e2", "#991b1b"],  // red
  "200m":             ["#fee2e2", "#991b1b"],
  "800m":             ["#e0e7ff", "#3730a3"],  // indigo
  "Speed Endurance":  ["#fee2e2", "#991b1b"],
  "Tempo":            ["#fef3c7", "#92400e"],  // amber
  "Strength":         ["#f3e8ff", "#6b21a8"],
  "Heptathlon":       ["#f0fdf4", "#166534"],
  "Recovery":         ["#f1f5f9", "#475569"],
};

const DEFAULT_COLOR: [string, string] = ["#f1f5f9", "#475569"];

export function getTypeColor(type: string): { bg: string; text: string } {
  const [bg, text] = TYPE_COLORS[type] || DEFAULT_COLOR;
  return { bg, text };
}

export function getEventColor(event: string): { bg: string; text: string } {
  const [bg, text] = EVENT_COLORS[event] || DEFAULT_COLOR;
  return { bg, text };
}
