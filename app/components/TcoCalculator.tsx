"use client";

import { useState, useMemo, useEffect } from "react";
import { getFuelOptions } from "@/app/lib/model-config";
import type { ModelConfigMap } from "@/app/lib/model-config";
import { computeOwnershipCosts, computeFuelCost, FUEL_PRICES } from "@/app/lib/tco-costs";
import type { FuelCostResult } from "@/app/lib/tco-costs";

interface RegressionModel {
  intercept: number;
  coefficients: Record<string, number>;
  r2: number;
  rmse: number;
  residual_se_log: number;
  log_transform: boolean;
  n_samples: number;
  features: string[];
  medianHp: number;
  medianEquipment: number;
  typicalAwd: number;
}

interface ScatterPoint {
  age: number;
  mileage: number;
  price: number;
  year: number;
  fuel: string;
}

interface CurvePoint {
  age: number;
  predicted: number;
  lower: number;
  upper: number;
  mileage: number;
}

interface Props {
  regression: Record<string, RegressionModel>;
  tcoDefaults?: Record<string, unknown>; // legacy, no longer used
  modelConfig: ModelConfigMap;
  scatter: Record<string, ScatterPoint[]>;
  predictionCurves: Record<string, Record<string, CurvePoint[]>>;
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
  repairTotal: number;
  taxTotal: number;
  fuelCost: FuelCostResult;
}

const FUEL_LABELS: Record<string, string> = {
  Hybrid: "Hybrid",
  PHEV: "PHEV",
  Diesel: "Diesel",
  Petrol: "Bensin",
  Electric: "El",
};

/** Look up a prediction curve point by age, clamping predicted to >= 0 */
function curveAt(curve: CurvePoint[], age: number): CurvePoint | null {
  const point = curve.find((p) => p.age === age);
  if (!point) return null;
  return { ...point, predicted: Math.max(0, point.predicted) };
}

/** Get effective mileage coefficient including fuel interaction terms */
function getEffectiveMileageCoeff(reg: RegressionModel, fuel: string): number {
  let coeff = reg.coefficients.mileage_mil || 0;
  if (fuel === "PHEV") coeff += reg.coefficients.mileage_x_phev || 0;
  if (fuel === "Electric") coeff += reg.coefficients.mileage_x_electric || 0;
  return coeff;
}

