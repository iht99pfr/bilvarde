import { promises as fs } from "fs";
import path from "path";
import StatsCards from "./components/StatsCards";
import DepreciationChart from "./components/DepreciationChart";
import RetentionChart from "./components/RetentionChart";
import MileageChart from "./components/MileageChart";
import DataTable from "./components/DataTable";

async function loadJSON(filename: string) {
  const filePath = path.join(process.cwd(), "public", "data", filename);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export default async function Home() {
  const [aggregates, scatter, cars] = await Promise.all([
    loadJSON("aggregates.json"),
    loadJSON("scatter.json"),
    loadJSON("cars.json"),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Swedish Used Car{" "}
          <span className="text-amber-400">Depreciation Guide</span>
        </h1>
        <p className="text-zinc-400 mt-3 max-w-2xl mx-auto">
          Real depreciation data from {cars.length} Blocket.se listings.
          Compare how Toyota RAV4, Volvo XC60, and BMW X3 hold their value over
          time.
        </p>
      </section>

      {/* Summary stats */}
      <section>
        <StatsCards summary={aggregates.summary} />
      </section>

      {/* Depreciation by Age */}
      <section id="depreciation" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Price vs Age</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Each dot is a real listing. Trend lines show median price per age
            year.
          </p>
        </div>
        <DepreciationChart
          scatter={scatter}
          medians={aggregates.priceByAge}
        />
      </section>

      {/* Value Retention */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Value Retention</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Percentage of the &ldquo;new&rdquo; price retained at each age.
            Based on median prices relative to 0–1 year old cars.
          </p>
        </div>
        <RetentionChart retention={aggregates.retention} />
      </section>

      {/* Mileage Impact */}
      <section id="mileage" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Mileage Impact</h2>
          <p className="text-zinc-400 text-sm mt-1">
            How mileage correlates with asking price across models.
          </p>
        </div>
        <MileageChart data={aggregates.mileageCost} />
      </section>

      {/* Key Insights */}
      <section id="factors" className="space-y-4">
        <h2 className="text-2xl font-bold">Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <h3 className="font-semibold text-red-400 mb-2">
              Toyota RAV4 — Best Retention
            </h3>
            <p className="text-sm text-zinc-400">
              The RAV4 holds its value exceptionally well. After 3 years it
              retains ~89% of its new price, and after 5 years still ~73%.
              Hybrid models command a premium. Loses ~14k SEK per 1,000 mil.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <h3 className="font-semibold text-blue-300 mb-2">
              Volvo XC60 — Middle Ground
            </h3>
            <p className="text-sm text-zinc-400">
              The XC60 sits between the RAV4 and X3 in depreciation. Strong
              brand loyalty in Sweden helps. PHEV variants retain better value.
              Loses ~18k SEK per 1,000 mil.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <h3 className="font-semibold text-blue-400 mb-2">
              BMW X3 — Steepest Drop
            </h3>
            <p className="text-sm text-zinc-400">
              The X3 depreciates the fastest of the three. After 3 years it
              may retain only ~53% of its original value. Higher maintenance
              costs and lower demand contribute. Loses ~18k SEK per 1,000 mil.
            </p>
          </div>
        </div>
      </section>

      {/* Data Explorer */}
      <section id="explorer" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Data Explorer</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Browse all {cars.length} scraped listings. Sort by any column, filter
            by model or fuel type.
          </p>
        </div>
        <DataTable cars={cars} />
      </section>

      {/* Methodology */}
      <section className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 text-sm text-zinc-400 space-y-2">
        <h3 className="text-zinc-200 font-semibold">Methodology</h3>
        <p>
          Data was scraped from Blocket.se in February 2026. We collected ~100
          listings each for the Toyota RAV4, Volvo XC60, and BMW X3. Listings
          with prices below 20,000 SEK or model years before 2005 were
          excluded.
        </p>
        <p>
          Median prices are used for trend lines and retention calculations to
          reduce the influence of outliers. &ldquo;New price&rdquo; for
          retention is the median price of cars aged 0–1 years (or 0–2 if
          insufficient data).
        </p>
      </section>
    </div>
  );
}
