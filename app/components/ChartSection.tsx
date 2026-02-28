"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useModelSelection } from "./ModelSelectionContext";
import DepreciationChart from "./DepreciationChart";
import RetentionChart from "./RetentionChart";
import MileageChart from "./MileageChart";

export default function ChartSection() {
  const { selectedModels, modelConfig } = useModelSelection();
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aggregates, setAggregates] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scatter, setScatter] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/aggregates").then((r) => r.json()),
      fetch("/api/scatter").then((r) => r.json()),
    ]).then(([agg, scat]) => {
      setAggregates(agg);
      setScatter(scat);
    });
  }, []);

  const toggleModel = useCallback((model: string) => {
    setHiddenModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return next;
    });
  }, []);

  // Filter data to only selected models
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredScatter = useMemo<any>(() => {
    if (!scatter) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered: any = {};
    for (const key of Object.keys(scatter)) {
      if (selectedModels.has(key)) filtered[key] = scatter[key];
    }
    return filtered;
  }, [scatter, selectedModels]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredAggregates = useMemo<any>(() => {
    if (!aggregates) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filterRecord = (obj: Record<string, any>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        if (selectedModels.has(key)) out[key] = obj[key];
      }
      return out;
    };
    return {
      ...aggregates,
      priceByAge: filterRecord(aggregates.priceByAge || {}),
      retention: filterRecord(aggregates.retention || {}),
      mileageCost: filterRecord(aggregates.mileageCost || {}),
      predictionCurves: filterRecord(aggregates.predictionCurves || {}),
    };
  }, [aggregates, selectedModels]);

  if (!filteredAggregates || !filteredScatter) {
    return (
      <div className="space-y-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <div className="animate-pulse h-6 bg-[var(--border)] rounded w-1/4" />
            <div className="animate-pulse h-[400px] bg-[var(--border)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Depreciation by Age */}
      <section id="depreciation" className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Pris per ålder</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Varje punkt är en verklig annons. Trendlinjer visar predikterat pris
            med 95% konfidensband. Filtrera på bränsletyp för att jämföra.
          </p>
        </div>
        <DepreciationChart
          scatter={filteredScatter}
          medians={filteredAggregates.priceByAge}
          predictionCurves={filteredAggregates.predictionCurves}
          modelConfig={modelConfig}
          hiddenModels={hiddenModels}
          onToggleModel={toggleModel}
        />
      </section>

      {/* Value Retention */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Restvärde</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Andel av nypriset som behålls vid varje ålder.
            Skuggade band visar 95% prediktionsosäkerhet.
          </p>
        </div>
        <RetentionChart
          retention={filteredAggregates.retention}
          predictionCurves={filteredAggregates.predictionCurves}
          modelConfig={modelConfig}
          hiddenModels={hiddenModels}
          onToggleModel={toggleModel}
        />
      </section>

      {/* Mileage Impact */}
      <section id="mileage" className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Miltalseffekt</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Hur miltal korrelerar med begärt pris för respektive modell.
          </p>
        </div>
        <MileageChart
          data={filteredAggregates.mileageCost}
          modelConfig={modelConfig}
          hiddenModels={hiddenModels}
          onToggleModel={toggleModel}
        />
      </section>
    </>
  );
}
