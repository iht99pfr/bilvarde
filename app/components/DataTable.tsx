"use client";

import { useState, useMemo } from "react";
import type { ModelConfigMap } from "@/app/lib/model-config";

interface Car {
  id: string;
  url: string;
  make: string;
  model: string;
  modelKey?: string;
  year: number;
  age: number;
  price: number;
  mileage: number;
  fuel: string;
  hp: number;
  seller: string;
  color: string;
  drivetrain: string;
  equipmentCount: number;
}

interface Props {
  cars: Car[];
  modelConfig: ModelConfigMap;
}

type SortKey = "price" | "year" | "mileage" | "hp";

const FUEL_LABELS: Record<string, string> = {
  Hybrid: "Hybrid",
  PHEV: "PHEV",
  Diesel: "Diesel",
  Petrol: "Bensin",
  Electric: "El",
};

export default function DataTable({ cars, modelConfig }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterFuel, setFilterFuel] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = [...cars];
    if (filterModel !== "all") {
      result = result.filter((c) => c.modelKey === filterModel);
    }
    if (filterFuel !== "all") {
      result = result.filter((c) => c.fuel === filterFuel);
    }
    result.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return (a[sortKey] - b[sortKey]) * mul;
    });
    return result;
  }, [cars, sortKey, sortDir, filterModel, filterFuel]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-[var(--muted)] ml-1">↕</span>;
    return <span className="text-[var(--foreground)] ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const fuels = [...new Set(cars.map((c) => c.fuel))].sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="bg-[var(--card)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="all">Alla modeller</option>
          {Object.entries(modelConfig).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        <select
          value={filterFuel}
          onChange={(e) => setFilterFuel(e.target.value)}
          className="bg-[var(--card)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="all">Alla bränslen</option>
          {fuels.map((f) => (
            <option key={f} value={f}>
              {FUEL_LABELS[f] || f}
            </option>
          ))}
        </select>
        <span className="text-[var(--muted)] text-sm self-center">
          {filtered.length} bilar
        </span>
      </div>
      <div className="overflow-x-auto border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--card)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Märke / Modell</th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => toggleSort("year")}
              >
                Årsmodell <SortIcon col="year" />
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => toggleSort("price")}
              >
                Pris <SortIcon col="price" />
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => toggleSort("mileage")}
              >
                Miltal <SortIcon col="mileage" />
              </th>
              <th className="px-3 py-2 text-left">Bränsle</th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => toggleSort("hp")}
              >
                HK <SortIcon col="hp" />
              </th>
              <th className="px-3 py-2 text-left">Drivlina</th>
              <th className="px-3 py-2 text-left">Säljare</th>
              <th className="px-3 py-2 text-center">Länk</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((car) => (
              <tr
                key={car.id}
                className="border-t border-[var(--border)] hover:bg-[var(--card)]/50 transition"
              >
                <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                  {car.make} {car.model}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">{car.year}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--foreground)]">
                  {car.price.toLocaleString("sv-SE")} kr
                </td>
                <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">
                  {car.mileage.toLocaleString("sv-SE")} mil
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      car.fuel === "Hybrid"
                        ? "bg-green-100 text-green-700"
                        : car.fuel === "PHEV"
                        ? "bg-blue-100 text-blue-700"
                        : car.fuel === "Diesel"
                        ? "bg-amber-100 text-amber-700"
                        : car.fuel === "Electric"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {FUEL_LABELS[car.fuel] || car.fuel}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">{car.hp}</td>
                <td className="px-3 py-2 text-xs text-[var(--muted)]">
                  {car.drivetrain}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--muted)]">
                  {car.seller === "dealer" ? "Handlare" : "Privat"}
                </td>
                <td className="px-3 py-2 text-center">
                  <a
                    href={car.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Blocket
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
