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
import { getColorsMap } from "@/app/lib/model-config";
import type { ModelConfigMap } from "@/app/lib/model-config";

interface MileagePoint { mileage: number; price: number; }
interface ScatterPoint { age: number; mileage: number; price: number; year: number; fuel: string; hp: number; seller: string; }

interface Props {
  data: Record<string, MileagePoint[]>;
  scatter?: Record<string, ScatterPoint[]>;
  hiddenModels: Set<string>;
  onToggleModel: (model: string) => void;
  modelConfig: ModelConfigMap;
  fuelFilter: string;
}

const FUEL_MAP: Record<string, string> = { Alla: "All", Bensin: "Petrol", Laddhybrid: "PHEV" };

function computeTrendLine(points: { mileage: number; price: number }[], bucketSize: number = 2000) {
  const buckets: Record<number, number[]> = {};
  for (const p of points) {
    const bucket = Math.floor(p.mileage / bucketSize) * bucketSize;
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(p.price);
  }
  const raw = Object.entries(buckets)
    .map(([m, prices]) => {
      prices.sort((a, b) => a - b);
      return { mileage: Number(m) + bucketSize / 2, median: prices[Math.floor(prices.length / 2)], count: prices.length };
    })
    .filter((p) => p.count >= 5)
    .sort((a, b) => a.mileage - b.mileage);

  // Enforce monotonic decrease — truncate at first upward spike
  const result: typeof raw = [];
  let prevMedian = Infinity;
  for (const p of raw) {
    if (p.median <= prevMedian) {
      result.push(p);
      prevMedian = p.median;
    }
    // Stop at first violation — data beyond is too sparse
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLegend(hiddenModels: Set<string>, onToggle: (model: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seen = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (props.payload || []).filter((e: any) => {
      if (String(e.value).includes("_range") || seen.has(e.value)) return false;
      seen.add(e.value);
      return true;
    });
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {items.map((entry: any, index: number) => {
          const isHidden = hiddenModels.has(entry.value);
          return (
            <span
              key={`legend-${index}`}
              onClick={() => onToggle(entry.value)}
              style={{
                cursor: "pointer",
                opacity: isHidden ? 0.35 : 1,
                textDecoration: isHidden ? "line-through" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                userSelect: "none",
              }}
            >
              <svg width={10} height={10}>
                <circle cx={5} cy={5} r={5} fill={entry.color} />
              </svg>
              <span style={{ color: "var(--muted)", fontSize: 14 }}>{entry.value}</span>
            </span>
          );
        })}
      </div>
    );
  };
}

export default function MileageChart({ data, scatter, hiddenModels, onToggleModel, modelConfig, fuelFilter }: Props) {
  const COLORS = getColorsMap(modelConfig);
  const internalFuel = FUEL_MAP[fuelFilter] || fuelFilter;
  const isFiltered = internalFuel !== "All";

  // When fuel is filtered and we have scatter data, use scatter points filtered by fuel
  const displayData = useMemo(() => {
    if (isFiltered && scatter) {
      const result: Record<string, MileagePoint[]> = {};
      for (const [model, points] of Object.entries(scatter)) {
        result[model] = points
          .filter((p) => p.fuel === internalFuel)
          .map((p) => ({ mileage: p.mileage, price: p.price }));
      }
      return result;
    }
    return data;
  }, [data, scatter, isFiltered, internalFuel]);

  const trendLines = useMemo(() => {
    const result: Record<string, { mileage: number; median: number }[]> = {};
    for (const [model, points] of Object.entries(displayData)) result[model] = computeTrendLine(points);
    return result;
  }, [displayData]);

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

  const models = Object.keys(displayData);

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
        <Legend verticalAlign="top" height={36} content={renderLegend(hiddenModels, onToggleModel)} />
        {models.map((model) => (
          hiddenModels.has(model)
            ? <Scatter key={model} name={model} data={[]} dataKey="price"
                fill={COLORS[model]} opacity={0.5} r={3} legendType="circle" />
            : <Scatter key={model} name={model} data={displayData[model]} dataKey="price"
                fill={COLORS[model]} opacity={0.5} r={3} legendType="circle" />
        ))}
        {Object.keys(trendLines).map((model) => (
          <Line key={`${model}_trend`} type="monotone" dataKey={model} stroke={COLORS[model]}
            strokeWidth={3} dot={false} connectNulls legendType="none"
            hide={hiddenModels.has(model)} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
