import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export const dynamic = "force-dynamic";

interface RegressionModel {
  intercept: number;
  coefficients: Record<string, number>;
  residual_se: number;
  medianHp: number;
  medianEquipment: number;
  typicalAwd: number;
}

function cleanFuel(raw: string): string {
  const f = (raw || "").toLowerCase();
  if (f.includes("laddhybrid") || f.includes("plug")) return "PHEV";
  if (f.includes("hybrid")) return "Hybrid";
  if (f.includes("diesel")) return "Diesel";
  if (f.includes("bensin")) return "Petrol";
  if (f.includes("el")) return "Electric";
  return "Other";
}

function predictPrice(reg: RegressionModel, age: number, mileage: number, fuel: string, hp: number, equipmentCount: number, isDealer: boolean, isAwd: boolean): number {
  const features: Record<string, number> = {
    car_age_years: age,
    mileage_mil: mileage,
    horsepower: hp || reg.medianHp,
    equipment_count: equipmentCount || reg.medianEquipment,
    is_hybrid: fuel === "Hybrid" ? 1 : 0,
    is_phev: fuel === "PHEV" ? 1 : 0,
    is_diesel: fuel === "Diesel" ? 1 : 0,
    is_electric: fuel === "Electric" ? 1 : 0,
    is_dealer: isDealer ? 1 : 0,
    is_awd: isAwd ? 1 : 0,
  };

  let predicted = reg.intercept;
  for (const [key, coef] of Object.entries(reg.coefficients)) {
    predicted += coef * (features[key] || 0);
  }
  return Math.max(0, Math.round(predicted));
}

// Cache regression data in module scope (refreshed per cold start)
let regressionCache: Record<string, RegressionModel> | null = null;
let regressionCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getRegression(sql: ReturnType<typeof getDb>): Promise<Record<string, RegressionModel>> {
  if (regressionCache && Date.now() - regressionCacheTime < CACHE_TTL) {
    return regressionCache;
  }
  const rows = await sql`SELECT data FROM web_cache WHERE key = 'aggregates'`;
  if (rows.length && rows[0].data?.regression) {
    regressionCache = rows[0].data.regression;
    regressionCacheTime = Date.now();
    return regressionCache!;
  }
  return {};
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30")));
    const offset = (page - 1) * limit;
    const modelsParam = searchParams.get("models");
    const fuelParam = searchParams.get("fuel");
    const sortParam = searchParams.get("sort"); // "deal" for deal sorting
    const dealFilter = searchParams.get("deal"); // "great", "good", or "any" (good+great)

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

    // Fetch regression coefficients for deal scoring
    const regression = await getRegression(sql);

    const isDealSort = sortParam === "deal";
    const hasDealFilter = dealFilter === "great" || dealFilter === "good" || dealFilter === "any";
    // Need all rows when deal sorting or filtering (deal fields computed in JS, not SQL)
    const needAllRows = isDealSort || hasDealFilter;

    // When sorting/filtering by deal, fetch all rows so we can compute deals, filter, sort, then paginate.
    // For normal queries, use SQL pagination (LIMIT/OFFSET).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[];
    if (needAllRows) {
      rows = await sql`
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
        ORDER BY price_sek ASC
      `;
    } else {
      rows = await sql`
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
    }

    const total = needAllRows ? rows.length : Number(
      (await sql`
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
      `)[0].total
    );

    function mapRow(r: (typeof rows)[number]) {
      const fuel = cleanFuel(r.fuel_type);
      const modelKey = r.model_key || "";
      const age = Number(r.car_age_years) || 0;
      const mileage = r.mileage_mil || 0;
      const hp = r.horsepower || 0;
      const equipmentCount = r.equipment_count || 0;
      const price = r.price_sek;
      const isDealer = (r.seller_type || "").toLowerCase() === "dealer";
      const drivetrain = r.drivetrain || "";
      const isAwd = drivetrain.toLowerCase().includes("awd") || drivetrain.toLowerCase().includes("4wd") || drivetrain.toLowerCase().includes("fyrhjuls");

      const reg = regression[modelKey];
      let predicted: number | null = null;
      let residual: number | null = null;
      let deal: string | null = null;

      if (reg) {
        predicted = predictPrice(reg, age, mileage, fuel, hp, equipmentCount, isDealer, isAwd);
        residual = price - predicted;
        if (residual < -1.5 * reg.residual_se) {
          deal = "great";
        } else if (residual < -0.75 * reg.residual_se) {
          deal = "good";
        }
      }

      return {
        id: r.listing_id,
        url: r.url || `https://www.blocket.se/mobility/item/${r.listing_id}`,
        make: r.make,
        model: r.model,
        modelKey,
        year: r.model_year,
        age,
        price,
        mileage,
        fuel,
        hp,
        gearbox: r.gearbox || "",
        drivetrain,
        color: r.color || "",
        seller: r.seller_type || "",
        equipmentCount,
        predicted,
        residual,
        deal,
      };
    }

    let cars = rows.map(mapRow);

    // Apply deal filter (computed in JS since deal is not a DB column)
    if (hasDealFilter) {
      if (dealFilter === "great") {
        cars = cars.filter((c) => c.deal === "great");
      } else if (dealFilter === "good") {
        cars = cars.filter((c) => c.deal === "good");
      } else {
        // "any" = good + great
        cars = cars.filter((c) => c.deal === "good" || c.deal === "great");
      }
    }

    // For deal sort or deal filter: sort globally, then paginate in memory
    if (needAllRows) {
      const dealRank = (d: string | null) => d === "great" ? 0 : d === "good" ? 1 : 2;
      cars.sort((a, b) => {
        const rankDiff = dealRank(a.deal) - dealRank(b.deal);
        if (rankDiff !== 0) return rankDiff;
        return (a.residual ?? 0) - (b.residual ?? 0);
      });
      const filteredTotal = cars.length;
      cars = cars.slice(offset, offset + limit);
      return NextResponse.json(
        { cars, total: filteredTotal, page, pages: Math.ceil(filteredTotal / limit), limit },
        { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } }
      );
    }

    return NextResponse.json(
      { cars, total, page, pages: Math.ceil(total / limit), limit },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
