"use client";

import { useModelSelection } from "./ModelSelectionContext";
import { getModelMeta } from "@/app/lib/model-config";

export default function ModelSelector() {
  const { selectedModels, toggleModel, availableModels, modelConfig, loading } = useModelSelection();

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse h-9 w-24 bg-[var(--border)] rounded-full shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
      {availableModels.map((key) => {
        const meta = getModelMeta(modelConfig, key);
        const active = selectedModels.has(key);
        return (
          <button
            key={key}
            onClick={() => toggleModel(key)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
              font-medium whitespace-nowrap shrink-0 transition-all
              ${active
                ? "bg-[var(--foreground)] text-white shadow-sm"
                : "bg-white text-[var(--muted)] border border-[var(--border)] hover:border-[var(--foreground)]/30"
              }
            `}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: meta.color,
                opacity: active ? 1 : 0.4,
              }}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
