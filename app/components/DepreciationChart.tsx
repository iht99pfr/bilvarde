"use client";

import { useState, useCallback } from "react";
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
  RAV4: "#dc2626",
  XC60: "#2563eb",
  X3: "#0ea5e9",
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

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[var(--border)] rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-[var(--foreground)]">{d.year} — {d.fuel}</p>
      <p className="font-mono font-semibold">{d.price.toLocaleString("sv-SE")} kr</p>
      <p className="text-[var(--muted)]">{d.mileage.toLocaleString("sv-SE")} mil · {d.hp} hk</p>
      <p className="text-[var(--muted)] text-xs">{d.seller === "dealer" ? "Handlare" : "Privat"}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLegend(hiddenModels: Set<string>, onToggle: (model: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { payload } = props;
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload?.map((entry: any, index: number) => {
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

const FUEL_FILTERS = ["Alla", "Hybrid", "PHEV", "Diesel", "Bensin"] as const;
const FUEL_MAP: Record<string, string> = { Alla: "All", Bensin: "Petrol" };

export default function DepreciationChart({ scatter, medians, predictionCurves }: Props) {
  const [fuelFilter, setFuelFilter] = useState<string>("Alla");
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());

  const toggleModel = useCallback(
    (model: string) => {
      setHiddenModels((prev) => {
        const next = new Set(prev);
        if (next.has(model)) next.delete(model);
        else next.add(model);
        return next;
      });
    },
    []
  );

  const internalFuel = FUEL_MAP[fuelFilter] || fuelFilter;

  const filteredScatter: Record<string, ScatterPoint[]> = {};
  for (const [model, points] of Object.entries(scatter)) {
    filteredScatter[model] = internalFuel === "All"
      ? points
      : points.filter((p) => p.fuel === internalFuel);
  }

  const models = Object.keys(medians);
  const hasPredictions = predictionCurves && Object.keys(predictionCurves).length > 0;
  const modelsWithCurve: string[] = [];

  let trendData: Record<string, number | number[]>[];

  if (hasPredictions) {
    const curveKey = internalFuel === "All" ? "all" : internalFuel;
    const allAges = new Set<number>();
    for (const model of models) {
      const curve = predictionCurves[model]?.[curveKey];
      if (curve) {
        modelsWithCurve.push(model);
        curve.forEach((p) => allAges.add(p.age));
      }
    }
    trendData = [...allAges].sort((a, b) => a - b).filter(a => a <= 20).map((age) => {
      const point: Record<string, number | number[]> = { age };
      for (const model of modelsWithCurve) {
        const curve = predictionCurves[model]?.[curveKey];
        const match = curve?.find((p) => p.age === age);
        if (match) {
          point[model] = Math.max(0, match.predicted) / 1000;
          point[`${model}_range`] = [Math.max(0, match.lower) / 1000, Math.max(0, match.upper) / 1000];
        }
      }
      return point;
    });
  } else {
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
    modelsWithCurve.push(...models);
  }

  const visibleModelsWithCurve = modelsWithCurve.filter((m) => !hiddenModels.has(m));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FUEL_FILTERS.map((fuel) => (
          <button
            key={fuel}
            onClick={() => setFuelFilter(fuel)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              fuelFilter === fuel
                ? "bg-[var(--foreground)] text-white"
                : "bg-white text-[var(--muted)] border border-[var(--border)] hover:border-[var(--muted)]"
            }`}
          >
            {fuel === "Alla" ? "Alla bränslen" : fuel}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="age" type="number" name="Age"
            label={{ value: "Bilens ålder (år)", position: "bottom", fill: "var(--muted)", offset: 15 }}
            tick={{ fill: "var(--muted)", fontSize: 12 }} domain={[0, "auto"]} />
          <YAxis dataKey="price" type="number" name="Price"
            label={{ value: "Pris (kr)", angle: -90, position: "insideLeft", fill: "var(--muted)", offset: 10 }}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} domain={[0, "auto"]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} content={renderLegend(hiddenModels, toggleModel)} />
          {Object.entries(filteredScatter).map(([model, points]) => (
            points.length > 0 && !hiddenModels.has(model) && (
              <Scatter key={model} name={model} data={points} fill={COLORS[model]} opacity={0.6} r={4} />
            )
          ))}
          {/* Invisible scatters for hidden models so they still appear in the legend */}
          {Object.keys(filteredScatter).filter((m) => hiddenModels.has(m)).map((model) => (
            <Scatter key={model} name={model} data={[]} fill={COLORS[model]} opacity={0.6} r={4} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {modelsWithCurve.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={trendData} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="age" tick={{ fill: "var(--muted)", fontSize: 12 }}
              label={{ value: "Bilens ålder (år)", position: "bottom", fill: "var(--muted)", offset: 15 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }}
              tickFormatter={(v: number) => `${v.toFixed(0)}k`} domain={[0, "auto"]}
              label={{ value: "Predikterat pris (tkr)", angle: -90, position: "insideLeft", fill: "var(--muted)", offset: 10 }} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                if (typeof name === "string" && name.includes("_range")) return null;
                return [`${Number(value || 0).toFixed(0)}k kr`, name];
              }}
              labelFormatter={(label: any) => `Ålder: ${label} år`}
            />
            <Legend verticalAlign="top" height={36} content={renderLegend(hiddenModels, toggleModel)} />
            {hasPredictions && modelsWithCurve.map((model) => (
              <Area key={`${model}_band`} dataKey={`${model}_range`} stroke="none"
                fill={COLORS[model]} fillOpacity={hiddenModels.has(model) ? 0 : 0.1}
                connectNulls type="monotone" legendType="none" />
            ))}
            {modelsWithCurve.map((model) => (
              <Line key={model} type="monotone" dataKey={model} stroke={COLORS[model]}
                strokeWidth={3} dot={{ r: 4, fill: COLORS[model] }} connectNulls
                hide={hiddenModels.has(model)} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-8 text-[var(--muted)] text-sm">
          Ingen prediktionskurva tillgänglig för &ldquo;{fuelFilter}&rdquo;.
          Otillräckligt med datapunkter för detta bränsle.
        </div>
      )}

      {hasPredictions && visibleModelsWithCurve.length > 0 && (
        <p className="text-xs text-[var(--muted)] text-center">
          Skuggade band visar 95% prediktionsintervall från multivariat regression
          (justerat för bränsletyp, miltal, hk, utrustning, drivlina)
        </p>
      )}
    </div>
  );
}
