// Today's trade plan, derived from the daily chart the way Saty frames his
// morning "Day Trade Idea" posts: a directional bias from the daily ribbon,
// daily phase, and price vs PDC / D21 — then explicit buy/scale/exit/stop
// prices on each side of the ladder.

import {
  type Bar,
  type AtrLevels,
  type LevelStatsResult,
  ema,
  phaseOscillator,
  phaseZone,
  ribbonTrend,
} from "./indicators";

export type PlanReason = {
  label: string;
  side: "long" | "short" | "neutral";
};

export type TradePlan = {
  bias: "long" | "short" | "mixed";
  reasons: PlanReason[];
  notes: string[];
  // odds of reaching the level given the trigger crossed, from daily history
  odds: {
    goldenUp: number;
    fullUp: number;
    goldenDown: number;
    fullDown: number;
  } | null;
};

export function tradePlan(
  daily: Bar[],
  price: number,
  levels: AtrLevels,
  stats: LevelStatsResult | null
): TradePlan {
  const trend = ribbonTrend(daily);
  const phasePoints = phaseOscillator(daily).points;
  const phaseSignal = phasePoints[phasePoints.length - 1]?.signal ?? NaN;
  const closes = daily.map((b) => b.c);
  const d21 = ema(closes, 21)[closes.length - 1];

  const reasons: PlanReason[] = [
    {
      label: `Daily ribbon ${trend}`,
      side:
        trend === "bullish" ? "long" : trend === "bearish" ? "short" : "neutral",
    },
    {
      label: `Daily phase ${isNaN(phaseSignal) ? "—" : phaseSignal.toFixed(0)} · ${phaseZone(phaseSignal)}`,
      side:
        phaseSignal >= 23.6 ? "long" : phaseSignal <= -23.6 ? "short" : "neutral",
    },
    {
      label: price >= levels.previousClose ? "Above PDC" : "Below PDC",
      side: price >= levels.previousClose ? "long" : "short",
    },
    {
      label: price >= d21 ? "Above D21" : "Below D21",
      side: price >= d21 ? "long" : "short",
    },
  ];

  const longScore = reasons.filter((r) => r.side === "long").length;
  const shortScore = reasons.filter((r) => r.side === "short").length;
  const bias =
    longScore > shortScore ? "long" : shortScore > longScore ? "short" : "mixed";

  const notes: string[] = [];
  if (Math.abs(phaseSignal) >= 100) {
    notes.push(
      "Daily phase is extended (beyond ±100) — momentum often wanes here. Favor mean-reversion setups and smaller size."
    );
  }
  if (!isNaN(levels.rangeVsAtrPct) && levels.rangeVsAtrPct >= 90) {
    notes.push(
      "Today's range has already used ≥90% of ATR — most of the expected day move is spent. New entries are chasing."
    );
  }
  if (bias === "mixed") {
    notes.push(
      "Daily signals are split — no edge on direction. Take only A+ setups at the triggers, or stand aside."
    );
  }

  const odds = stats
    ? {
        goldenUp: stats.up.golden / Math.max(1, stats.up.trigger),
        fullUp: stats.up.full / Math.max(1, stats.up.trigger),
        goldenDown: stats.down.golden / Math.max(1, stats.down.trigger),
        fullDown: stats.down.full / Math.max(1, stats.down.trigger),
      }
    : null;

  return { bias, reasons, notes, odds };
}
