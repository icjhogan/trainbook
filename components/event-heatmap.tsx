"use client";

const HEP_EVENTS = ["100mH", "HJ", "SP", "200m", "LJ", "Jav", "800m"];

const EVENT_MAP: Record<string, string> = {
  Hurdles: "100mH",
  "High Jump": "HJ",
  "Shot Put": "SP",
  "Long Jump": "LJ",
  Javelin: "Jav",
  "800m": "800m",
  "200m": "200m",
  Sprints: "200m",
  "Speed Endurance": "200m",
};

interface HeatmapRow {
  label: string;
  events: Record<string, number>;
}

export function EventHeatmap({ data }: { data: HeatmapRow[] }) {
  if (data.length === 0) return null;

  const maxCount = Math.max(
    ...data.flatMap((row) => Object.values(row.events))
  );

  function opacity(count: number): number {
    if (count === 0) return 0.05;
    return 0.2 + (count / maxCount) * 0.6;
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-[var(--color-muted)] font-normal pb-2 pr-3" />
            {HEP_EVENTS.map((e) => (
              <th
                key={e}
                className="text-center text-[var(--color-muted)] font-normal pb-2 px-1 min-w-[32px]"
              >
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.label}>
              <td className="text-[var(--color-muted)] pr-3 py-0.5 whitespace-nowrap">
                {row.label}
              </td>
              {HEP_EVENTS.map((e) => {
                const count = row.events[e] || 0;
                return (
                  <td key={e} className="px-1 py-0.5">
                    <div
                      className="w-full h-5 rounded-sm"
                      style={{
                        backgroundColor: `rgba(107, 114, 128, ${opacity(count)})`,
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { EVENT_MAP, HEP_EVENTS };
