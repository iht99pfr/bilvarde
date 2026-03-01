"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TcoCalculator from "@/app/components/TcoCalculator";

export default function TcoPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aggregates, setAggregates] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scatter, setScatter] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetch("/api/aggregates").then((r) => r.json()).then(setAggregates);
    fetch("/api/scatter").then((r) => r.json()).then(setScatter);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition"
        >
          &larr; Tillbaka
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
          Ägandekostnadsberäknare
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Beräkna den totala ägandekostnaden för en bil. Prediktioner baseras på
          vår regressionsmodell tränad på verkliga Blocket-annonser.
        </p>
      </div>

      {!aggregates ? (
        <div className="animate-pulse space-y-4 max-w-xl">
          <div className="h-64 bg-[var(--border)] rounded" />
          <div className="h-48 bg-[var(--border)] rounded" />
        </div>
      ) : (
        <TcoCalculator
          regression={aggregates.regression}
          tcoDefaults={aggregates.tcoDefaults}
          modelConfig={aggregates.modelConfig || {}}
          scatter={scatter}
          predictionCurves={aggregates.predictionCurves || {}}
        />
      )}

      <div className="bg-[var(--card)] p-5 border border-[var(--border)] text-sm text-[var(--muted)] space-y-2 max-w-xl">
        <h3 className="text-[var(--foreground)] font-semibold">Så fungerar beräkningen</h3>
        <p>
          Köp- och säljpris predikteras med multivariat regression baserad på
          {" "}bilålder, miltal, bränsle, hästkrafter, utrustning, drivlina och säljartyp.
          Miltalet föreslås automatiskt baserat på medianen bland verkliga annonser
          för vald modell och årsmodell.
        </p>
        <p>
          Fasta kostnader (försäkring, service, skatt) är schabloner per modell.
          95% konfidensintervall beräknas från regressionens residualfel.
        </p>
      </div>
    </div>
  );
}
