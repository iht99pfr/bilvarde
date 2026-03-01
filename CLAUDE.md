# Helanotan — CLAUDE.md

## Project overview

Helanotan ("Hela Notan") is a Swedish car depreciation analysis platform. It scrapes used car listings from Blocket.se, runs multivariate regression models, and presents interactive charts showing how cars lose value over time, mileage, and fuel type.

Live at: https://helanotan.upnorth.ai

## Tech stack

- **Frontend**: Next.js 16 (Turbopack), React 19, TypeScript 5, Tailwind CSS 4, Recharts
- **Database**: Neon Postgres (cloud) — data served via `/api/aggregates`, `/api/scatter`, `/api/cars`
- **Deployment**: Vercel, auto-deploys on push to `main`
- **Repo**: github.com/iht99pfr/helanotan.git

## Data pipeline (separate repos)

The backend data pipeline is split across three separate folders, each with its own CLAUDE.md:

```
helanotan-scraping/    → Scrapes Blocket.se → cars_raw table
helanotan-enrichment/  → Filters + enriches → cars_enriched table
helanotan-statistics/  → Regression models  → web_cache table
```

This frontend reads from:
- `web_cache` table (via `/api/aggregates` and `/api/scatter`)
- `cars_enriched` table (via `/api/cars`)

## Architecture

```
app/
├── api/
│   ├── aggregates/route.ts   — serves pre-computed aggregates from Neon
│   ├── scatter/route.ts      — serves raw scatter data from Neon
│   └── cars/route.ts         — serves car listings + deal scores for the data table
├── components/
│   ├── ChartSection.tsx       — orchestrates all charts, owns fuel filter state
│   ├── DepreciationChart.tsx  — scatter plot + prediction curves + deal dots (age vs price)
│   ├── RetentionChart.tsx     — retention % chart (% of new price kept)
│   ├── MileageChart.tsx       — mileage vs price scatter + trend line
│   ├── ModelSelector.tsx      — pill-based model toggle (persisted to localStorage)
│   ├── ModelSelectionContext.tsx — React context for selected models
│   ├── TcoCalculator.tsx      — ownership cost calculator (single scenario, auto-mileage from scatter data)
│   ├── DataTable.tsx          — sortable/filterable car listings table with deal badges
│   ├── DataTableSection.tsx   — data table section wrapper, manages sort + deal filter state
│   ├── HeroSection.tsx        — hero with dynamic text based on selected models
│   ├── StatsSection.tsx       — per-model stat cards
│   ├── StatsCards.tsx         — individual stat card component
│   └── StatsBadges.tsx        — model precision badges (R², RMSE)
├── lib/
│   ├── db.ts                  — Neon Postgres connection
│   └── model-config.ts       — model metadata types and helpers
├── layout.tsx                 — root layout with nav
├── tco/
│   └── page.tsx               — TCO calculator page (separate route)
├── page.tsx                   — main page composing all sections
└── globals.css                — Tailwind base styles
```

## Data structures (from Python backend)

The Python pipeline writes two keys to `web_cache`:

### `aggregates` (per model)
- `predictionCurves[model]` — keys: `'all'`, `'Hybrid'`, `'PHEV'`, `'Diesel'`, `'Petrol'`, `'Electric'`. Each is an array of `{age, predicted, lower, upper}`.
- `retention[model]` — `{ newPrice, points: [{age, retention}] }`. **Not** per-fuel (only aggregate).
- `mileageCost[model]` — `[{mileage, price}]`. **Not** per-fuel (only aggregate).
- `medians[model]` — `[{age, median}]`
- `modelConfig` — `Record<string, {label, color, borderClass, fuelOptions}>`

### `scatter` (per model)
- `scatter[model]` — `[{age, mileage, price, year, fuel, hp, seller, predicted, residual, deal}]`. **Has** fuel field — used for client-side fuel filtering of mileage chart. Deal fields added by statistics pipeline: `predicted` (regression estimate), `residual` (actual − predicted), `deal` (`'good'` | `'great'` | `null`).

### `aggregates.regressionModels` (per model)
- `regressionModels[model]` — `{intercept, coefficients, residual_se, medianHp, medianEquipment, typicalAwd}`. Used by TcoCalculator (client-side) and `/api/cars` (server-side deal scoring).

## Key improvements made

### 1. Global fuel filter (commit `372bcc1`)

**Problem**: The fuel filter (Hybrid, PHEV, Diesel, Bensin) only affected the scatter chart. Clicking "Hybrid" didn't filter the prediction curve, retention, or mileage charts — confusing for users.

**Solution**: Lifted `fuelFilter` state from `DepreciationChart` to `ChartSection` (single source of truth). All three chart components now receive `fuelFilter` as a prop.

