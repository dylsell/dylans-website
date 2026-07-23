import type { Metadata } from "next";
import Nav from "../../components/Nav";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "SPX · Saty Levels",
  description:
    "Live SPX dashboard with Saty Mahajan's ATR Levels, Pivot Ribbon, Phase Oscillator, and Golden Gate tracker",
};

export default function TradingPage() {
  return (
    <main className="min-h-screen bg-black">
      <Nav />
      <Dashboard />
    </main>
  );
}
