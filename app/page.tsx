import { promises as fs } from "fs";
import path from "path";
import StatsCards from "./components/StatsCards";
import StatsBadges from "./components/StatsBadges";
import DepreciationChart from "./components/DepreciationChart";
import RetentionChart from "./components/RetentionChart";
import MileageChart from "./components/MileageChart";
import TcoCalculator from "./components/TcoCalculator";
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
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
          Hela Notan — vad kostar bilen egentligen?
        </h1>
        <p className="text-[var(--muted)] mt-3 max-w-2xl mx-auto">
          Riktig data från {cars.length} annonser på Blocket.se.
          Jämför hur Toyota RAV4, Volvo XC60 och BMW X3 tappar i värde
          över tid, miltal och bränsletyp.
        </p>
      </section>

      {/* Summary stats */}
      <section>
        <StatsCards summary={aggregates.summary} />
      </section>

      {/* Model accuracy */}
      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Modellprecision</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Multivariat regression som tar hänsyn till ålder, miltal, bränsletyp,
            hästkrafter, utrustning, drivlina och säljartyp.
          </p>
        </div>
        <StatsBadges regression={aggregates.regression} />
      </section>

      {/* Depreciation by Age */}
      <section id="depreciation" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Pris per ålder</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Varje punkt är en verklig annons. Trendlinjer visar predikterat pris
            med 95% konfidensband. Filtrera på bränsletyp för att jämföra.
          </p>
        </div>
        <DepreciationChart
          scatter={scatter}
          medians={aggregates.priceByAge}
          predictionCurves={aggregates.predictionCurves}
        />
      </section>

      {/* Value Retention */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Restvärde</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Andel av nypriset som behålls vid varje ålder.
            Skuggade band visar 95% prediktionsosäkerhet.
          </p>
        </div>
        <RetentionChart
          retention={aggregates.retention}
          predictionCurves={aggregates.predictionCurves}
        />
      </section>

      {/* Mileage Impact */}
      <section id="mileage" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Miltalseffekt</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Hur miltal korrelerar med begärt pris för respektive modell.
          </p>
        </div>
        <MileageChart data={aggregates.mileageCost} />
      </section>

      {/* TCO Calculator */}
      <section id="tco" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Ägandekostnadsberäknare</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Jämför den totala ägandekostnaden för två olika bilar. Prediktioner
            beräknas i realtid med vår regressionsmodell tränad
            på {cars.length} verkliga annonser.
          </p>
        </div>
        <TcoCalculator
          regression={aggregates.regression}
          tcoDefaults={aggregates.tcoDefaults}
        />
      </section>

      {/* Key Insights */}
      <section id="insights" className="space-y-4">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Viktiga insikter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--card)] p-5 border-l-4 border-red-400">
            <h3 className="font-semibold text-red-600 mb-2">
              Toyota RAV4 — Bäst restvärde
            </h3>
            <p className="text-sm text-[var(--muted)]">
              RAV4 behåller sitt värde exceptionellt bra. Efter 3 år kvarstår
              ca 89% av nypriset, och efter 5 år fortfarande ca 73%.
              Hybridmodeller har ett pristillägg. Tappar ca 14k kr per 1 000 mil.
            </p>
          </div>
          <div className="bg-[var(--card)] p-5 border-l-4 border-blue-400">
            <h3 className="font-semibold text-blue-600 mb-2">
              Volvo XC60 — Mellanklass
            </h3>
            <p className="text-sm text-[var(--muted)]">
              XC60 ligger mellan RAV4 och X3 i värdeminskning. Stark
              varumärkeslojalitet i Sverige hjälper. PHEV-varianter behåller
              värdet bättre. Tappar ca 18k kr per 1 000 mil.
            </p>
          </div>
          <div className="bg-[var(--card)] p-5 border-l-4 border-sky-400">
            <h3 className="font-semibold text-sky-600 mb-2">
              BMW X3 — Störst tapp
            </h3>
            <p className="text-sm text-[var(--muted)]">
              X3 tappar mest av de tre. Efter 3 år kan den behålla
              endast ca 53% av sitt ursprungspris. Högre underhållskostnader
              och lägre efterfrågan bidrar. Tappar ca 18k kr per 1 000 mil.
            </p>
          </div>
        </div>
      </section>

      {/* Data Explorer */}
      <section id="explorer" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Alla bilar</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Bläddra bland alla {cars.length} insamlade annonser. Sortera på valfri
            kolumn eller filtrera på modell och bränsletyp.
          </p>
        </div>
        <DataTable cars={cars} />
      </section>

      {/* Methodology */}
      <section className="bg-[var(--card)] p-6 border border-[var(--border)] text-sm text-[var(--muted)] space-y-2">
        <h3 className="text-[var(--foreground)] font-semibold">Metod</h3>
        <p>
          Data insamlades från Blocket.se i februari 2026. Vi samlade in ca 100
          annonser vardera för Toyota RAV4, Volvo XC60 och BMW X3. Annonser
          med priser under 20 000 kr eller årsmodeller före 2005 exkluderades.
        </p>
        <p>
          Värdeminskning modelleras med multivariat linjär regression med 10
          variabler: bilålder, miltal, hästkrafter, utrustningsantal, bränsletyp
          (Hybrid/PHEV/Diesel/El), säljartyp och drivlina.
          Detta korrigerar för att olika utrustningsnivåer och bränsletyper
          har olika nypris.
        </p>
        <p>
          95% prediktionsintervall använder ±1,96 × residual standardfel. Ägandekostnadsberäknaren
          använder samma regressionskoefficienter i klienten för att prediktera
          köp/säljpriser för valfri konfiguration.
        </p>
      </section>
    </div>
  );
}
