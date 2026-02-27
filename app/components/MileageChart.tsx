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
} from "recharts";

const COLORS: Record<string, string> = {
  RAV4: "#ef4444",
  XC60: "#1e3a5f",
  X3: "#3b82f6",
};

interface MileagePoint {
  mileage: number;
  price: number;
}

interface Props {
  data: Record<string, MileagePoint[]>;
}

export default function MileageChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="mileage"
          type="number"
          name="Mileage"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          label={{
            value: "Mileage (1000 mil / 10,000 km)",
            position: "bottom",
            fill: "#71717a",
            offset: 0,
          }}
        />
        <YAxis
          dataKey="price"
          type="number"
          name="Price"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          label={{
            value: "Price (kSEK)",
            angle: -90,
            position: "insideLeft",
            fill: "#71717a",
            offset: 10,
          }}
        />
        <Tooltip
          contentStyle={{
            background: "#27272a",
            border: "1px solid #3f3f46",
            borderRadius: 8,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => {
            if (name === "Mileage") return [`${Number(value || 0).toLocaleString()} mil`, name];
            return [`${Number(value || 0).toLocaleString()} SEK`, "Price"];
          }}
        />
        <Legend />
        {Object.entries(data).map(([model, points]) => (
          <Scatter
            key={model}
            name={model}
            data={points}
            fill={COLORS[model]}
            opacity={0.6}
            r={4}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
