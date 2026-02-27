"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

const COLORS: Record<string, string> = {
  RAV4: "#ef4444",
  XC60: "#1e3a5f",
  X3: "#3b82f6",
};

interface ScatterPoint {
  age: number;
  price: number;
  mileage: number;
  year: number;
  fuel: string;
  hp: number;
  seller: string;
}

interface MedianPoint {
  age: number;
  median: number;
  count: number;
}

interface Props {
  scatter: Record<string, ScatterPoint[]>;
  medians: Record<string, MedianPoint[]>;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint & { model?: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold">{d.year} — {d.fuel}</p>
      <p className="text-amber-400 font-mono">{d.price.toLocaleString()} SEK</p>
      <p className="text-zinc-400">{d.mileage.toLocaleString()} mil · {d.hp} hp</p>
      <p className="text-zinc-500 text-xs">{d.seller}</p>
    </div>
  );
}

export default function DepreciationChart({ scatter, medians }: Props) {
  // Build combined data for the trend lines
  const allAges = new Set<number>();
  Object.values(medians).forEach((pts) => pts.forEach((p) => allAges.add(p.age)));
  const sortedAges = [...allAges].sort((a, b) => a - b);

  const trendData = sortedAges.map((age) => {
    const point: Record<string, number> = { age };
    for (const model of Object.keys(medians)) {
      const match = medians[model].find((p) => p.age === age);
      if (match) point[model] = match.median / 1000;
    }
    return point;
  });

  return (
    <div className="space-y-4">
      {/* Scatter plot */}
      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="age"
            type="number"
            name="Age"
            label={{ value: "Car Age (years)", position: "bottom", fill: "#71717a", offset: 0 }}
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            domain={[0, "auto"]}
          />
          <YAxis
            dataKey="price"
            type="number"
            name="Price"
            label={{ value: "Price (SEK)", angle: -90, position: "insideLeft", fill: "#71717a", offset: 10 }}
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {Object.entries(scatter).map(([model, points]) => (
            <Scatter
              key={model}
              name={model}
              data={points}
              fill={COLORS[model]}
              opacity={0.55}
              r={4}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Trend lines */}
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={trendData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="age"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            label={{ value: "Car Age (years)", position: "bottom", fill: "#71717a", offset: 0 }}
          />
          <YAxis
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickFormatter={(v: number) => `${v.toFixed(0)}k`}
            label={{ value: "Median Price (kSEK)", angle: -90, position: "insideLeft", fill: "#71717a", offset: 10 }}
          />
          <Tooltip
            contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8 }}
            labelStyle={{ color: "#a1a1aa" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [`${Number(value || 0).toFixed(0)}k SEK`, name]}
            labelFormatter={(label: any) => `Age: ${label} years`}
          />
          <Legend />
          {Object.keys(medians).map((model) => (
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
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
