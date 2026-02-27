import StatsSection from "./components/StatsSection";
import ChartSection from "./components/ChartSection";
import TcoSection from "./components/TcoSection";
import DataTableSection from "./components/DataTableSection";

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
          Hela Notan — vad kostar bilen egentligen?
        </h1>
        <p className="text-[var(--muted)] mt-3 max-w-2xl mx-auto">
          Riktig data från Blocket.se.
          Jämför hur Toyota RAV4, Volvo XC60 och BMW X3 tappar i värde
          över tid, miltal och bränsletyp.
        </p>
      </section>

      {/* Summary stats + model accuracy */}
      <StatsSection />

      {/* Charts — shared legend filter state */}
      <ChartSection />

      {/* TCO Calculator */}
      <section id="tco" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Ägandekostnadsberäknare</h2>
          <p className="text-[var(--muted)] text-sm mt-1">
            Jämför den totala ägandekostnaden för två olika bilar. Prediktioner
            beräknas i realtid med vår regressionsmodell tränad på verkliga annonser.
          </p>
        </div>
        <TcoSection />
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
            Bläddra bland alla insamlade annonser. Sortera på valfri
            kolumn eller filtrera på modell och bränsletyp.
          </p>
        </div>
        <DataTableSection />
      </section>

      {/* Methodology */}
      <section className="bg-[var(--card)] p-6 border border-[var(--border)] text-sm text-[var(--muted)] space-y-2">
        <h3 className="text-[var(--foreground)] font-semibold">Metod</h3>
        <p>
          Data insamlades från Blocket.se i februari 2026. Annonser
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
