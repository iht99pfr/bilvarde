"use client";

import { useState, useMemo } from "react";

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  age: number;
  price: number;
  mileage: number;
  fuel: string;
  hp: number;
  seller: string;
  regNumber: string;
  color: string;
  drivetrain: string;
  equipmentCount: number;
}

interface Props {
  cars: Car[];
}

type SortKey = "price" | "year" | "mileage" | "hp";

export default function DataTable({ cars }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterFuel, setFilterFuel] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = [...cars];
    if (filterModel !== "all") {
      result = result.filter((c) => {
        if (filterModel === "RAV4") return c.make === "Toyota";
        if (filterModel === "XC60") return c.make === "Volvo";
        if (filterModel === "X3") return c.make === "BMW";
        return true;
      });
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
    if (sortKey !== col) return <span className="text-zinc-600 ml-1">↕</span>;
    return <span className="text-amber-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const fuels = [...new Set(cars.map((c) => c.fuel))].sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Models</option>
          <option value="RAV4">Toyota RAV4</option>
          <option value="XC60">Volvo XC60</option>
          <option value="X3">BMW X3</option>
        </select>
        <select
          value={filterFuel}
          onChange={(e) => setFilterFuel(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Fuels</option>
          {fuels.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <span className="text-zinc-500 text-sm self-center">
          {filtered.length} cars
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Make / Model</th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-zinc-100"
                onClick={() => toggleSort("year")}
              >
                Year <SortIcon col="year" />
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-zinc-100"
                onClick={() => toggleSort("price")}
              >
                Price <SortIcon col="price" />
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-zinc-100"
                onClick={() => toggleSort("mileage")}
              >
                Mileage <SortIcon col="mileage" />
              </th>
              <th className="px-3 py-2 text-left">Fuel</th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-zinc-100"
                onClick={() => toggleSort("hp")}
              >
                HP <SortIcon col="hp" />
              </th>
              <th className="px-3 py-2 text-left">Drive</th>
              <th className="px-3 py-2 text-left">Seller</th>
              <th className="px-3 py-2 text-left">Reg</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((car) => (
              <tr
                key={car.id}
                className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition"
              >
                <td className="px-3 py-2 font-medium">
                  {car.make} {car.model}
                </td>
                <td className="px-3 py-2 text-right font-mono">{car.year}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-400">
                  {car.price.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {car.mileage.toLocaleString()} mil
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      car.fuel === "Hybrid"
                        ? "bg-green-900/50 text-green-400"
                        : car.fuel === "PHEV"
                        ? "bg-blue-900/50 text-blue-400"
                        : car.fuel === "Diesel"
                        ? "bg-yellow-900/50 text-yellow-400"
                        : car.fuel === "Electric"
                        ? "bg-purple-900/50 text-purple-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {car.fuel}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{car.hp}</td>
                <td className="px-3 py-2 text-xs text-zinc-400">
                  {car.drivetrain}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">{car.seller}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                  {car.regNumber}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
