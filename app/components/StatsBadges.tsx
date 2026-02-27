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
  RAV4: { label: "Toyota RAV4", border: "border-red-400" },
  XC60: { label: "Volvo XC60", border: "border-blue-400" },
  X3: { label: "BMW X3", border: "border-sky-500" },
};

function qualityColor(r2: number) {
  if (r2 >= 0.9) return "text-green-600";
  if (r2 >= 0.8) return "text-amber-600";
  return "text-red-500";
}

function qualityLabel(r2: number) {
  if (r2 >= 0.9) return "Utmärkt";
  if (r2 >= 0.8) return "Bra";
  return "Måttlig";
}

export default function StatsBadges({ regression }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(regression).map(([model, stats]) => {
        const meta = MODEL_META[model] || { label: model, border: "border-stone-300" };
        return (
          <div
            key={model}
            className={`bg-[var(--card)] border-l-4 ${meta.border} p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">{meta.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 ${qualityColor(stats.r2)}`}>
                {qualityLabel(stats.r2)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono ${qualityColor(stats.r2)}`}>
                {(stats.r2 * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-[var(--muted)]">R²-precision</span>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-[var(--muted)]">
              <span>RMSE: <span className="font-mono text-[var(--foreground)]">{(stats.rmse / 1000).toFixed(0)}k</span> kr</span>
              <span>n = <span className="font-mono text-[var(--foreground)]">{stats.n_samples}</span></span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Modellen förklarar {(stats.r2 * 100).toFixed(1)}% av prisvariationen.
              Typiskt prediktionsfel: ±{(stats.residual_se * 1.96 / 1000).toFixed(0)}k kr (95% KI).
            </p>
          </div>
        );
      })}
    </div>
  );
}
