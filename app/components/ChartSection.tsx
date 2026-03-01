"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useModelSelection } from "./ModelSelectionContext";
import DepreciationChart from "./DepreciationChart";
import RetentionChart from "./RetentionChart";
import MileageChart from "./MileageChart";

const FUEL_FILTERS = ["Alla", "Hybrid", "PHEV", "Diesel", "Bensin"] as const;

export default function ChartSection() {
  const { selectedModels, modelConfig, fuelFilter, setFuelFilter } = useModelSelection();
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
      {/* Shared fuel filter */}
      <div className="flex flex-wrap gap-2 mb-2">
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

      {/* Depreciation by Age */}
      <section id="depreciation" className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Pris per ålder</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Varje punkt är en verklig annons. Trendlinjer visar predikterat pris
            med 95% konfidensband.
          </p>
        </div>
        <DepreciationChart
          scatter={filteredScatter}
          medians={filteredAggregates.priceByAge}
          predictionCurves={filteredAggregates.predictionCurves}
          modelConfig={modelConfig}
          hiddenModels={hiddenModels}
          onToggleModel={toggleModel}
          fuelFilter={fuelFilter}
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
          fuelFilter={fuelFilter}
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
        {/* Mileage cost badges per model */}
        {filteredAggregates.regression && (
          <div className="flex flex-wrap gap-3">
            {Object.keys(filteredAggregates.regression)
              .filter((m) => selectedModels.has(m) && !hiddenModels.has(m))
              .map((model) => {
                const reg = filteredAggregates.regression[model];
                if (!reg?.coefficients) return null;
                const c = reg.coefficients;
                let coeff = c.mileage_mil || 0;
                // Add fuel interaction term based on current filter
                const fuelMap: Record<string, string> = { PHEV: "mileage_x_phev", El: "mileage_x_electric" };
                const interKey = fuelMap[fuelFilter];
                if (interKey && c[interKey]) coeff += c[interKey];
                const pctPer1000 = (1 - Math.exp(coeff * 1000)) * 100;
                const cfg = modelConfig[model];
                const label = cfg?.label?.split(" ").pop() || model;
                return (
                  <div
                    key={model}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: cfg?.color || "#888" }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cfg?.color || "#888" }}
                    />
                    <span className="text-[var(--muted)]">{label}</span>
                    <span className="font-mono font-semibold text-[var(--foreground)]">
                      −{pctPer1000.toFixed(2)}%
                    </span>
                    <span className="text-[var(--muted)] text-xs">av aktuellt värde per 1 000 mil</span>
                  </div>
                );
              })}
          </div>
        )}
        <MileageChart
          data={filteredAggregates.mileageCost}
          scatter={filteredScatter}
          modelConfig={modelConfig}
          hiddenModels={hiddenModels}
          onToggleModel={toggleModel}
          fuelFilter={fuelFilter}
        />
      </section>
    </>
  );
}
