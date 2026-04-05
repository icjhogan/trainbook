import { getTypeColor, getEventColor } from "@/lib/workout-colors";

interface PillProps {
  label: string;
  kind: "type" | "event";
}

export function WorkoutPill({ label, kind }: PillProps) {
  const { bg, text } = kind === "type" ? getTypeColor(label) : getEventColor(label);

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-medium leading-tight"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}
