import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export const dynamic = "force-dynamic";

const FUEL_MAP: Record<string, string[]> = {
  Hybrid: ["Hybrid bensin", "Hybrid"],
  PHEV: ["Laddhybrid", "Laddhybrid bensin", "Plug-in Hybrid"],
  Diesel: ["Diesel"],
  Petrol: ["Bensin"],
  Electric: ["El"],
};

function cleanFuel(raw: string): string {
  const f = (raw || "").toLowerCase();
  if (f.includes("laddhybrid") || f.includes("plug")) return "PHEV";
  if (f.includes("hybrid")) return "Hybrid";
  if (f.includes("diesel")) return "Diesel";
  if (f.includes("bensin")) return "Petrol";
  if (f.includes("el")) return "Electric";
  return "Other";
}

function modelLabel(make: string): string {
  if (make === "Toyota") return "RAV4";
  if (make === "Volvo") return "XC60";
  if (make === "BMW") return "X3";
  return make;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30")));
  const offset = (page - 1) * limit;

  const sql = getDb();

  // Count total
  const countRows = await sql`
    SELECT COUNT(*) as total FROM cars
    WHERE price_sek >= 20000 AND model_year >= 2005 AND mileage_mil > 0
  `;
  const total = Number(countRows[0].total);

  // Fetch page
  const rows = await sql`
    SELECT listing_id, url, make, model, model_year, price_sek, mileage_mil,
           fuel_type, horsepower, gearbox, drivetrain, color, seller_type,
           equipment_count, car_age_years
    FROM cars
    WHERE price_sek >= 20000 AND model_year >= 2005 AND mileage_mil > 0
    ORDER BY price_sek DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const cars = rows.map((r) => ({
    id: r.listing_id,
    url: r.url || `https://www.blocket.se/mobility/item/${r.listing_id}`,
    make: r.make,
    model: r.model,
    year: r.model_year,
    age: Number(r.car_age_years) || 0,
    price: r.price_sek,
    mileage: r.mileage_mil || 0,
    fuel: cleanFuel(r.fuel_type),
    hp: r.horsepower || 0,
    gearbox: r.gearbox || "",
    drivetrain: r.drivetrain || "",
    color: r.color || "",
    seller: r.seller_type || "",
    equipmentCount: r.equipment_count || 0,
  }));

  return NextResponse.json(
    { cars, total, page, pages: Math.ceil(total / limit), limit },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } }
  );
}
