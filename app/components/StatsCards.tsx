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

const MODEL_META: Record<string, { label: string; color: string }> = {
  RAV4: { label: "Toyota RAV4", color: "border-red-400" },
  XC60: { label: "Volvo XC60", color: "border-blue-400" },
  X3: { label: "BMW X3", color: "border-sky-500" },
};

export default function StatsCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(summary).map(([model, stats]) => {
        const meta = MODEL_META[model] || { label: model, color: "border-stone-300" };
        return (
          <div
            key={model}
            className={`bg-[var(--card)] border-l-4 ${meta.color} p-5 space-y-3`}
          >
            <h3 className="text-lg font-bold">{meta.label}</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-[var(--muted)]">Antal annonser</div>
              <div className="text-right font-mono text-[var(--foreground)]">{stats.count}</div>
              <div className="text-[var(--muted)]">Snittpris</div>
              <div className="text-right font-mono font-semibold text-[var(--foreground)]">
                {stats.avgPrice.toLocaleString("sv-SE")} kr
              </div>
              <div className="text-[var(--muted)]">Prisintervall</div>
              <div className="text-right font-mono text-xs">
                {stats.minPrice.toLocaleString("sv-SE")} – {stats.maxPrice.toLocaleString("sv-SE")}
              </div>
              <div className="text-[var(--muted)]">Snittålder</div>
              <div className="text-right font-mono">{stats.avgAge} år</div>
              <div className="text-[var(--muted)]">Snitt miltal</div>
              <div className="text-right font-mono">
                {stats.avgMileage.toLocaleString("sv-SE")} mil
              </div>
              <div className="text-[var(--muted)]">Årsmodeller</div>
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
