"use client";

import { useState, useEffect } from "react";
import StatsCards from "./StatsCards";
import StatsBadges from "./StatsBadges";

export default function StatsSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/aggregates")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <section>
        <StatsCards summary={data.summary} modelConfig={data.modelConfig || {}} />
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Modellprecision</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Multivariat regression som tar hänsyn till ålder, miltal, bränsletyp,
            hästkrafter, utrustning, drivlina och säljartyp.
          </p>
        </div>
        <StatsBadges regression={data.regression} modelConfig={data.modelConfig || {}} />
      </section>
    </>
  );
}
