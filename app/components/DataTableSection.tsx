"use client";

import { useState, useEffect, useMemo } from "react";
import { useModelSelection } from "./ModelSelectionContext";
import DataTable from "./DataTable";
import type { SortKey } from "./DataTable";

const FUEL_KEY_MAP: Record<string, string> = {
  Bensin: "Petrol",
  Hybrid: "Hybrid",
  Laddhybrid: "PHEV",
  Diesel: "Diesel",
  El: "Electric",
};

interface CarsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cars: any[];
  total: number;
  page: number;
  pages: number;
}

export default function DataTableSection() {
  const { selectedModels, fuelFilter } = useModelSelection();
  const [data, setData] = useState<CarsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dealFilter, setDealFilter] = useState<string>(""); // "", "any", "great", "good"
  const limit = 30;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "deal" ? "asc" : "asc");
    }
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    const models = [...selectedModels].join(",");
    if (models) params.set("models", models);
    const fuelKey = FUEL_KEY_MAP[fuelFilter];
    if (fuelKey) params.set("fuel", fuelKey);
    // Send deal sort to server (server-side sorting by residual)
    if (sortKey === "deal") params.set("sort", "deal");
    if (dealFilter) params.set("deal", dealFilter);
    return params.toString();
  }, [page, selectedModels, fuelFilter, sortKey, dealFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedModels, fuelFilter, dealFilter]);

  useEffect(() => {
    setData(null);
    fetch(`/api/cars?${queryString}`)
      .then((r) => r.json())
      .then(setData);
  }, [queryString]);

  if (!data) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-[var(--border)] rounded" />
        ))}
      </div>
    );
  }

  const dealButtons: { key: string; label: string; color: string; activeColor: string }[] = [
    { key: "", label: "Alla", color: "bg-[var(--card)] text-[var(--muted)]", activeColor: "bg-[var(--foreground)] text-white" },
    { key: "any", label: "Alla fynd", color: "bg-[var(--card)] text-[var(--muted)]", activeColor: "bg-green-600 text-white" },
    { key: "great", label: "Fyndpris", color: "bg-[var(--card)] text-[var(--muted)]", activeColor: "bg-green-700 text-white" },
    { key: "good", label: "Bra pris", color: "bg-[var(--card)] text-[var(--muted)]", activeColor: "bg-green-500 text-white" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {dealButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => {
              setDealFilter(btn.key);
              if (btn.key) {
                setSortKey("deal");
                setSortDir("asc");
              }
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              dealFilter === btn.key ? btn.activeColor : btn.color
            } border border-[var(--border)] hover:opacity-80`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <DataTable cars={data.cars} total={data.total} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />

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
