"use client";

import { useState, useMemo, useEffect } from "react";
import { getFuelOptions } from "@/app/lib/model-config";
import type { ModelConfigMap } from "@/app/lib/model-config";

interface RegressionModel {
  intercept: number;
  coefficients: Record<string, number>;
  r2: number;
  rmse: number;
  residual_se: number;
  n_samples: number;
  features: string[];
  medianHp: number;
  medianEquipment: number;
  typicalAwd: number;
}

interface TcoDefaults {
  insurancePerYear: number;
  servicePerYear: number;
  taxPerYear: number;
}

interface ScatterPoint {
  age: number;
  mileage: number;
  price: number;
  year: number;
  fuel: string;
}

interface Props {
  regression: Record<string, RegressionModel>;
  tcoDefaults: Record<string, TcoDefaults>;
  modelConfig: ModelConfigMap;
  scatter: Record<string, ScatterPoint[]>;
}

interface ScenarioInputs {
  model: string;
  year: number;
  fuel: string;
  mileage: number;
  holdingYears: number;
  annualMileage: number;
}

interface PredictionResult {
  buyPrice: number;
  sellPrice: number;
  valueLoss: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
  costPerMil: number;
  confidence: number;
  totalCostWithFixed: number;
  monthlyTotal: number;
  insuranceTotal: number;
  serviceTotal: number;
  taxTotal: number;
}

const FUEL_LABELS: Record<string, string> = {
  Hybrid: "Hybrid",
  PHEV: "PHEV",
  Diesel: "Diesel",
  Petrol: "Bensin",
  Electric: "El",
};

function predictPrice(
  reg: RegressionModel,
  age: number,
  mileage: number,
  fuel: string,
): { predicted: number; lower: number; upper: number } {
  const features: Record<string, number> = {
    car_age_years: age,
    mileage_mil: mileage,
    horsepower: reg.medianHp,
    equipment_count: reg.medianEquipment,
    is_hybrid: fuel === "Hybrid" ? 1 : 0,
    is_phev: fuel === "PHEV" ? 1 : 0,
    is_diesel: fuel === "Diesel" ? 1 : 0,
    is_electric: fuel === "Electric" ? 1 : 0,
    is_dealer: 0,
    is_awd: reg.typicalAwd,
  };

  let predicted = reg.intercept;
  for (const [key, coef] of Object.entries(reg.coefficients)) {
    predicted += coef * (features[key] || 0);
  }

  return {
    predicted: Math.max(0, Math.round(predicted)),
    lower: Math.max(0, Math.round(predicted - 1.96 * reg.residual_se)),
    upper: Math.round(predicted + 1.96 * reg.residual_se),
  };
}

function computeTco(
  scenario: ScenarioInputs,
  reg: RegressionModel,
  tcoDefault: TcoDefaults,
): PredictionResult | null {
  const currentAge = 2026 - scenario.year;
  const futureAge = currentAge + scenario.holdingYears;
  const futureMileage = scenario.mileage + scenario.annualMileage * scenario.holdingYears;

  const buy = predictPrice(reg, currentAge, scenario.mileage, scenario.fuel);
  const sell = predictPrice(reg, futureAge, futureMileage, scenario.fuel);

  const valueLoss = Math.max(0, buy.predicted - sell.predicted);
  const months = scenario.holdingYears * 12;
  const totalMilesDriven = scenario.annualMileage * scenario.holdingYears;

  const insuranceTotal = tcoDefault.insurancePerYear * scenario.holdingYears;
  const serviceTotal = tcoDefault.servicePerYear * scenario.holdingYears;
  const taxTotal = tcoDefault.taxPerYear * scenario.holdingYears;
  const fixedCosts = insuranceTotal + serviceTotal + taxTotal;

  const totalCost = valueLoss + fixedCosts;

  return {
    buyPrice: buy.predicted,
    sellPrice: sell.predicted,
    valueLoss,
    monthlyDepreciation: Math.round(valueLoss / months),
    annualDepreciation: Math.round(valueLoss / scenario.holdingYears),
    costPerMil: totalMilesDriven > 0 ? Math.round(totalCost / totalMilesDriven) : 0,
    confidence: reg.residual_se,
    totalCostWithFixed: totalCost,
    monthlyTotal: Math.round(totalCost / months),
    insuranceTotal,
    serviceTotal,
    taxTotal,
  };
}

function getMedianMileage(scatter: ScatterPoint[], year: number): number {
  const points = scatter.filter((p) => p.year === year);
  if (points.length < 3) return Math.max(0, (2026 - year) * 1500);
  const sorted = points.map((p) => p.mileage).sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length / 2)] / 100) * 100;
}

