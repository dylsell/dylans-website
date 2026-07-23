// Exact ports of Saty Mahajan's open-source indicators:
// - Saty ATR Levels (github.com/satymahajan/saty_atr_levels, Pine v5)
// - Saty Pivot Ribbon (github.com/satymahajan/saty_pivot_ribbon, Pine v5)
// - Saty Phase Oscillator (satyland.com/phaseoscillator spec:
//   signal = (close - 21 EMA) / (3 x ATR14) * 100 on a fib grid)

export type Bar = {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type TradingMode = "day" | "multiday" | "swing";

// ── Core series math ───────────────────────────────────────────────

export function ema(values: number[], length: number): number[] {
  const out = new Array(values.length).fill(NaN);
  if (values.length < length) return out;
  const alpha = 2 / (length + 1);
  let sum = 0;
  for (let i = 0; i < length; i++) sum += values[i];
  let prev = sum / length; // seed with SMA like Pine's ta.ema
  out[length - 1] = prev;
  for (let i = length; i < values.length; i++) {
    prev = alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

export function trueRange(bars: Bar[]): number[] {
  return bars.map((b, i) => {
    if (i === 0) return b.h - b.l;
    const pc = bars[i - 1].c;
    return Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
  });
}

// Wilder's smoothing (RMA), matching Pine ta.atr / ThinkScript WildersAverage
export function wilderAtr(bars: Bar[], length = 14): number[] {
  const tr = trueRange(bars);
  const out = new Array(bars.length).fill(NaN);
  if (bars.length < length) return out;
  let sum = 0;
  for (let i = 0; i < length; i++) sum += tr[i];
  let prev = sum / length;
  out[length - 1] = prev;
  for (let i = length; i < bars.length; i++) {
    prev = (prev * (length - 1) + tr[i]) / length;
    out[i] = prev;
  }
  return out;
}

function stdev(values: number[], length: number): number[] {
  const out = new Array(values.length).fill(NaN);
  for (let i = length - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - length + 1; j <= i; j++) sum += values[j];
    const mean = sum / length;
    let sq = 0;
    for (let j = i - length + 1; j <= i; j++) sq += (values[j] - mean) ** 2;
    out[i] = Math.sqrt(sq / length);
  }
  return out;
}

function sma(values: number[], length: number): number[] {
  const out = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= length) sum -= values[i - length];
    if (i >= length - 1) out[i] = sum / length;
  }
  return out;
}

// ── Bar aggregation (daily → weekly/monthly anchors) ───────────────

function weekKey(t: number): string {
  // ISO week key in UTC; daily bar timestamps from Yahoo are session-start
  const d = new Date(t * 1000);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day);
  return monday.toISOString().slice(0, 10);
}

function monthKey(t: number): string {
  return new Date(t * 1000).toISOString().slice(0, 7);
}

export function aggregate(daily: Bar[], period: "week" | "month"): Bar[] {
  const keyFn = period === "week" ? weekKey : monthKey;
  const out: Bar[] = [];
  let key = "";
  for (const b of daily) {
    const k = keyFn(b.t);
    if (k !== key) {
      key = k;
      out.push({ ...b });
    } else {
      const cur = out[out.length - 1];
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v;
    }
  }
  return out;
}

export function aggregateIntraday(m5: Bar[], minutes: number): Bar[] {
  const step = minutes * 60;
  const out: Bar[] = [];
  let bucket = -1;
  for (const b of m5) {
    const k = Math.floor(b.t / step);
    if (k !== bucket) {
      bucket = k;
      out.push({ ...b, t: k * step });
    } else {
      const cur = out[out.length - 1];
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v;
    }
  }
  return out;
}

// ── Saty ATR Levels ────────────────────────────────────────────────
// Pine: previous_close = anchor close[1], atr = anchor ta.atr(14)[1],
// levels at prev_close ± fib * atr; extensions chain off the ±1 ATR level.

export type AtrLevels = {
  mode: TradingMode;
  previousClose: number;
  atr: number;
  periodHigh: number;
  periodLow: number;
  range: number;
  rangeVsAtrPct: number; // tr_percent_of_atr
  upper: Record<string, number>;
  lower: Record<string, number>;
};

