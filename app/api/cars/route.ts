import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export const dynamic = "force-dynamic";

function cleanFuel(raw: string): string {
  const f = (raw || "").toLowerCase();
  if (f.includes("laddhybrid") || f.includes("plug")) return "PHEV";
  if (f.includes("hybrid")) return "Hybrid";
  if (f.includes("diesel")) return "Diesel";
  if (f.includes("bensin")) return "Petrol";
  if (f.includes("el")) return "Electric";
  return "Other";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30")));
    const offset = (page - 1) * limit;
    const modelsParam = searchParams.get("models");
    const fuelParam = searchParams.get("fuel");

    const sql = getDb();

    const modelKeys = modelsParam ? modelsParam.split(",").filter(Boolean) : [];
    const hasModels = modelKeys.length > 0;

    // Fuel filter booleans — handle hybrid/laddhybrid overlap with NOT LIKE
    const isHybrid = fuelParam === "Hybrid";
    const isPHEV = fuelParam === "PHEV";
    const isDiesel = fuelParam === "Diesel";
    const isPetrol = fuelParam === "Petrol";
    const isElectric = fuelParam === "Electric";
    const hasFuel = isHybrid || isPHEV || isDiesel || isPetrol || isElectric;

    const countRows = await sql`
      SELECT COUNT(*) as total FROM cars_enriched
      WHERE (exclusion_tags = '[]'::jsonb OR exclusion_tags IS NULL)
        AND model_year >= 2005
        AND mileage_mil >= 0
        AND (${!hasModels} OR model_key = ANY(${modelKeys}))
        AND (${!hasFuel} OR (
          (${isHybrid} AND LOWER(fuel_type) LIKE '%hybrid%' AND LOWER(fuel_type) NOT LIKE '%laddhybrid%' AND LOWER(fuel_type) NOT LIKE '%plug%')
          OR (${isPHEV} AND (LOWER(fuel_type) LIKE '%laddhybrid%' OR LOWER(fuel_type) LIKE '%plug%'))
          OR (${isDiesel} AND LOWER(fuel_type) LIKE '%diesel%')
          OR (${isPetrol} AND LOWER(fuel_type) LIKE '%bensin%')
          OR (${isElectric} AND LOWER(fuel_type) = 'el')
        ))
    `;
    const total = Number(countRows[0].total);

    const rows = await sql`
      SELECT listing_id, url, make, model, model_key, model_year, price_sek, mileage_mil,
             fuel_type, horsepower, gearbox, drivetrain, color, seller_type,
             equipment_count, car_age_years
      FROM cars_enriched
      WHERE (exclusion_tags = '[]'::jsonb OR exclusion_tags IS NULL)
        AND model_year >= 2005
        AND mileage_mil >= 0
        AND (${!hasModels} OR model_key = ANY(${modelKeys}))
        AND (${!hasFuel} OR (
          (${isHybrid} AND LOWER(fuel_type) LIKE '%hybrid%' AND LOWER(fuel_type) NOT LIKE '%laddhybrid%' AND LOWER(fuel_type) NOT LIKE '%plug%')
          OR (${isPHEV} AND (LOWER(fuel_type) LIKE '%laddhybrid%' OR LOWER(fuel_type) LIKE '%plug%'))
          OR (${isDiesel} AND LOWER(fuel_type) LIKE '%diesel%')
          OR (${isPetrol} AND LOWER(fuel_type) LIKE '%bensin%')
          OR (${isElectric} AND LOWER(fuel_type) = 'el')
        ))
      ORDER BY price_sek DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const cars = rows.map((r) => ({
      id: r.listing_id,
      url: r.url || `https://www.blocket.se/mobility/item/${r.listing_id}`,
      make: r.make,
      model: r.model,
      modelKey: r.model_key || "",
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
