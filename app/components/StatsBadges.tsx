"use client";

interface RegressionStats {
  r2: number;
  rmse: number;
  residual_se: number;
  n_samples: number;
}

interface Props {
  regression: Record<string, RegressionStats>;
}

const MODEL_META: Record<string, { label: string; border: string }> = {
  RAV4: { label: "Toyota RAV4", border: "border-red-500/50" },
  XC60: { label: "Volvo XC60", border: "border-blue-400/50" },
  X3: { label: "BMW X3", border: "border-blue-500/50" },
};

function qualityColor(r2: number) {
  if (r2 >= 0.9) return "text-green-400";
  if (r2 >= 0.8) return "text-amber-400";
  return "text-red-400";
}

function qualityLabel(r2: number) {
  if (r2 >= 0.9) return "Excellent fit";
  if (r2 >= 0.8) return "Good fit";
  return "Moderate fit";
}

export default function StatsBadges({ regression }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(regression).map(([model, stats]) => {
        const meta = MODEL_META[model] || { label: model, border: "border-zinc-700" };
        return (
          <div
            key={model}
            className={`bg-zinc-900/60 rounded-xl border-l-4 ${meta.border} p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">{meta.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-zinc-800 ${qualityColor(stats.r2)}`}>
                {qualityLabel(stats.r2)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono ${qualityColor(stats.r2)}`}>
                {(stats.r2 * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-zinc-500">R² accuracy</span>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-zinc-500">
              <span>RMSE: <span className="font-mono text-zinc-400">{(stats.rmse / 1000).toFixed(0)}k</span> SEK</span>
              <span>n = <span className="font-mono text-zinc-400">{stats.n_samples}</span></span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-600">
              Model explains {(stats.r2 * 100).toFixed(1)}% of price variation.
              Typical prediction error: ±{(stats.residual_se * 1.96 / 1000).toFixed(0)}k SEK (95% CI).
            </p>
          </div>
        );
      })}
    </div>
  );
}
