"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface VolumeData {
  week: string;
  label: string;
  meters: number;
}

export function VolumeChart({ data }: { data: VolumeData[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            formatter={(value) => [`${value}m`, "volume"]}
            contentStyle={{
              background: "#1a1a1a",
              border: "none",
              borderRadius: "6px",
              color: "#fafafa",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="meters" fill="#8a8a8a" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
