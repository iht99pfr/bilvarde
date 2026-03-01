import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export const dynamic = "force-dynamic";

interface RegressionModel {
  intercept: number;
  coefficients: Record<string, number>;
  residual_se_log: number;
  log_transform: boolean;
  medianHp: number;
  medianEquipment: number;
  typicalAwd: number;
  generations: string[];
}

const PREMIUM_EQUIPMENT = new Set([
  "panorama_roof", "ventilated_seats", "heads_up_display", "jbl", "leather_seats",
  "harman_kardon", "bowers_wilkins", "air_suspension", "massage_seats",
]);

function cleanFuel(raw: string): string {
  const f = (raw || "").toLowerCase();
  if (f.includes("laddhybrid") || f.includes("plug")) return "PHEV";
  if (f.includes("hybrid")) return "Hybrid";
  if (f.includes("diesel")) return "Diesel";
  if (f.includes("bensin")) return "Petrol";
  if (f.includes("el")) return "Electric";
  return "Other";
}

function predictPrice(
  reg: RegressionModel, age: number, mileage: number, fuel: string,
  hp: number, equipmentCount: number, isDealer: boolean, isAwd: boolean,
  wltpRange: number, generation: string, premiumEquipCount: number,
  modelGenerations: string[],
): number {
  const isElectric = fuel === "Electric" ? 1 : 0;
  const isPhev = fuel === "PHEV" ? 1 : 0;

  // Classify generation: newest = reference, oldest = is_oldest_gen, middle = is_middle_gen
  let isOldestGen = 0;
  let isMiddleGen = 0;
  if (generation && modelGenerations.length >= 2) {
    const sorted = [...modelGenerations].sort();
    if (generation === sorted[0]) isOldestGen = 1;
    else if (sorted.length >= 3 && generation === sorted[1]) isMiddleGen = 1;
  }

  const features: Record<string, number> = {
    car_age_years: age,
    mileage_mil: mileage,
    horsepower: hp || reg.medianHp,
    equipment_count: equipmentCount || reg.medianEquipment,
    is_hybrid: fuel === "Hybrid" ? 1 : 0,
    is_phev: isPhev,
    is_diesel: fuel === "Diesel" ? 1 : 0,
    is_electric: isElectric,
    is_dealer: isDealer ? 1 : 0,
    is_awd: isAwd ? 1 : 0,
    wltp_range_km: wltpRange || 0,
    age_x_electric: age * isElectric,
    mileage_x_electric: mileage * isElectric,
    age_x_phev: age * isPhev,
    mileage_x_phev: mileage * isPhev,
    is_oldest_gen: isOldestGen,
    is_middle_gen: isMiddleGen,
    premium_equip_count: premiumEquipCount,
  };

  let predicted = reg.intercept;
  for (const [key, coef] of Object.entries(reg.coefficients)) {
    predicted += coef * (features[key] || 0);
  }
  // Log-transform: coefficients predict log(price), so exponentiate
  if (reg.log_transform) {
    predicted = Math.exp(predicted);
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
               equipment_count, car_age_years, wltp_range_km, ai_generation, ai_notable_equipment
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
               equipment_count, car_age_years, wltp_range_km, ai_generation, ai_notable_equipment
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
      const wltpRange = r.wltp_range_km || 0;
      const generation = r.ai_generation || "";
      // Count premium equipment from AI-extracted list
      let premiumEquipCount = 0;
      if (r.ai_notable_equipment) {
        const equip = Array.isArray(r.ai_notable_equipment) ? r.ai_notable_equipment : [];
        premiumEquipCount = equip.filter((e: string) => PREMIUM_EQUIPMENT.has(e)).length;
      }

      const reg = regression[modelKey];
      let predicted: number | null = null;
      let residual: number | null = null;
      let deal: string | null = null;

      if (reg) {
        predicted = predictPrice(
          reg, age, mileage, fuel, hp, equipmentCount, isDealer, isAwd,
          wltpRange, generation, premiumEquipCount, reg.generations || [],
        );
        residual = price - predicted;
        // Deal scoring in log-space: compare log(actual) vs log(predicted)
        if (reg.log_transform && predicted > 0 && price > 0) {
          const logScore = (Math.log(price) - Math.log(predicted)) / reg.residual_se_log;
          if (logScore <= -1.5) deal = "great";
          else if (logScore <= -0.75) deal = "good";
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
