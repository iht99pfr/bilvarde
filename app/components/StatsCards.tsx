"use client";

interface ModelSummary {
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgAge: number;
  avgMileage: number;
  yearRange: [number, number];
}

interface Props {
  summary: Record<string, ModelSummary>;
}

const MODEL_META: Record<string, { label: string; color: string; accent: string }> = {
  RAV4: { label: "Toyota RAV4", color: "border-red-500/50", accent: "text-red-400" },
  XC60: { label: "Volvo XC60", color: "border-blue-400/50", accent: "text-blue-400" },
  X3: { label: "BMW X3", color: "border-blue-500/50", accent: "text-blue-400" },
};

export default function StatsCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(summary).map(([model, stats]) => {
        const meta = MODEL_META[model] || { label: model, color: "border-zinc-700", accent: "text-zinc-300" };
        return (
          <div
            key={model}
            className={`bg-zinc-900 rounded-xl border-l-4 ${meta.color} p-5 space-y-3`}
          >
            <h3 className={`text-lg font-bold ${meta.accent}`}>{meta.label}</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-zinc-500">Cars scraped</div>
              <div className="text-right font-mono">{stats.count}</div>
              <div className="text-zinc-500">Avg price</div>
              <div className="text-right font-mono text-amber-400">
                {stats.avgPrice.toLocaleString()} kr
              </div>
              <div className="text-zinc-500">Price range</div>
              <div className="text-right font-mono text-xs">
                {stats.minPrice.toLocaleString()} – {stats.maxPrice.toLocaleString()}
              </div>
              <div className="text-zinc-500">Avg age</div>
              <div className="text-right font-mono">{stats.avgAge} yr</div>
              <div className="text-zinc-500">Avg mileage</div>
              <div className="text-right font-mono">
                {stats.avgMileage.toLocaleString()} mil
              </div>
              <div className="text-zinc-500">Years</div>
              <div className="text-right font-mono">
                {stats.yearRange[0]}–{stats.yearRange[1]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
