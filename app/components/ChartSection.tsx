"use client";

import { useState, useEffect, useCallback } from "react";
import DepreciationChart from "./DepreciationChart";
import RetentionChart from "./RetentionChart";
import MileageChart from "./MileageChart";

export default function ChartSection() {
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

  if (!aggregates || !scatter) {
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
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Pris per ålder</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Varje punkt är en verklig annons. Trendlinjer visar predikterat pris
            med 95% konfidensband. Filtrera på bränsletyp för att jämföra.
          </p>
        </div>
        <DepreciationChart
          scatter={scatter}
          medians={aggregates.priceByAge}
          predictionCurves={aggregates.predictionCurves}
          hiddenModels={hiddenModels}
          onToggleModel={toggleModel}
        />
      </section>

      {/* Value Retention */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Restvärde</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Andel av nypriset som behålls vid varje ålder.
            Skuggade band visar 95% prediktionsosäkerhet.
          </p>
        </div>
        <RetentionChart
          retention={aggregates.retention}
          predictionCurves={aggregates.predictionCurves}
          hiddenModels={hiddenModels}
          onToggleModel={toggleModel}
        />
      </section>

      {/* Mileage Impact */}
      <section id="mileage" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Miltalseffekt</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Hur miltal korrelerar med begärt pris för respektive modell.
          </p>
        </div>
        <MileageChart
          data={aggregates.mileageCost}
          hiddenModels={hiddenModels}
          onToggleModel={toggleModel}
        />
      </section>
    </>
  );
}
