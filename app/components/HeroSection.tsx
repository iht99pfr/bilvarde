"use client";

import { useModelSelection } from "./ModelSelectionContext";
import { getModelMeta } from "@/app/lib/model-config";

export default function HeroSection() {
  const { selectedModels, modelConfig, loading } = useModelSelection();

  const labels = [...selectedModels].map((k) => getModelMeta(modelConfig, k).label);
  const modelText = loading
    ? "populära bilmodeller"
    : labels.length <= 2
      ? labels.join(" och ")
      : labels.slice(0, -1).join(", ") + " och " + labels[labels.length - 1];

  return (
    <section className="text-center py-6 sm:py-8">
      <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
        Hela Notan — vad kostar bilen egentligen?
      </h1>
      <p className="text-[var(--muted)] mt-3 max-w-2xl mx-auto text-sm sm:text-base">
        Riktig data från Blocket.se.
        Jämför hur {modelText} tappar i värde
        över tid, miltal och bränsletyp.
      </p>
    </section>
  );
}
