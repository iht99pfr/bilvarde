"use client";

import { useState, useEffect } from "react";
import DataTable from "./DataTable";
import type { ModelConfigMap } from "@/app/lib/model-config";

interface CarsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cars: any[];
  total: number;
  page: number;
  pages: number;
}

export default function DataTableSection() {
  const [data, setData] = useState<CarsResponse | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfigMap>({});
  const [page, setPage] = useState(1);
  const limit = 30;

  useEffect(() => {
    fetch("/api/aggregates")
      .then((r) => r.json())
      .then((agg) => setModelConfig(agg.modelConfig || {}));
  }, []);

  useEffect(() => {
    setData(null);
    fetch(`/api/cars?page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then(setData);
  }, [page]);

  if (!data) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-[var(--border)] rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable cars={data.cars} modelConfig={modelConfig} />

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Föregående
          </button>
          <span className="text-sm text-[var(--muted)]">
            Sida {data.page} av {data.pages} ({data.total} bilar)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Nästa
          </button>
        </div>
      )}
    </div>
  );
}