function computeTco(
  scenario: ScenarioInputs,
  reg: RegressionModel,
  curve: CurvePoint[] | undefined,
): PredictionResult | null {
  const currentAge = 2026 - scenario.year;
  const futureAge = currentAge + scenario.holdingYears;

  let buyPrice: number;
  let sellPrice: number;

  const buyPoint = curve && curveAt(curve, currentAge);
  const sellPoint = curve && curveAt(curve, futureAge);

  if (buyPoint && sellPoint) {
    // Curve-based pricing — captures non-linear depreciation
    // Adjust buy price for mileage deviation from typical at this age
    const mileageCoeff = getEffectiveMileageCoeff(reg, scenario.fuel);
    const buyMileageDelta = scenario.mileage - buyPoint.mileage;
    // Log-transform coefficients are in log-space, so adjustment is multiplicative
    if (reg.log_transform) {
      buyPrice = Math.max(0, Math.round(buyPoint.predicted * Math.exp(mileageCoeff * buyMileageDelta)));
    } else {
      buyPrice = Math.max(0, Math.round(buyPoint.predicted + mileageCoeff * buyMileageDelta));
    }

    // Sell price from curve (market value at that age)
    sellPrice = Math.max(0, Math.round(sellPoint.predicted));
  } else {
    // Fallback: simple regression (linear, same loss regardless of year)
    const mileageCoeff = getEffectiveMileageCoeff(reg, scenario.fuel);
    const futureMileage = scenario.mileage + scenario.annualMileage * scenario.holdingYears;

    let buyPred = reg.intercept;
    let sellPred = reg.intercept;
    for (const [key, coef] of Object.entries(reg.coefficients)) {
      const buyFeatures: Record<string, number> = {
        car_age_years: currentAge,
        mileage_mil: scenario.mileage,
        horsepower: reg.medianHp,
        equipment_count: reg.medianEquipment,
        is_hybrid: scenario.fuel === "Hybrid" ? 1 : 0,
        is_phev: scenario.fuel === "PHEV" ? 1 : 0,
        is_diesel: scenario.fuel === "Diesel" ? 1 : 0,
        is_electric: scenario.fuel === "Electric" ? 1 : 0,
        is_dealer: 0,
        is_awd: reg.typicalAwd,
        age_x_phev: scenario.fuel === "PHEV" ? currentAge : 0,
        age_x_electric: scenario.fuel === "Electric" ? currentAge : 0,
        mileage_x_phev: scenario.fuel === "PHEV" ? scenario.mileage : 0,
        mileage_x_electric: scenario.fuel === "Electric" ? scenario.mileage : 0,
      };
      buyPred += coef * (buyFeatures[key] || 0);

      const sellFeatures: Record<string, number> = {
        ...buyFeatures,
        car_age_years: futureAge,
        mileage_mil: futureMileage,
        age_x_phev: scenario.fuel === "PHEV" ? futureAge : 0,
        age_x_electric: scenario.fuel === "Electric" ? futureAge : 0,
        mileage_x_phev: scenario.fuel === "PHEV" ? futureMileage : 0,
        mileage_x_electric: scenario.fuel === "Electric" ? futureMileage : 0,
      };
      sellPred += coef * (sellFeatures[key] || 0);
    }
    if (reg.log_transform) {
      buyPred = Math.exp(buyPred);
      sellPred = Math.exp(sellPred);
    }
    buyPrice = Math.max(0, Math.round(buyPred));
    sellPrice = Math.max(0, Math.round(sellPred));
  }

  const valueLoss = Math.max(0, buyPrice - sellPrice);
  const months = scenario.holdingYears * 12;
  const totalMilesDriven = scenario.annualMileage * scenario.holdingYears;

  const costs = computeOwnershipCosts(scenario.model, scenario.fuel, currentAge, scenario.holdingYears);
  const insuranceTotal = costs.insurance;
  const serviceTotal = costs.service;
  const repairTotal = costs.repair;
  const taxTotal = costs.tax;
  const fuelCost = computeFuelCost(scenario.model, scenario.fuel, scenario.annualMileage, scenario.holdingYears);
  const fixedCosts = insuranceTotal + serviceTotal + repairTotal + taxTotal + fuelCost.total;

  const totalCost = valueLoss + fixedCosts;

  return {
    buyPrice,
    sellPrice,
    valueLoss,
    monthlyDepreciation: Math.round(valueLoss / months),
    annualDepreciation: Math.round(valueLoss / scenario.holdingYears),
    costPerMil: totalMilesDriven > 0 ? Math.round(totalCost / totalMilesDriven) : 0,
    confidence: reg.residual_se_log,
    totalCostWithFixed: totalCost,
    monthlyTotal: Math.round(totalCost / months),
    insuranceTotal,
    serviceTotal,
    repairTotal,
    taxTotal,
    fuelCost,
  };
}

function getMedianMileage(scatter: ScatterPoint[], year: number): number {
  const points = scatter.filter((p) => p.year === year);
  if (points.length < 3) return Math.max(0, (2026 - year) * 1500);
  const sorted = points.map((p) => p.mileage).sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length / 2)] / 100) * 100;
}

export default function TcoCalculator({ regression, modelConfig, scatter, predictionCurves }: Props) {
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
    if (!reg) return null;

    // Get fuel-specific curve, falling back to 'all'
    const modelCurves = predictionCurves[scenario.model];
    const curve = modelCurves?.[scenario.fuel] || modelCurves?.["all"];

    return computeTco(scenario, reg, curve);
  }, [scenario, regression, predictionCurves]);

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
                <span>Service</span>
                <span className="font-mono text-[var(--foreground)]">{result.serviceTotal.toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between">
                <span>Reparation &amp; underhåll</span>
                <span className="font-mono text-[var(--foreground)]">{result.repairTotal.toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between">
                <span>Fordonsskatt</span>
                <span className="font-mono text-[var(--foreground)]">{result.taxTotal.toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between">
                <span>Drivmedel ({result.fuelCost.label})</span>
                <span className="font-mono text-[var(--foreground)]">{result.fuelCost.total.toLocaleString("sv-SE")} kr</span>
              </div>
              <p className="text-[10px] text-[var(--muted)] pt-0.5">
                Bensin {FUEL_PRICES.petrol} kr/l, diesel {FUEL_PRICES.diesel} kr/l, el {FUEL_PRICES.electricity} kr/kWh
              </p>
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
              ±{((Math.exp(1.96 * result.confidence) - 1) * 100).toFixed(0)}% prediktionsosäkerhet (95% KI)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
