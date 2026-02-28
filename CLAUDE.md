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
│   └── cars/route.ts         — serves car listings for the data table
├── components/
│   ├── ChartSection.tsx       — orchestrates all charts, owns fuel filter state
│   ├── DepreciationChart.tsx  — scatter plot + prediction curves (age vs price)
│   ├── RetentionChart.tsx     — retention % chart (% of new price kept)
│   ├── MileageChart.tsx       — mileage vs price scatter + trend line
│   ├── ModelSelector.tsx      — pill-based model toggle (persisted to localStorage)
│   ├── ModelSelectionContext.tsx — React context for selected models
│   ├── TcoCalculator.tsx      — ownership cost calculator (uses regression coefficients)
│   ├── TcoSection.tsx         — TCO section wrapper
│   ├── DataTable.tsx          — sortable/filterable car listings table
│   ├── DataTableSection.tsx   — data table section wrapper
│   ├── HeroSection.tsx        — hero with dynamic text based on selected models
│   ├── StatsSection.tsx       — per-model stat cards
│   ├── StatsCards.tsx         — individual stat card component
│   └── StatsBadges.tsx        — model precision badges (R², RMSE)
├── lib/
│   ├── db.ts                  — Neon Postgres connection
│   └── model-config.ts       — model metadata types and helpers
├── layout.tsx                 — root layout with nav
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
- `scatter[model]` — `[{age, mileage, price, year, fuel, hp, seller}]`. **Has** fuel field — used for client-side fuel filtering of mileage chart.

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

### 5. Database migration (commit `ee2b804`)

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
