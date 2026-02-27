"use client";

import { useState } from "react";
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
  Area,
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

interface PredictionPoint {
  age: number;
  predicted: number;
  lower: number;
  upper: number;
}

interface Props {
  scatter: Record<string, ScatterPoint[]>;
  medians: Record<string, MedianPoint[]>;
  predictionCurves?: Record<string, Record<string, PredictionPoint[]>>;
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

const FUEL_FILTERS = ["All", "Hybrid", "PHEV", "Diesel", "Petrol"] as const;

export default function DepreciationChart({ scatter, medians, predictionCurves }: Props) {
  const [fuelFilter, setFuelFilter] = useState<string>("All");

  // Filter scatter points by fuel
  const filteredScatter: Record<string, ScatterPoint[]> = {};
  for (const [model, points] of Object.entries(scatter)) {
    filteredScatter[model] = fuelFilter === "All"
      ? points
      : points.filter((p) => p.fuel === fuelFilter);
  }

  // Build trend line data — use prediction curves if available, otherwise medians
  const models = Object.keys(medians);
  const hasPredictions = predictionCurves && Object.keys(predictionCurves).length > 0;

  let trendData: Record<string, number | number[]>[];

  if (hasPredictions) {
    // Use prediction curves with confidence bands
    const curveKey = fuelFilter === "All" ? "all" : fuelFilter;
    const allAges = new Set<number>();
    for (const model of models) {
      const curve = predictionCurves[model]?.[curveKey] || predictionCurves[model]?.["all"];
      if (curve) curve.forEach((p) => allAges.add(p.age));
    }
    trendData = [...allAges].sort((a, b) => a - b).filter(a => a <= 20).map((age) => {
      const point: Record<string, number | number[]> = { age };
      for (const model of models) {
        const curve = predictionCurves[model]?.[curveKey] || predictionCurves[model]?.["all"];
        const match = curve?.find((p) => p.age === age);
        if (match) {
          point[model] = match.predicted / 1000;
          point[`${model}_range`] = [match.lower / 1000, match.upper / 1000];
        }
      }
      return point;
    });
  } else {
    // Fallback to medians
    const allAges = new Set<number>();
    Object.values(medians).forEach((pts) => pts.forEach((p) => allAges.add(p.age)));
    trendData = [...allAges].sort((a, b) => a - b).map((age) => {
      const point: Record<string, number | number[]> = { age };
      for (const model of models) {
        const match = medians[model].find((p) => p.age === age);
        if (match) point[model] = match.median / 1000;
      }
      return point;
    });
  }

  return (
    <div className="space-y-4">
      {/* Fuel filter toggles */}
      <div className="flex flex-wrap gap-2">
        {FUEL_FILTERS.map((fuel) => (
          <button
            key={fuel}
            onClick={() => setFuelFilter(fuel)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              fuelFilter === fuel
                ? "bg-amber-400/20 text-amber-400 border border-amber-400/40"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
            }`}
          >
            {fuel === "All" ? "All Fuels" : fuel}
          </button>
        ))}
      </div>

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
          {Object.entries(filteredScatter).map(([model, points]) => (
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

      {/* Trend lines with confidence bands */}
      <ResponsiveContainer width="100%" height={400}>
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
            label={{ value: "Predicted Price (kSEK)", angle: -90, position: "insideLeft", fill: "#71717a", offset: 10 }}
          />
          <Tooltip
            contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8 }}
            labelStyle={{ color: "#a1a1aa" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => {
              if (typeof name === "string" && name.includes("_range")) return null;
              return [`${Number(value || 0).toFixed(0)}k SEK`, name];
            }}
            labelFormatter={(label: any) => `Age: ${label} years`}
          />
          <Legend />
          {hasPredictions && models.map((model) => (
            <Area
              key={`${model}_band`}
              dataKey={`${model}_range`}
              stroke="none"
              fill={COLORS[model]}
              fillOpacity={0.12}
              connectNulls
              type="monotone"
              legendType="none"
            />
          ))}
          {models.map((model) => (
            <Line
              key={model}
              type="monotone"
              dataKey={model}
              stroke={COLORS[model]}
              strokeWidth={3}
              dot={{ r: 4, fill: COLORS[model] }}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {hasPredictions && (
        <p className="text-xs text-zinc-600 text-center">
          Shaded bands show 95% prediction intervals from multivariate regression
          (accounting for fuel type, mileage, HP, equipment, drivetrain)
        </p>
      )}
    </div>
  );
}