const FIBS: [string, number][] = [
  ["trigger", 0.236],
  ["0.382", 0.382],
  ["0.5", 0.5],
  ["0.618", 0.618],
  ["0.786", 0.786],
  ["1ATR", 1.0],
  ["1.236", 1.236],
  ["1.382", 1.382],
  ["1.5", 1.5],
  ["1.618", 1.618],
  ["1.786", 1.786],
  ["2ATR", 2.0],
  ["2.236", 2.236],
  ["2.618", 2.618],
  ["3ATR", 3.0],
];

export function atrLevels(
  daily: Bar[],
  mode: TradingMode,
  // 0 = levels for the current/most recent session (uses prior completed bar,
  // matching Saty's default). 1 = preview next session after the close.
  shift: 0 | 1 = 0
): AtrLevels | null {
  const bars =
    mode === "day"
      ? daily
      : aggregate(daily, mode === "multiday" ? "week" : "month");
  const atrSeries = wilderAtr(bars, 14);
  const cur = bars.length - 1 + shift; // index of the period being traded
  const prev = cur - 1;
  if (prev < 14) return null;
  const previousClose = bars[prev].c;
  const atr = atrSeries[prev];
  const periodHigh = shift === 0 ? bars[cur].h : NaN;
  const periodLow = shift === 0 ? bars[cur].l : NaN;
  const range = shift === 0 ? periodHigh - periodLow : NaN;

  const upper: Record<string, number> = {};
  const lower: Record<string, number> = {};
  for (const [name, fib] of FIBS) {
    upper[name] = previousClose + fib * atr;
    lower[name] = previousClose - fib * atr;
  }
  return {
    mode,
    previousClose,
    atr,
    periodHigh,
    periodLow,
    range,
    rangeVsAtrPct: shift === 0 ? (range / atr) * 100 : NaN,
    upper,
    lower,
  };
}

// Range-vs-ATR coloring from the Pine source: ≤70 green, ≥90 red, else orange
export function rangeColor(pct: number): "green" | "orange" | "red" {
  if (pct <= 70) return "green";
  if (pct >= 90) return "red";
  return "orange";
}

// ── Saty Pivot Ribbon ──────────────────────────────────────────────

export type Ribbon = {
  fast: number[]; // 8 EMA
  pivot: number[]; // 21 EMA
  slow: number[]; // 34 EMA
  fastConviction: number[]; // 13 EMA
  slowConviction: number[]; // 48 EMA
  // bar indexes where 13/48 cross confirmed
  bullishConvictionArrows: number[];
  bearishConvictionArrows: number[];
};

export function pivotRibbon(bars: Bar[]): Ribbon {
  const closes = bars.map((b) => b.c);
  const fast = ema(closes, 8);
  const pivot = ema(closes, 21);
  const slow = ema(closes, 34);
  const fastConviction = ema(closes, 13);
  const slowConviction = ema(closes, 48);
  const bullishConvictionArrows: number[] = [];
  const bearishConvictionArrows: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const nowBull = fastConviction[i] >= slowConviction[i];
    const wasBull = fastConviction[i - 1] >= slowConviction[i - 1];
    if (!isNaN(slowConviction[i]) && !isNaN(slowConviction[i - 1])) {
      if (nowBull && !wasBull) bullishConvictionArrows.push(i);
      if (!nowBull && wasBull) bearishConvictionArrows.push(i);
    }
  }
  return {
    fast,
    pivot,
    slow,
    fastConviction,
    slowConviction,
    bullishConvictionArrows,
    bearishConvictionArrows,
  };
}

// Trend label from the ATR Levels script (8-21-34 ribbon)
export function ribbonTrend(
  bars: Bar[]
): "bullish" | "bearish" | "neutral" {
  const closes = bars.map((b) => b.c);
  const i = bars.length - 1;
  const f = ema(closes, 8)[i];
  const p = ema(closes, 21)[i];
  const s = ema(closes, 34)[i];
  const price = closes[i];
  if (price >= f && f >= p && p >= s) return "bullish";
  if (price <= f && f <= p && p <= s) return "bearish";
  return "neutral";
}

// ── Saty Phase Oscillator ──────────────────────────────────────────

export type PhasePoint = {
  t: number;
  signal: number;
  compression: boolean;
  rising: boolean;
};

export type PhaseResult = {
  points: PhasePoint[];
  // crossover markers (bar indexes)
  leavingAccumulation: number[]; // cross above -61.8
  leavingDistribution: number[]; // cross below +61.8
  leavingExtendedUp: number[]; // cross below +100
  leavingExtendedDown: number[]; // cross above -100
};

