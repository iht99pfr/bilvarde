/**
 * Age-dependent, model-specific cost tables for the TCO calculator.
 *
 * Service & repair costs are based on Swedish market estimates by brand
 * and car age. Insurance is based on vehicle segment/value. Tax is
 * model+fuel specific (fordonsskatt after bonus-malus period).
 *
 * Each cost bracket: [upToAge (inclusive), annualCost in SEK].
 * The last entry's upToAge should be 99 to cover all ages.
 */

type CostBrackets = [number, number][];

interface ModelCostProfile {
  service: CostBrackets;
  repair: CostBrackets;
  insurance: CostBrackets;
  tax: Record<string, number>;
}

/** Look up annual cost for a given car age from a bracket table. */
function lookupCost(brackets: CostBrackets, age: number): number {
  for (const [upTo, cost] of brackets) {
    if (age <= upTo) return cost;
  }
  return brackets[brackets.length - 1][1];
}

// ── Brand-level service & repair templates ──────────────────────────
// Service = scheduled maintenance (oil, filters, inspections)
// Repair  = unscheduled (wear items, breakdowns beyond warranty)
//
// 0-3 years: manufacturer warranty / service plan → ~0
// 4-7 years: regular maintenance starts
// 8-12 years: bigger services, more parts
// 13+ years: major maintenance items

const TOYOTA_SERVICE: CostBrackets = [[3, 0], [7, 3500], [12, 5000], [99, 7000]];
const TOYOTA_REPAIR: CostBrackets  = [[3, 0], [7, 1500], [12, 4000], [99, 7000]];

const BMW_SERVICE: CostBrackets = [[3, 0], [7, 7000], [12, 10000], [99, 14000]];
const BMW_REPAIR: CostBrackets  = [[3, 0], [7, 4000], [12, 10000], [99, 18000]];

const VOLVO_SERVICE: CostBrackets = [[3, 0], [7, 5500], [12, 8000], [99, 11000]];
const VOLVO_REPAIR: CostBrackets  = [[3, 0], [7, 3000], [12, 7500], [99, 13000]];

const VW_SERVICE: CostBrackets = [[3, 0], [7, 4500], [12, 6500], [99, 9000]];
const VW_REPAIR: CostBrackets  = [[3, 0], [7, 2500], [12, 6000], [99, 10000]];

const TESLA_SERVICE: CostBrackets = [[3, 0], [7, 2000], [12, 3000], [99, 4000]];
const TESLA_REPAIR: CostBrackets  = [[3, 0], [7, 2500], [12, 5000], [99, 9000]];

const KIA_SERVICE: CostBrackets = [[3, 0], [7, 3000], [12, 4500], [99, 6000]];
const KIA_REPAIR: CostBrackets  = [[3, 0], [7, 1500], [12, 3500], [99, 6000]];

const MERC_SERVICE: CostBrackets = [[3, 0], [7, 7500], [12, 10500], [99, 14000]];
const MERC_REPAIR: CostBrackets  = [[3, 0], [7, 4500], [12, 11000], [99, 19000]];

// ── Insurance by vehicle segment ────────────────────────────────────
// Helförsäkring when newer, halvförsäkring when older.
// Premiums decrease as car value drops with age.

const INS_PREMIUM_SUV: CostBrackets  = [[3, 14000], [7, 11000], [12, 7000], [99, 5000]];
const INS_MID_SUV: CostBrackets      = [[3, 9000],  [7, 7500],  [12, 5500], [99, 4000]];
const INS_EV_MID: CostBrackets       = [[3, 12000], [7, 9000],  [12, 6500], [99, 4500]];
const INS_COMPACT: CostBrackets      = [[3, 7000],  [7, 6000],  [12, 4500], [99, 3500]];
const INS_SPORT_COMPACT: CostBrackets = [[3, 9000], [7, 7500],  [12, 5500], [99, 4000]];
const INS_PREMIUM_SPORT: CostBrackets = [[3, 18000],[7, 14000], [12, 9000], [99, 6000]];
const INS_PREMIUM_HIGH: CostBrackets  = [[3, 16000],[7, 12000], [12, 8000], [99, 5500]];

// ── Per-model cost profiles ─────────────────────────────────────────

