"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const COLORS: Record<string, string> = {
  RAV4: "#ef4444",
  XC60: "#1e3a5f",
  X3: "#3b82f6",
};

interface RetentionPoint {
  age: number;
  retention: number;
}

interface Props {
  retention: Record<string, { newPrice: number; points: RetentionPoint[] }>;
}

export default function RetentionChart({ retention }: Props) {
  // Combine all ages
  const allAges = new Set<number>();
  Object.values(retention).forEach((r) =>
    r.points.forEach((p) => allAges.add(p.age))
  );
  const sortedAges = [...allAges].sort((a, b) => a - b).filter((a) => a <= 15);

  const data = sortedAges.map((age) => {
    const point: Record<string, number> = { age };
    for (const [model, r] of Object.entries(retention)) {
      const match = r.points.find((p) => p.age === age);
      if (match) point[model] = match.retention;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={450}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="age"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          label={{ value: "Car Age (years)", position: "bottom", fill: "#71717a", offset: 0 }}
        />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          domain={[0, 110]}
          tickFormatter={(v: number) => `${v}%`}
          label={{
            value: "% of New Price Retained",
            angle: -90,
            position: "insideLeft",
            fill: "#71717a",
            offset: 10,
          }}
        />
        <Tooltip
          contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8 }}
          labelStyle={{ color: "#a1a1aa" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [`${Number(value || 0).toFixed(1)}%`, name]}
          labelFormatter={(label: any) => `Age: ${label} years`}
        />
        <Legend />
        <ReferenceLine y={50} stroke="#71717a" strokeDasharray="6 4" label={{ value: "50%", fill: "#71717a", position: "right" }} />
        {Object.keys(retention).map((model) => (
          <Line
            key={model}
            type="monotone"
            dataKey={model}
            stroke={COLORS[model]}
            strokeWidth={3}
            dot={{ r: 5, fill: COLORS[model] }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
