"use client";

import type { ModelConfigMap } from "@/app/lib/model-config";
import { getModelMeta } from "@/app/lib/model-config";

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
  modelConfig: ModelConfigMap;
  selectedModels: Set<string>;
}

export default function StatsCards({ summary, modelConfig, selectedModels }: Props) {
  const filtered = Object.entries(summary).filter(([model]) => selectedModels.has(model));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map(([model, stats]) => {
        const meta = getModelMeta(modelConfig, model);
        return (
          <div
            key={model}
            className={`bg-[var(--card)] border-l-4 ${meta.borderClass} p-5 space-y-3`}
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