const COST_PROFILES: Record<string, ModelCostProfile> = {
  RAV4: {
    service: TOYOTA_SERVICE,
    repair: TOYOTA_REPAIR,
    insurance: INS_MID_SUV,
    tax: { Hybrid: 1200, Petrol: 2500 },
  },
  XC60: {
    service: VOLVO_SERVICE,
    repair: VOLVO_REPAIR,
    insurance: INS_PREMIUM_SUV,
    tax: { PHEV: 1500, Hybrid: 2800, Diesel: 3800, Petrol: 2800 },
  },
  X3M: {
    service: [[3, 0], [7, 8000], [12, 12000], [99, 16000]],
    repair: [[3, 0], [7, 5000], [12, 12000], [99, 20000]],
    insurance: INS_PREMIUM_SPORT,
    tax: { Petrol: 4500 },
  },
  X3: {
    service: BMW_SERVICE,
    repair: BMW_REPAIR,
    insurance: INS_PREMIUM_SUV,
    tax: { PHEV: 1500, Diesel: 3500, Petrol: 3200 },
  },
  XC40Recharge: {
    service: [[3, 0], [7, 2500], [12, 4000], [99, 5500]],
    repair: [[3, 0], [7, 2500], [12, 6000], [99, 10000]],
    insurance: INS_EV_MID,
    tax: { Electric: 360 },
  },
  XC40: {
    service: [[3, 0], [7, 5000], [12, 7500], [99, 10000]],
    repair: [[3, 0], [7, 2500], [12, 6500], [99, 11000]],
    insurance: INS_MID_SUV,
    tax: { PHEV: 1200, Hybrid: 2200, Petrol: 2200, Diesel: 3000 },
  },
  Tiguan: {
    service: VW_SERVICE,
    repair: VW_REPAIR,
    insurance: [[3, 10000], [7, 8000], [12, 6000], [99, 4500]],
    tax: { PHEV: 1200, Diesel: 3200, Petrol: 2800 },
  },
  ModelY: {
    service: TESLA_SERVICE,
    repair: TESLA_REPAIR,
    insurance: INS_EV_MID,
    tax: { Electric: 360 },
  },
  Niro: {
    service: KIA_SERVICE,
    repair: KIA_REPAIR,
    insurance: [[3, 8000], [7, 6500], [12, 5000], [99, 3500]],
    tax: { Hybrid: 900, PHEV: 360, Electric: 360 },
  },
  GLC: {
    service: MERC_SERVICE,
    repair: MERC_REPAIR,
    insurance: INS_PREMIUM_HIGH,
    tax: { PHEV: 1500, Diesel: 4200, Petrol: 3800 },
  },
  GolfGTI: {
    service: [[3, 0], [7, 5000], [12, 7000], [99, 9500]],
    repair: [[3, 0], [7, 2500], [12, 6000], [99, 10000]],
    insurance: INS_SPORT_COMPACT,
    tax: { Petrol: 2500 },
  },
  GolfR: {
    service: [[3, 0], [7, 5500], [12, 8000], [99, 11000]],
    repair: [[3, 0], [7, 3000], [12, 7000], [99, 12000]],
    insurance: [[3, 11000], [7, 9000], [12, 6500], [99, 5000]],
    tax: { Petrol: 3500 },
  },
  Golf: {
    service: [[3, 0], [7, 4000], [12, 6000], [99, 8000]],
    repair: [[3, 0], [7, 2000], [12, 5000], [99, 8500]],
    insurance: INS_COMPACT,
    tax: { PHEV: 360, Hybrid: 1500, Petrol: 1500, Diesel: 1800, Electric: 360 },
  },
};

// EV discount factor for service on models that support both ICE and EV
const EV_SERVICE_FACTOR = 0.6;
const EV_ONLY_MODELS = new Set(["ModelY", "XC40Recharge"]);

/**
 * Compute total ownership costs for a holding period, summing year by year.
 * Returns totals for service, repair, insurance, and tax.
 */
export function computeOwnershipCosts(
  modelKey: string,
  fuel: string,
  buyAge: number,
  holdingYears: number,
): { service: number; repair: number; insurance: number; tax: number } {
  const profile = COST_PROFILES[modelKey];
  if (!profile) {
    // Fallback for unknown models
    return {
      service: 5000 * holdingYears,
      repair: 3000 * holdingYears,
      insurance: 8000 * holdingYears,
      tax: 1500 * holdingYears,
    };
  }

  let service = 0;
  let repair = 0;
  let insurance = 0;
  let tax = 0;

  for (let y = 0; y < holdingYears; y++) {
    const carAge = buyAge + y;
    service += lookupCost(profile.service, carAge);
    repair += lookupCost(profile.repair, carAge);
    insurance += lookupCost(profile.insurance, carAge);
    tax += profile.tax[fuel] ?? Object.values(profile.tax)[0] ?? 1500;
  }

  // For mixed-fuel models selected as Electric, reduce service costs
  if (fuel === "Electric" && !EV_ONLY_MODELS.has(modelKey)) {
    service = Math.round(service * EV_SERVICE_FACTOR);
  }

  return { service, repair, insurance, tax };
}
