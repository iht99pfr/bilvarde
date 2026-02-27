import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bilvärde — Swedish Used Car Depreciation Guide",
  description:
    "Compare depreciation curves for Toyota RAV4, Volvo XC60, and BMW X3 based on real Blocket listing data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        <nav className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight">
                Bil<span className="text-amber-400">värde</span>
              </span>
              <span className="text-xs text-zinc-500 hidden sm:inline">
                Swedish Used Car Depreciation Guide
              </span>
            </div>
            <div className="flex gap-4 text-sm text-zinc-400">
              <a href="#depreciation" className="hover:text-zinc-100 transition">
                Depreciation
              </a>
              <a href="#mileage" className="hover:text-zinc-100 transition">
                Mileage
              </a>
              <a href="#tco" className="hover:text-zinc-100 transition">
                TCO
              </a>
              <a href="#factors" className="hover:text-zinc-100 transition">
                Factors
              </a>
              <a href="#explorer" className="hover:text-zinc-100 transition">
                Explorer
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        <footer className="border-t border-zinc-800 px-6 py-6 text-center text-xs text-zinc-600">
          Data scraped from Blocket.se — {new Date().getFullYear()} — Built with
          Next.js + Recharts
        </footer>
      </body>
    </html>
  );
}
