"use client";

import React from "react";
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";

const COLORS: Record<string, string> = {
  RAV4: "#dc2626",
  XC60: "#2563eb",
  X3: "#0ea5e9",
};

interface RetentionPoint { age: number; retention: number; }
interface PredictionPoint { age: number; predicted: number; lower: number; upper: number; }

interface Props {
  retention: Record<string, { newPrice: number; points: RetentionPoint[] }>;
  predictionCurves?: Record<string, Record<string, PredictionPoint[]>>;
  hiddenModels: Set<string>;
  onToggleModel: (model: string) => void;
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

export default function RetentionChart({ retention, predictionCurves, hiddenModels, onToggleModel }: Props) {
  const hasPredictions = predictionCurves && Object.keys(predictionCurves).length > 0;

  const allAges = new Set<number>();
  Object.values(retention).forEach((r) => r.points.forEach((p) => allAges.add(p.age)));
  const sortedAges = [...allAges].sort((a, b) => a - b).filter((a) => a <= 15);

  const data = sortedAges.map((age) => {
    const point: Record<string, number | number[]> = { age };
    for (const [model, r] of Object.entries(retention)) {
      const match = r.points.find((p) => p.age === age);
      if (match) point[model] = Math.min(match.retention, 100);
      if (hasPredictions) {
        const curve = predictionCurves[model]?.["all"];
        const predMatch = curve?.find((p) => p.age === age);
        if (predMatch && r.newPrice > 0) {
          point[`${model}_range`] = [
            Math.round(Math.max(0, (predMatch.lower / r.newPrice) * 100) * 10) / 10,
            Math.round(Math.min(100, (predMatch.upper / r.newPrice) * 100) * 10) / 10,
          ];
        }
      }
    }
    return point;
  });

  const models = Object.keys(retention);

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="age" tick={{ fill: "var(--muted)", fontSize: 12 }}
          label={{ value: "Bilens ålder (år)", position: "bottom", fill: "var(--muted)", offset: 15 }} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          label={{ value: "% av nypris kvar", angle: -90, position: "insideLeft", fill: "var(--muted)", offset: 10 }} />
        <Tooltip
          contentStyle={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => {
            if (typeof name === "string" && name.includes("_range")) return null;
            return [`${Number(value || 0).toFixed(1)}%`, name];
          }}
          labelFormatter={(label: any) => `Ålder: ${label} år`}
        />
        <Legend verticalAlign="top" height={36} content={renderLegend(hiddenModels, onToggleModel)} />
        <ReferenceLine y={50} stroke="var(--muted)" strokeDasharray="6 4"
          label={{ value: "50%", fill: "var(--muted)", position: "right" }} />
        {hasPredictions && models.map((model) => (
          <Area key={`${model}_band`} dataKey={`${model}_range`} stroke="none"
            fill={COLORS[model]} fillOpacity={hiddenModels.has(model) ? 0 : 0.1}
            connectNulls type="monotone" legendType="none" />
        ))}
        {models.map((model) => (
          <Line key={model} type="monotone" dataKey={model} stroke={COLORS[model]}
            strokeWidth={3} dot={{ r: 5, fill: COLORS[model] }} connectNulls
            hide={hiddenModels.has(model)} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
