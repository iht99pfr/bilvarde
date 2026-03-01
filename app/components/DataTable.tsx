"use client";

import { useState, useMemo } from "react";

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
  predicted: number | null;
  residual: number | null;
  deal: string | null;
}

interface Props {
  cars: Car[];
  total: number;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}

export type SortKey = "price" | "year" | "mileage" | "hp" | "deal";

const FUEL_LABELS: Record<string, string> = {
  Hybrid: "Hybrid",
  PHEV: "PHEV",
  Diesel: "Diesel",
  Petrol: "Bensin",
  Electric: "El",
};

export default function DataTable({ cars, total, sortKey, sortDir, onSort }: Props) {
  const sorted = useMemo(() => {
    const result = [...cars];
    // "deal" sorting is done server-side, skip client sort for it
    if (sortKey === "deal") return result;
    result.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return (a[sortKey] - b[sortKey]) * mul;
    });
    return result;
  }, [cars, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-[var(--muted)] ml-1">↕</span>;
    return <span className="text-[var(--foreground)] ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <span className="text-[var(--muted)] text-sm self-center">
          {total.toLocaleString("sv-SE")} bilar
        </span>
      </div>
      <div className="overflow-x-auto border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--card)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Märke / Modell</th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => onSort("year")}
              >
                Årsmodell <SortIcon col="year" />
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => onSort("price")}
              >
                Pris <SortIcon col="price" />
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => onSort("deal")}
              >
                Fynd <SortIcon col="deal" />
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => onSort("mileage")}
              >
                Miltal <SortIcon col="mileage" />
              </th>
              <th className="px-3 py-2 text-left">Bränsle</th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => onSort("hp")}
              >
                HK <SortIcon col="hp" />
              </th>
              <th className="px-3 py-2 text-left hidden sm:table-cell">Säljare</th>
              <th className="px-3 py-2 text-center">Länk</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((car) => (
              <tr
                key={car.id}
                className={`border-t border-[var(--border)] hover:bg-[var(--card)]/50 transition ${
                  car.deal === "great" ? "bg-green-50/60" : car.deal === "good" ? "bg-green-50/30" : ""
                }`}
              >
                <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                  {car.make} {car.model}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">{car.year}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--foreground)]">
                  {car.price.toLocaleString("sv-SE")} kr
                </td>
                <td className="px-3 py-2 text-right">
                  {car.deal === "great" && (
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold whitespace-nowrap">
                      −{Math.abs(car.residual!).toLocaleString("sv-SE")} kr
                    </span>
                  )}
                  {car.deal === "good" && (
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 whitespace-nowrap">
                      −{Math.abs(car.residual!).toLocaleString("sv-SE")} kr
                    </span>
                  )}
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
                <td className="px-3 py-2 text-xs text-[var(--muted)] hidden sm:table-cell">
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
