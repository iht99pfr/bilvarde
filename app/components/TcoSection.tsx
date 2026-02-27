"use client";

import { useState, useEffect } from "react";
import TcoCalculator from "./TcoCalculator";

export default function TcoSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/aggregates")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <div className="animate-pulse h-96 bg-[var(--border)] rounded" />;
  }

  return (
    <TcoCalculator
      regression={data.regression}
      tcoDefaults={data.tcoDefaults}
    />
  );
}
