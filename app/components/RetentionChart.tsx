"use client";

import {
  LineChart,
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
  RAV4: "#ef4444",
  XC60: "#60a5fa",
  X3: "#3b82f6",
};

interface RetentionPoint {
  age: number;
  retention: number;
}

interface PredictionPoint {
  age: number;
  predicted: number;
  lower: number;
  upper: number;
}

interface Props {
  retention: Record<string, { newPrice: number; points: RetentionPoint[] }>;
  predictionCurves?: Record<string, Record<string, PredictionPoint[]>>;
}

export default function RetentionChart({ retention, predictionCurves }: Props) {
  const hasPredictions = predictionCurves && Object.keys(predictionCurves).length > 0;

  // Combine all ages
  const allAges = new Set<number>();
  Object.values(retention).forEach((r) =>
    r.points.forEach((p) => allAges.add(p.age))
  );
  const sortedAges = [...allAges].sort((a, b) => a - b).filter((a) => a <= 15);

  const data = sortedAges.map((age) => {
    const point: Record<string, number | number[]> = { age };
    for (const [model, r] of Object.entries(retention)) {
      const match = r.points.find((p) => p.age === age);
      if (match) point[model] = Math.min(match.retention, 100);

      // Add confidence band from prediction curves
      if (hasPredictions) {
        const curve = predictionCurves[model]?.["all"];
        const predMatch = curve?.find((p) => p.age === age);
        if (predMatch && r.newPrice > 0) {
          const retLower = Math.max(0, (predMatch.lower / r.newPrice) * 100);
          const retUpper = Math.min(100, (predMatch.upper / r.newPrice) * 100);
          point[`${model}_range`] = [
            Math.round(retLower * 10) / 10,
            Math.round(retUpper * 10) / 10,
          ];
        }
      }
    }
    return point;
  });

  const ChartComponent = hasPredictions ? ComposedChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ChartComponent data={data} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="age"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          label={{ value: "Car Age (years)", position: "bottom", fill: "#71717a", offset: 15 }}
        />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          domain={[0, 100]}
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
          formatter={(value: any, name: any) => {
            if (typeof name === "string" && name.includes("_range")) return null;
            return [`${Number(value || 0).toFixed(1)}%`, name];
          }}
          labelFormatter={(label: any) => `Age: ${label} years`}
        />
        <Legend verticalAlign="top" height={36} />
        <ReferenceLine y={50} stroke="#71717a" strokeDasharray="6 4" label={{ value: "50%", fill: "#71717a", position: "right" }} />
        {hasPredictions && Object.keys(retention).map((model) => (
          <Area
            key={`${model}_band`}
            dataKey={`${model}_range`}
            stroke="none"
            fill={COLORS[model]}
            fillOpacity={0.1}
            connectNulls
            type="monotone"
            legendType="none"
          />
        ))}
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
      </ChartComponent>
    </ResponsiveContainer>
  );
}
