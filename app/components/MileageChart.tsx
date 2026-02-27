"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS: Record<string, string> = {
  RAV4: "#dc2626",
  XC60: "#2563eb",
  X3: "#0ea5e9",
};

interface MileagePoint { mileage: number; price: number; }
interface Props { data: Record<string, MileagePoint[]>; }

function computeTrendLine(points: MileagePoint[], bucketSize: number = 2000) {
  const buckets: Record<number, number[]> = {};
  for (const p of points) {
    const bucket = Math.floor(p.mileage / bucketSize) * bucketSize;
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(p.price);
  }
  return Object.entries(buckets)
    .map(([m, prices]) => {
      prices.sort((a, b) => a - b);
      return { mileage: Number(m) + bucketSize / 2, median: prices[Math.floor(prices.length / 2)], count: prices.length };
    })
    .filter((p) => p.count >= 2)
    .sort((a, b) => a.mileage - b.mileage);
}

export default function MileageChart({ data }: Props) {
  const trendLines = useMemo(() => {
    const result: Record<string, { mileage: number; median: number }[]> = {};
    for (const [model, points] of Object.entries(data)) result[model] = computeTrendLine(points);
    return result;
  }, [data]);

  const trendData = useMemo(() => {
    const allMileages = new Set<number>();
    Object.values(trendLines).forEach((pts) => pts.forEach((p) => allMileages.add(p.mileage)));
    return [...allMileages].sort((a, b) => a - b).map((mileage) => {
      const point: Record<string, number> = { mileage };
      for (const [model, pts] of Object.entries(trendLines)) {
        const match = pts.find((p) => p.mileage === mileage);
        if (match) point[model] = match.median;
      }
      return point;
    });
  }, [trendLines]);

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ComposedChart data={trendData} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mileage" type="number" tick={{ fill: "var(--muted)", fontSize: 12 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          label={{ value: "Miltal (mil)", position: "bottom", fill: "var(--muted)", offset: 15 }} />
        <YAxis type="number" tick={{ fill: "var(--muted)", fontSize: 12 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} domain={[0, "auto"]}
          label={{ value: "Pris (tkr)", angle: -90, position: "insideLeft", fill: "var(--muted)", offset: 10 }} />
        <Tooltip
          contentStyle={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [`${Number(value || 0).toLocaleString("sv-SE")} kr`, name]}
          labelFormatter={(label: any) => `${Number(label).toLocaleString("sv-SE")} mil`}
        />
        <Legend verticalAlign="top" height={36} />
        {Object.entries(data).map(([model, points]) => (
          <Scatter key={model} name={model} data={points} dataKey="price"
            fill={COLORS[model]} opacity={0.5} r={3} legendType="circle" />
        ))}
        {Object.keys(trendLines).map((model) => (
          <Line key={`${model}_trend`} type="monotone" dataKey={model} stroke={COLORS[model]}
            strokeWidth={3} dot={false} connectNulls legendType="none" />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
