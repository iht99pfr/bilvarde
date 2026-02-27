"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getColorsMap, getFuelOptions, getModelMeta } from "@/app/lib/model-config";
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

interface Props {
  regression: Record<string, RegressionModel>;
  tcoDefaults: Record<string, TcoDefaults>;
  modelConfig: ModelConfigMap;
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

const DEFAULT_SCENARIO: ScenarioInputs = {
  model: "RAV4",
  year: 2022,
  fuel: "Hybrid",
  mileage: 5000,
  holdingYears: 3,
  annualMileage: 1500,
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
    costPerMil: totalMilesDriven > 0 ? Math.round(valueLoss / totalMilesDriven) : 0,
    confidence: reg.residual_se,
    totalCostWithFixed: totalCost,
    monthlyTotal: Math.round(totalCost / months),
    insuranceTotal,
    serviceTotal,
    taxTotal,
  };
}

function ScenarioPanel({
  label,
  scenario,
  onChange,
  result,
  color,
  modelConfig,
  regression,
}: {
  label: string;
  scenario: ScenarioInputs;
  onChange: (s: ScenarioInputs) => void;
  result: PredictionResult | null;
  color: string;
  modelConfig: ModelConfigMap;
  regression: Record<string, RegressionModel>;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] p-5 space-y-4">
      <h3 className="font-semibold text-lg" style={{ color }}>
        {label}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Modell</label>
          <select
            value={scenario.model}
            onChange={(e) => {
              const model = e.target.value;
              const fuels = getFuelOptions(modelConfig, model);
              onChange({ ...scenario, model, fuel: fuels[0] });
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
            onChange={(e) => onChange({ ...scenario, fuel: e.target.value })}
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
            onChange={(e) => onChange({ ...scenario, year: Number(e.target.value) })}
            className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {Array.from({ length: 12 }, (_, i) => 2025 - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Nuvarande miltal</label>
          <input
            type="number"
            value={scenario.mileage}
            onChange={(e) => onChange({ ...scenario, mileage: Number(e.target.value) || 0 })}
            className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm font-mono text-[var(--foreground)]"
            step={500}
            min={0}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Behålla i (år)</label>
          <select
            value={scenario.holdingYears}
            onChange={(e) => onChange({ ...scenario, holdingYears: Number(e.target.value) })}
            className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => (
              <option key={y} value={y}>
                {y} år
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Årlig körning (mil/år)</label>
          <input
            type="number"
            value={scenario.annualMileage}
            onChange={(e) => onChange({ ...scenario, annualMileage: Number(e.target.value) || 0 })}
            className="w-full bg-white border border-[var(--border)] px-3 py-2 text-sm font-mono text-[var(--foreground)]"
            step={100}
            min={0}
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
  );
}

export default function TcoCalculator({ regression, tcoDefaults, modelConfig }: Props) {
  const COLORS = getColorsMap(modelConfig);
  const [scenarioA, setScenarioA] = useState<ScenarioInputs>({
    ...DEFAULT_SCENARIO,
  });
  const [scenarioB, setScenarioB] = useState<ScenarioInputs>({
    model: "XC60",
    year: 2024,
    fuel: "PHEV",
    mileage: 2000,
    holdingYears: 3,
    annualMileage: 1500,
  });

  const resultA = useMemo(() => {
    const reg = regression[scenarioA.model];
    const tco = tcoDefaults[scenarioA.model];
    return reg && tco ? computeTco(scenarioA, reg, tco) : null;
  }, [scenarioA, regression, tcoDefaults]);

  const resultB = useMemo(() => {
    const reg = regression[scenarioB.model];
    const tco = tcoDefaults[scenarioB.model];
    return reg && tco ? computeTco(scenarioB, reg, tco) : null;
  }, [scenarioB, regression, tcoDefaults]);

  const comparisonData = useMemo(() => {
    if (!resultA || !resultB) return null;
    return [
      {
        name: `${scenarioA.model} (${scenarioA.year})`,
        monthly: resultA.monthlyTotal,
        model: scenarioA.model,
      },
      {
        name: `${scenarioB.model} (${scenarioB.year})`,
        monthly: resultB.monthlyTotal,
        model: scenarioB.model,
      },
    ];
  }, [resultA, resultB, scenarioA, scenarioB]);

  const delta = resultA && resultB ? resultA.monthlyTotal - resultB.monthlyTotal : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScenarioPanel
          label="Scenario A"
          scenario={scenarioA}
          onChange={setScenarioA}
          result={resultA}
          color={COLORS[scenarioA.model] || "#dc2626"}
          modelConfig={modelConfig}
          regression={regression}
        />
        <ScenarioPanel
          label="Scenario B"
          scenario={scenarioB}
          onChange={setScenarioB}
          result={resultB}
          color={COLORS[scenarioB.model] || "#2563eb"}
          modelConfig={modelConfig}
          regression={regression}
        />
      </div>

      {comparisonData && (
        <div className="bg-[var(--card)] border border-[var(--border)] p-5">
          <h4 className="font-semibold mb-3 text-[var(--foreground)]">Jämförelse — månadskostnad</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={comparisonData}
              layout="vertical"
              margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k kr`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${Number(value).toLocaleString("sv-SE")} kr/mån`, "Månadskostnad"]}
              />
              <Bar dataKey="monthly" radius={[0, 4, 4, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[entry.model] || "#6b6560"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {delta !== 0 && (
            <p className="text-center mt-3 text-sm text-[var(--foreground)]">
              <span className="font-semibold" style={{ color: COLORS[scenarioA.model] }}>
                {scenarioA.model} ({scenarioA.year})
              </span>{" "}
              kostar{" "}
              <span className={`font-mono font-bold ${delta > 0 ? "text-red-600" : "text-green-600"}`}>
                {Math.abs(delta).toLocaleString("sv-SE")} kr/mån {delta > 0 ? "mer" : "mindre"}
              </span>{" "}
              än{" "}
              <span className="font-semibold" style={{ color: COLORS[scenarioB.model] }}>
                {scenarioB.model} ({scenarioB.year})
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