export function phaseOscillator(bars: Bar[]): PhaseResult {
  const closes = bars.map((b) => b.c);
  const pivot = ema(closes, 21);
  const atr = wilderAtr(bars, 14);
  const signal = closes.map((c, i) =>
    isNaN(pivot[i]) || isNaN(atr[i]) ? NaN : ((c - pivot[i]) / (3 * atr[i])) * 100
  );
  // Bollinger compression (squeeze): BB(20,2) inside Keltner(20, 1.5*ATR)
  const basis = sma(closes, 20);
  const dev = stdev(closes, 20);
  const points: PhasePoint[] = [];
  for (let i = 0; i < bars.length; i++) {
    const compressed =
      !isNaN(basis[i]) &&
      !isNaN(atr[i]) &&
      basis[i] + 2 * dev[i] < basis[i] + 1.5 * atr[i] &&
      basis[i] - 2 * dev[i] > basis[i] - 1.5 * atr[i];
    points.push({
      t: bars[i].t,
      signal: signal[i],
      compression: compressed,
      rising: i > 0 ? signal[i] >= signal[i - 1] : true,
    });
  }
  const leavingAccumulation: number[] = [];
  const leavingDistribution: number[] = [];
  const leavingExtendedUp: number[] = [];
  const leavingExtendedDown: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const a = signal[i - 1];
    const b = signal[i];
    if (isNaN(a) || isNaN(b)) continue;
    if (a <= -61.8 && b > -61.8) leavingAccumulation.push(i);
    if (a >= 61.8 && b < 61.8) leavingDistribution.push(i);
    if (a >= 100 && b < 100) leavingExtendedUp.push(i);
    if (a <= -100 && b > -100) leavingExtendedDown.push(i);
  }
  return {
    points,
    leavingAccumulation,
    leavingDistribution,
    leavingExtendedUp,
    leavingExtendedDown,
  };
}

export function phaseZone(signal: number): string {
  if (signal >= 100) return "Extended Up";
  if (signal >= 61.8) return "Distribution Zone";
  if (signal >= 23.6) return "Mark Up";
  if (signal > -23.6) return "Neutral Zone";
  if (signal > -61.8) return "Mark Down";
  if (signal > -100) return "Accumulation Zone";
  return "Extended Down";
}

// ── Golden Gate tracker ────────────────────────────────────────────
// Saty's Golden Gate: once price takes the 23.6% trigger and crosses the
// 38.2% level, the 61.8% "golden fib" becomes the magnet (~60%+ hit rate).

export type GoldenGate = {
  direction: "up" | "down";
  triggerCrossed: boolean;
  gateCrossed: boolean; // 38.2
  complete: boolean; // 61.8 tagged
  fullAtr: boolean; // ±1 ATR tagged
  triggerLevel: number;
  gateLevel: number;
  goldenLevel: number;
  fullLevel: number;
};

export function goldenGates(levels: AtrLevels): GoldenGate[] {
  const { periodHigh, periodLow, upper, lower } = levels;
  return [
    {
      direction: "up" as const,
      triggerCrossed: periodHigh >= upper.trigger,
      gateCrossed: periodHigh >= upper["0.382"],
      complete: periodHigh >= upper["0.618"],
      fullAtr: periodHigh >= upper["1ATR"],
      triggerLevel: upper.trigger,
      gateLevel: upper["0.382"],
      goldenLevel: upper["0.618"],
      fullLevel: upper["1ATR"],
    },
    {
      direction: "down" as const,
      triggerCrossed: periodLow <= lower.trigger,
      gateCrossed: periodLow <= lower["0.382"],
      complete: periodLow <= lower["0.618"],
      fullAtr: periodLow <= lower["1ATR"],
      triggerLevel: lower.trigger,
      gateLevel: lower["0.382"],
      goldenLevel: lower["0.618"],
      fullLevel: lower["1ATR"],
    },
  ];
}

// ── Historical level statistics ────────────────────────────────────
// For each past session, anchor levels on the prior day (close + ATR through
// that day, same as the live indicator) and check which levels the session's
// high/low actually tagged. This scores Saty's probabilities (e.g. "38.2
// crossed → 60%+ chance of 61.8") on real SPX data.