export default function TcoCalculator({ regression, tcoDefaults, modelConfig, scatter }: Props) {
  const firstModel = Object.keys(regression)[0] || "RAV4";
  const firstFuel = getFuelOptions(modelConfig, firstModel)[0] || "Hybrid";

  const [scenario, setScenario] = useState<ScenarioInputs>({
    model: firstModel,
    year: 2022,
    fuel: firstFuel,
    mileage: 5000,
    holdingYears: 3,
    annualMileage: 1500,
  });

  // Auto-populate mileage when model or year changes
  useEffect(() => {
    const points = scatter[scenario.model];
    if (points) {
      const median = getMedianMileage(points, scenario.year);
      setScenario((prev) => ({ ...prev, mileage: median }));
    }
  }, [scenario.model, scenario.year, scatter]);

  const result = useMemo(() => {
    const reg = regression[scenario.model];
    const tco = tcoDefaults[scenario.model];
    return reg && tco ? computeTco(scenario, reg, tco) : null;
  }, [scenario, regression, tcoDefaults]);

  const update = (partial: Partial<ScenarioInputs>) => {
    setScenario((prev) => ({ ...prev, ...partial }));
  };

  const scatterCount = scatter[scenario.model]?.filter((p) => p.year === scenario.year).length || 0;

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-[var(--card)] border border-[var(--border)] p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Modell</label>
            <select
              value={scenario.model}
              onChange={(e) => {
                const model = e.target.value;
                const fuels = getFuelOptions(modelConfig, model);
                update({ model, fuel: fuels[0] });
              }}
              className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {Object.entries(modelConfig)
                .filter(([key]) => regression[key])
                .map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Bränsle</label>
            <select
              value={scenario.fuel}
              onChange={(e) => update({ fuel: e.target.value })}
              className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {getFuelOptions(modelConfig, scenario.model).map((f) => (
                <option key={f} value={f}>
                  {FUEL_LABELS[f] || f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Årsmodell</label>
            <select
              value={scenario.year}
              onChange={(e) => update({ year: Number(e.target.value) })}
              className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {Array.from({ length: 12 }, (_, i) => 2025 - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Nuvarande miltal</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={scenario.mileage}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                update({ mileage: Number(v) });
              }}
              className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm font-mono text-[var(--foreground)]"
            />
            {scatterCount > 0 && (
              <p className="text-[10px] text-[var(--muted)] mt-0.5">
                Median från {scatterCount} annonser
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Behålla i (år)</label>
            <select
              value={scenario.holdingYears}
              onChange={(e) => update({ holdingYears: Number(e.target.value) })}
              className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => (
                <option key={y} value={y}>{y} år</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Årlig körning (mil/år)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={scenario.annualMileage}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                update({ annualMileage: Number(v) });
              }}
              className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm font-mono text-[var(--foreground)]"
            />
          </div>
        </div>

        {result && (
          <div className="pt-3 border-t border-[var(--border)] space-y-3">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-[var(--muted)]">Uppskattat köppris</span>
              <span className="text-right font-mono font-semibold text-[var(--foreground)]">
                {result.buyPrice.toLocaleString("sv-SE")} kr
              </span>
              <span className="text-[var(--muted)]">Uppskattat säljpris</span>
              <span className="text-right font-mono text-[var(--foreground)]">
                {result.sellPrice.toLocaleString("sv-SE")} kr
              </span>
              <span className="text-[var(--muted)]">Värdeförlust</span>
              <span className="text-right font-mono text-red-600">
                −{result.valueLoss.toLocaleString("sv-SE")} kr
              </span>
            </div>

            <div className="text-xs text-[var(--muted)] space-y-1 pt-2 border-t border-[var(--border)]">
              <div className="flex justify-between">
                <span>Försäkring ({scenario.holdingYears} år)</span>
                <span className="font-mono text-[var(--foreground)]">{result.insuranceTotal.toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between">
                <span>Service &amp; underhåll</span>
                <span className="font-mono text-[var(--foreground)]">{result.serviceTotal.toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between">
                <span>Fordonsskatt</span>
                <span className="font-mono text-[var(--foreground)]">{result.taxTotal.toLocaleString("sv-SE")} kr</span>
              </div>
            </div>

            <div className="bg-white/60 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Månadskostnad (värdeförlust)</span>
                <span className="font-mono font-semibold text-[var(--foreground)]">
                  {result.monthlyDepreciation.toLocaleString("sv-SE")} kr/mån
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Månadskostnad (totalt)</span>
                <span className="font-mono font-bold text-[var(--foreground)]">
                  {result.monthlyTotal.toLocaleString("sv-SE")} kr/mån
                </span>
              </div>
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>Kostnad per mil</span>
                <span className="font-mono">{result.costPerMil.toLocaleString("sv-SE")} kr/mil</span>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              ±{(result.confidence * 1.96 / 1000).toFixed(0)}k kr prediktionsosäkerhet (95% KI)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