- **DepreciationChart**: Selects the fuel-specific prediction curve from `predictionCurves[model][fuelKey]`
- **RetentionChart**: Since backend has no per-fuel retention, it **derives** retention from fuel-specific prediction curves: `predicted_at_age / predicted_at_age_0 * 100`
- **MileageChart**: Receives raw `scatter` data, filters by `fuel` field client-side, recomputes the trend line from filtered points

Fuel key mapping (Swedish UI → backend keys):
```
"Alla" → "all", "Bensin" → "Petrol", "Hybrid" → "Hybrid", "PHEV" → "PHEV", "Diesel" → "Diesel"
```

### 2. Monotonic trend line enforcement (commit `372bcc1`)

**Problem**: Trend lines curved upward at sparse data regions (e.g., mileage trend going up at 40k+ mil, prediction bumps at year 14-15). This was misleading noise, not real signal.

**Solution**: All three chart types enforce monotonic decrease on their trend data:

- **DepreciationChart**: After building trend data from prediction curves, clamps each age point to never exceed the previous age's value.
- **RetentionChart**: Same clamping — retention % never increases with age.
- **MileageChart**: Increased minimum bucket count from 2 → 5 cars. Trend line **stops** (truncates) at the first upward spike rather than clamping, avoiding misleading flat segments at high mileage.

### 3. Mobile UX overhaul (commit `0b2cb71`)

- Pill-based model selector with horizontal scroll on mobile
- Per-model stat cards shown only for selected models
- Model precision badges with contextual ratings
- Sections only render when they have data for selected models
- localStorage persistence for model selection (`helanotan_selected_models`)

### 4. Data quality filtering (commit `ebb7649`)

- Centralized model config generated from Python pipeline
- Excluded listings under 20,000 kr and pre-2005 model years
- Per-model fuel option detection
- Interaction terms in regression (fuel × age, fuel × mileage)

### 5. Deal scoring — scatter + table integration

**Problem**: The statistics pipeline added deal scoring fields (`predicted`, `residual`, `deal`) to scatter data in `web_cache`, but users had no way to discover or filter deals.

**Solution**: Two-part integration:

- **DepreciationChart**: Scatter dots are color-coded — dark green (white ring) = "Fyndpris" (great deal, >1.5 SE below predicted, ~7% of cars), lighter green = "Bra pris" (good deal, >0.75 SE, ~23%). Tooltip shows predicted price and savings. Deal dots render on top via SVG paint order. Legend sits below the scatter chart (above the trend chart).
- **DataTable + DataTableSection**: New "Fynd" column with green badges showing savings (e.g. "−171 504 kr"). Green row tinting for deal cars. Sort state lifted to DataTableSection; clicking "Fynd" header triggers server-side deal sort. Deal filter pill buttons above the table: "Alla" / "Alla fynd" / "Fyndpris" / "Bra pris" — filters via `?deal=any|great|good` API param.
- **`/api/cars`**: Computes deal scores server-side using regression coefficients from `web_cache.aggregates.regressionModels` (same `predictPrice()` math as TcoCalculator). Each car gets `predicted`, `residual`, and `deal` fields. Supports `sort=deal` (sort by deal rank + residual) and `deal=great|good|any` (filter to only deals). Both params fetch ALL matching rows, compute deals, filter/sort globally, then paginate in memory. Regression models cached 5 min.

Deal thresholds (matching Python pipeline):
```
great = residual < −1.5 × residual_se  (~7% of cars)
good  = residual < −0.75 × residual_se (~23% of cars)
```

### 6. TCO calculator — separate page, single scenario

**Problem**: TCO calculator was a dual-scenario (A/B) comparison embedded in the main page. Overly complex for most users — they just want to know the cost for one car.

**Solution**: Moved to its own page (`/tco`) with a single scenario. Key change: mileage auto-populates from the **median mileage** of real scatter data for the selected model+year. E.g. picking RAV4 2022 sets mileage to 7 900 mil (median of 106 ads). Falls back to `age × 1500` if insufficient data.

- **`/tco` page**: Fetches `/api/aggregates` (regression, tcoDefaults, modelConfig) and `/api/scatter` (for median mileage)
- **TcoCalculator**: Single scenario, `useEffect` auto-updates mileage on model/year change. Shows "Median från N annonser" hint.
- **Main page**: TCO section removed entirely. Nav link points to `/tco`.
- **TcoSection.tsx**: Deleted (data fetching moved into /tco page).

### 7. Database migration (commit `ee2b804`)

- Moved from static JSON files to Neon Postgres via API routes
- 5-minute cache with stale-while-revalidate for performance

## Models tracked (12 models, ~10,353 cars)

BMW X3, BMW X3 M, Kia Niro, Mercedes GLC, Tesla Model Y, Toyota RAV4, Volvo XC40, Volvo XC60, VW Golf, VW Golf GTI, VW Golf R, VW Tiguan

## Dev workflow

```bash
cd /home/patrik/helanotan
npm run dev          # starts on port 3456 (Turbopack)
npm run build        # production build check
git push origin main # auto-deploys to Vercel → helanotan.upnorth.ai
```