export type SideLevelStats = {
  days: number; // sessions evaluated
  trigger: number; // sessions that crossed the 23.6% trigger
  gate: number; // ...and the 38.2% gate
  golden: number; // ...and the 61.8% golden fib
  full: number; // ...and the full ±1 ATR
};

export type LevelStatsResult = {
  up: SideLevelStats;
  down: SideLevelStats;
  bothTriggers: number; // sessions where both sides triggered
};

export function levelStats(
  daily: Bar[],
  lookback: number,
  excludeLast: boolean // true while the last bar is a live partial session
): LevelStatsResult {
  const atr = wilderAtr(daily, 14);
  const empty = (): SideLevelStats => ({
    days: 0,
    trigger: 0,
    gate: 0,
    golden: 0,
    full: 0,
  });
  const up = empty();
  const down = empty();
  let bothTriggers = 0;
  const end = daily.length - (excludeLast ? 1 : 0);
  const start = Math.max(15, end - lookback);
  for (let i = start; i < end; i++) {
    const a = atr[i - 1];
    const pc = daily[i - 1].c;
    if (isNaN(a)) continue;
    up.days++;
    down.days++;
    const hi = daily[i].h;
    const lo = daily[i].l;
    const upTrig = hi >= pc + 0.236 * a;
    const dnTrig = lo <= pc - 0.236 * a;
    if (upTrig) {
      up.trigger++;
      if (hi >= pc + 0.382 * a) up.gate++;
      if (hi >= pc + 0.618 * a) up.golden++;
      if (hi >= pc + a) up.full++;
    }
    if (dnTrig) {
      down.trigger++;
      if (lo <= pc - 0.382 * a) down.gate++;
      if (lo <= pc - 0.618 * a) down.golden++;
      if (lo <= pc - a) down.full++;
    }
    if (upTrig && dnTrig) bothTriggers++;
  }
  return { up, down, bothTriggers };
}

// ── Daily reading (auto-caption in the style of Saty's posts) ──────

export type DailyReading = {
  atrDay: number; // (price - prevClose) / ATR
  caption: string;
};

export function dailyReading(
  price: number,
  levels: AtrLevels,
  trend: "bullish" | "bearish" | "neutral",
  phaseSignal: number,
  marketOpen: boolean
): DailyReading {
  let atrDay = (price - levels.previousClose) / levels.atr;
  if (Math.abs(atrDay) < 0.005) atrDay = 0; // avoid "-0.00"
  const gates = goldenGates(levels);
  const up = gates[0];
  const down = gates[1];
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lines: string[] = [];
  const tense = marketOpen ? "is putting in" : "put in";
  lines.push(
    `$SPX ${tense} a ${atrDay >= 0 ? "+" : ""}${atrDay.toFixed(2)} ATR day.`
  );
  lines.push(
    `Range is ${levels.rangeVsAtrPct.toFixed(0)}% of ATR ($${fmt(levels.atr)}).`
  );
  lines.push(`Daily ribbon: ${trend}. Phase oscillator: ${phaseSignal.toFixed(1)} (${phaseZone(phaseSignal)}).`);
  if (up.complete) {
    lines.push(`Upside Golden Gate complete (${fmt(up.goldenLevel)} tagged)${up.fullAtr ? " and +1 ATR hit." : "."}`);
  } else if (up.gateCrossed) {
    lines.push(`Upside Golden Gate open — 61.8 magnet at ${fmt(up.goldenLevel)}.`);
  } else if (up.triggerCrossed) {
    lines.push(`Call trigger (${fmt(up.triggerLevel)}) crossed.`);
  }
  if (down.complete) {
    lines.push(`Downside Golden Gate complete (${fmt(down.goldenLevel)} tagged)${down.fullAtr ? " and -1 ATR hit." : "."}`);
  } else if (down.gateCrossed) {
    lines.push(`Downside Golden Gate open — 61.8 magnet at ${fmt(down.goldenLevel)}.`);
  } else if (down.triggerCrossed) {
    lines.push(`Put trigger (${fmt(down.triggerLevel)}) crossed.`);
  }
  lines.push(
    `Calls > ${fmt(levels.upper.trigger)} | +1 ATR ${fmt(levels.upper["1ATR"])}`
  );
  lines.push(
    `Puts < ${fmt(levels.lower.trigger)} | -1 ATR ${fmt(levels.lower["1ATR"])}`
  );
  return { atrDay, caption: lines.join("\n") };
}
