import { ModelSelectionProvider } from "./components/ModelSelectionContext";
import ModelSelector from "./components/ModelSelector";
import HeroSection from "./components/HeroSection";
import StatsSection from "./components/StatsSection";
import ChartSection from "./components/ChartSection";
import DataTableSection from "./components/DataTableSection";

export default function Home() {
  return (
    <ModelSelectionProvider>
      <div className="space-y-10">
        {/* Hero */}
        <HeroSection />

        {/* Model Selector */}
        <section>
          <p className="text-xs text-[var(--muted)] mb-2">Välj modeller att jämföra</p>
          <ModelSelector />
        </section>

        {/* Summary stats + model accuracy */}
        <StatsSection />

        {/* Charts — shared legend filter state */}
        <ChartSection />

        {/* Data Explorer */}
        <section id="explorer" className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Annonser</h2>
            <p className="text-[var(--muted)] text-sm mt-1">
              Visar annonser för valda modeller och bränsletyp.
            </p>
          </div>
          <DataTableSection />
        </section>

        {/* Methodology */}
        <section className="bg-[var(--card)] p-5 border border-[var(--border)] text-sm text-[var(--muted)] space-y-2">
          <h3 className="text-[var(--foreground)] font-semibold">Metod</h3>
          <p>
            Data insamlades från Blocket.se i februari 2026. Annonser
            med priser under 20 000 kr eller årsmodeller före 2005 exkluderades.
          </p>
          <p>
            Värdeminskning modelleras med multivariat linjär regression med 14
            variabler: bilålder, miltal, hästkrafter, utrustningsantal, bränsletyp
            (Hybrid/PHEV/Diesel/El), säljartyp, drivlina samt interaktionstermer
            mellan bränsletyp och ålder/miltal.
          </p>
          <p>
            95% prediktionsintervall använder ±1,96 × residual standardfel. Ägandekostnadsberäknaren
            använder samma regressionskoefficienter i klienten för att prediktera
            köp/säljpriser för valfri konfiguration.
          </p>
        </section>
      </div>
    </ModelSelectionProvider>
  );
}
