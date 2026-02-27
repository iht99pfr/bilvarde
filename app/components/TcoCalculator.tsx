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

const COLORS: Record<string, string> = {
  RAV4: "#ef4444",
  XC60: "#1e3a5f",
  X3: "#3b82f6",
};

interface RegressionModel {
  intercept: number;
  coefficients: Record<string, number>;
  r2: number;
  rmse: number;
  residual_se: number;
  n_samples: number;
  features: string[];
}

interface TcoDefaults {
  insurancePerYear: number;
  servicePerYear: number;
  taxPerYear: number;
}

interface Props {
  regression: Record<string, RegressionModel>;
  tcoDefaults: Record<string, TcoDefaults>;
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
}

const FUEL_OPTIONS: Record<string, string[]> = {
  RAV4: ["Hybrid", "Petrol"],
  XC60: ["PHEV", "Hybrid", "Diesel", "Petrol"],
  X3: ["PHEV", "Diesel", "Petrol"],
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
  isAwd: boolean,
): { predicted: number; lower: number; upper: number } {
  const features: Record<string, number> = {
    car_age_years: age,
    mileage_mil: mileage,
    horsepower: 200, // typical midrange
    equipment_count: 20,
    is_hybrid: fuel === "Hybrid" ? 1 : 0,
    is_phev: fuel === "PHEV" ? 1 : 0,
    is_diesel: fuel === "Diesel" ? 1 : 0,
    is_electric: fuel === "Electric" ? 1 : 0,
    is_dealer: 0,
    is_awd: isAwd ? 1 : 0,
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
  const isAwd = scenario.model !== "X3"; // RAV4 and XC60 mostly AWD

  const buy = predictPrice(reg, currentAge, scenario.mileage, scenario.fuel, isAwd);
  const sell = predictPrice(reg, futureAge, futureMileage, scenario.fuel, isAwd);

  const valueLoss = Math.max(0, buy.predicted - sell.predicted);
  const months = scenario.holdingYears * 12;
  const totalMilesDriven = scenario.annualMileage * scenario.holdingYears;

  const fixedCosts =
    (tcoDefault.insurancePerYear + tcoDefault.servicePerYear + tcoDefault.taxPerYear) *
    scenario.holdingYears;

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
  };
}

function ScenarioPanel({
  label,
  scenario,
  onChange,
  result,
  color,
}: {
  label: string;
  scenario: ScenarioInputs;
  onChange: (s: ScenarioInputs) => void;
  result: PredictionResult | null;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-4">
      <h3 className="font-semibold text-lg" style={{ color }}>
        {label}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Model</label>
          <select
            value={scenario.model}
            onChange={(e) => {
              const model = e.target.value;
              const fuels = FUEL_OPTIONS[model] || ["Petrol"];
              onChange({ ...scenario, model, fuel: fuels[0] });
            }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="RAV4">Toyota RAV4</option>
            <option value="XC60">Volvo XC60</option>
            <option value="X3">BMW X3</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Fuel type</label>
          <select
            value={scenario.fuel}
            onChange={(e) => onChange({ ...scenario, fuel: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            {(FUEL_OPTIONS[scenario.model] || ["Petrol"]).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Model year</label>
          <select
            value={scenario.year}
            onChange={(e) => onChange({ ...scenario, year: Number(e.target.value) })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => 2025 - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Current mileage (mil)</label>
          <input
            type="number"
            value={scenario.mileage}
            onChange={(e) => onChange({ ...scenario, mileage: Number(e.target.value) || 0 })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono"
            step={500}
            min={0}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Hold for (years)</label>
          <select
            value={scenario.holdingYears}
            onChange={(e) => onChange({ ...scenario, holdingYears: Number(e.target.value) })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => (
              <option key={y} value={y}>
                {y} {y === 1 ? "year" : "years"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Annual mileage (mil/yr)</label>
          <input
            type="number"
            value={scenario.annualMileage}
            onChange={(e) => onChange({ ...scenario, annualMileage: Number(e.target.value) || 0 })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono"
            step={100}
            min={0}
          />
        </div>
      </div>

      {result && (
        <div className="pt-3 border-t border-zinc-800 space-y-3">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-zinc-500">Est. buy price</span>
            <span className="text-right font-mono text-amber-400">
              {result.buyPrice.toLocaleString()} kr
            </span>
            <span className="text-zinc-500">Est. sell price</span>
            <span className="text-right font-mono text-zinc-300">
              {result.sellPrice.toLocaleString()} kr
            </span>
            <span className="text-zinc-500">Value loss</span>
            <span className="text-right font-mono text-red-400">
              −{result.valueLoss.toLocaleString()} kr
            </span>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Monthly depreciation</span>
              <span className="font-mono font-semibold text-amber-400">
                {result.monthlyDepreciation.toLocaleString()} kr/mo
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Monthly total (incl. fixed)</span>
              <span className="font-mono font-semibold">
                {result.monthlyTotal.toLocaleString()} kr/mo
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Cost per mil driven</span>
              <span className="font-mono">{result.costPerMil.toLocaleString()} kr/mil</span>
            </div>
          </div>
          <p className="text-xs text-zinc-600">
            ±{(result.confidence * 1.96 / 1000).toFixed(0)}k SEK prediction uncertainty (95% CI)
          </p>
        </div>
      )}
    </div>
  );
}

export default function TcoCalculator({ regression, tcoDefaults }: Props) {
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

  // Comparison bar chart
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
          color={COLORS[scenarioA.model] || "#ef4444"}
        />
        <ScenarioPanel
          label="Scenario B"
          scenario={scenarioB}
          onChange={setScenarioB}
          result={resultB}
          color={COLORS[scenarioB.model] || "#3b82f6"}
        />
      </div>

      {comparisonData && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h4 className="font-semibold mb-3">Monthly Cost Comparison</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={comparisonData}
              layout="vertical"
              margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${Number(value).toLocaleString()} kr/mo`, "Monthly cost"]}
              />
              <Bar dataKey="monthly" radius={[0, 6, 6, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[entry.model] || "#71717a"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {delta !== 0 && (
            <p className="text-center mt-3 text-sm">
              <span className="text-amber-400 font-semibold">
                {scenarioA.model} ({scenarioA.year})
              </span>{" "}
              costs{" "}
              <span className={`font-mono font-bold ${delta > 0 ? "text-red-400" : "text-green-400"}`}>
                {Math.abs(delta).toLocaleString()} kr/mo {delta > 0 ? "more" : "less"}
              </span>{" "}
              than{" "}
              <span className="text-amber-400 font-semibold">
                {scenarioB.model} ({scenarioB.year})
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
