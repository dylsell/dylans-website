"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PriceChart from "./components/PriceChart";
import PhaseChart from "./components/PhaseChart";
import {
  type Bar,
  type TradingMode,
  atrLevels,
  aggregateIntraday,
  dailyReading,
  goldenGates,
  levelStats,
  phaseOscillator,
  phaseZone,
  rangeColor,
  ribbonTrend,
} from "./lib/indicators";
import { daySignals, type TradeEvent } from "./lib/signals";
import { tradePlan } from "./lib/plan";

type SpxData = {
  symbol: string;
  price: number;
  etTime: string;
  marketOpen: boolean;
  realtime?: boolean;
  stale?: boolean;
  daily: Bar[];
  m1: Bar[];
};

type Timeframe = "1m" | "5m" | "15m" | "D";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "D"];
const MODES: { id: TradingMode; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "multiday", label: "Multiday" },
  { id: "swing", label: "Swing" },
];

const VISIBLE_BARS: Record<Timeframe, number> = {
  "1m": 200,
  "5m": 85,
  "15m": 30,
  D: 120,
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const badgeColors = {
  green: "bg-green-500/15 text-green-400 border-green-500/40",
  red: "bg-red-500/15 text-red-400 border-red-500/40",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  zinc: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
};

function Badge({
  color,
  children,
}: {
  color: keyof typeof badgeColors;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${badgeColors[color]}`}
    >
      {children}
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<SpxData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TradingMode>("day");
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [showAllFibs, setShowAllFibs] = useState(true);
  const [showExtensions, setShowExtensions] = useState(false);
  const [showConviction, setShowConviction] = useState(true);
  const [nextSession, setNextSession] = useState(false);
  const [copied, setCopied] = useState(false);

  // Replay state: a stored session is played back bar-by-bar; everything
  // downstream (levels, signals, gates, charts) derives from the sliced bars.
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [replayDate, setReplayDate] = useState<string | null>(null);
  const [replayBars, setReplayBars] = useState<Bar[]>([]);
  const [replayIdx, setReplayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(10); // bars per second
  const [statsLookback, setStatsLookback] = useState(250);
  const replayIdxRef = useRef(0);

  const replaying = replayDate !== null;

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/spx/sessions");
      if (res.ok) {
        const json = await res.json();
        setSessionDates(json.dates ?? []);
      }
    } catch {
      // session list is optional; ignore
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/spx");
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
      loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load");
    }
  }, [loadSessions]);

  // Refresh fast while the market is open (the API caches for 20s), slow when closed
  const refreshMs = data?.marketOpen ? 20_000 : 60_000;
  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);

  const startReplay = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/spx/sessions?date=${date}`);
      if (!res.ok) return;
      const json = await res.json();
      const bars: Bar[] = json.bars ?? [];
      if (bars.length === 0) return;
      setReplayBars(bars);
      setReplayIdx(Math.min(21, bars.length));
      setReplayDate(date);
      setPlaying(true); // auto-play so selecting a session is enough
      setMode("day");
      setNextSession(false);
      setTimeframe((tf) => (tf === "D" ? "5m" : tf));
    } catch {
      // leave live mode untouched on failure
    }
  }, []);

  const exitReplay = useCallback(() => {
    setReplayDate(null);
    setReplayBars([]);
    setPlaying(false);
  }, []);

  useEffect(() => {
    replayIdxRef.current = replayIdx;
  }, [replayIdx]);

  // Playback timer: anchored to wall-clock time so playback speed holds even
  // when rendering throttles the interval (bars are skipped, not delayed)
  useEffect(() => {
    if (!playing || replayBars.length === 0) return;
    const anchor = { t: Date.now(), idx: replayIdxRef.current };
    const id = setInterval(() => {
      const elapsed = (Date.now() - anchor.t) / 1000;
      setReplayIdx(
        Math.min(anchor.idx + Math.round(elapsed * speed), replayBars.length)
      );
    }, 150);
    return () => clearInterval(id);
  }, [playing, speed, replayBars.length]);

  useEffect(() => {
    if (playing && replayIdx >= replayBars.length) setPlaying(false);
  }, [playing, replayIdx, replayBars.length]);

  const marketOpen = data?.marketOpen ?? false;

  const slicedM1 = useMemo(
    () => (replaying ? replayBars.slice(0, replayIdx) : []),
    [replaying, replayBars, replayIdx]
  );

  // Daily history as of the session being viewed (replay hides later days,
  // and the replayed day's bar only contains the bars seen so far)
  const dailyForView = useMemo(() => {
    if (!data) return [];
    if (!replaying || !replayDate) return data.daily;
    const past = data.daily.filter(
      (b) => new Date(b.t * 1000).toISOString().slice(0, 10) < replayDate
    );
    if (slicedM1.length === 0) return past;
    const sessionDay = data.daily.find(
      (b) => new Date(b.t * 1000).toISOString().slice(0, 10) === replayDate
    );
    past.push({
      t: sessionDay?.t ?? slicedM1[0].t,
      o: slicedM1[0].o,
      h: Math.max(...slicedM1.map((b) => b.h)),
      l: Math.min(...slicedM1.map((b) => b.l)),
      c: slicedM1[slicedM1.length - 1].c,
      v: 0,
    });
    return past;
  }, [data, replaying, replayDate, slicedM1]);

  const levels = useMemo(() => {
    if (!data) return null;
    if (replaying) {
      const base = atrLevels(dailyForView, "day");
      if (!base) return null;
      // Range/high/low reflect only the bars replayed so far
      if (slicedM1.length === 0) {
        return {
          ...base,
          periodHigh: base.previousClose,
          periodLow: base.previousClose,
          range: 0,
          rangeVsAtrPct: 0,
        };
      }
      const hi = Math.max(...slicedM1.map((b) => b.h));
      const lo = Math.min(...slicedM1.map((b) => b.l));
      return {
        ...base,
        periodHigh: hi,
        periodLow: lo,
        range: hi - lo,
        rangeVsAtrPct: ((hi - lo) / base.atr) * 100,
      };
    }
    return atrLevels(data.daily, mode, nextSession && !marketOpen ? 1 : 0);
  }, [data, mode, nextSession, marketOpen, replaying, dailyForView, slicedM1]);

  const displayBars = useMemo(() => {
    if (!data) return [];
    const m1 = replaying ? slicedM1 : data.m1;
    switch (timeframe) {
      case "1m":
        return m1;
      case "5m":
        return aggregateIntraday(m1, 5);
      case "15m":
        return aggregateIntraday(m1, 15);
      case "D":
        return replaying ? aggregateIntraday(m1, 5) : data.daily;
    }
  }, [data, timeframe, replaying, slicedM1]);

  // Price the dashboard reads from: live quote, or last replayed close
  const price = replaying
    ? slicedM1.length > 0
      ? slicedM1[slicedM1.length - 1].c
      : levels?.previousClose ?? 0
    : data?.price ?? 0;

  const reading = useMemo(() => {
    if (!data || !levels || nextSession) return null;
    const dayLevels = replaying
      ? levels
      : mode === "day"
        ? levels
        : atrLevels(data.daily, "day");
    if (!dayLevels) return null;
    const trend = ribbonTrend(dailyForView);
    const phase = phaseOscillator(dailyForView);
    const lastSignal = phase.points[phase.points.length - 1]?.signal ?? NaN;
    return {
      trend,
      phaseSignal: lastSignal,
      ...dailyReading(
        price,
        dayLevels,
        trend,
        lastSignal,
        marketOpen || replaying
      ),
    };
  }, [data, levels, mode, nextSession, marketOpen, replaying, dailyForView, price]);

  const gates = useMemo(
    () => (levels && !nextSession ? goldenGates(levels) : null),
    [levels, nextSession]
  );

  // Signal engine always runs against day-mode levels on intraday closes
  // (the displayed timeframe, falling back to 1m when the daily chart is up)
  const signalBars = useMemo(() => {
    if (!data) return [];
    if (replaying) {
      return timeframe === "D" ? aggregateIntraday(slicedM1, 5) : displayBars;
    }
    return timeframe === "D" ? data.m1 : displayBars;
  }, [data, timeframe, displayBars, replaying, slicedM1]);

  // Day-mode levels regardless of the selected mode (replay-aware)
  const dayLevels = useMemo(() => {
    if (!data) return null;
    return replaying ? levels : atrLevels(data.daily, "day");
  }, [data, replaying, levels]);

  // Engine runs on the displayed timeframe; early in a session when that
  // timeframe lacks warmup bars, fall back to 1m closes so the plan card's
  // chips and tape are alive from ~9:53 on.
  const signalsPack = useMemo(() => {
    if (!data || nextSession || !dayLevels) return null;
    const primaryTf = timeframe === "D" ? "1m" : timeframe;
    const primary = daySignals(signalBars, dayLevels);
    if (primary) return { signals: primary, tf: primaryTf };
    const m1 = replaying ? slicedM1 : data.m1;
    const fallback = daySignals(m1, dayLevels);
    return fallback ? { signals: fallback, tf: "1m" } : null;
  }, [data, signalBars, nextSession, dayLevels, timeframe, replaying, slicedM1]);

  const signals = signalsPack?.signals ?? null;
  const signalsTf = signalsPack?.tf ?? (timeframe === "D" ? "1m" : timeframe);

  // Historical trigger → target hit rates over the daily history
  const stats = useMemo(
    () => (data ? levelStats(data.daily, statsLookback, marketOpen) : null),
    [data, statsLookback, marketOpen]
  );

  // Daily-chart bias + explicit instructions for both sides
  const plan = useMemo(() => {
    if (!data || !dayLevels || nextSession) return null;
    return tradePlan(dailyForView, price, dayLevels, stats);
  }, [data, dayLevels, nextSession, dailyForView, price, stats]);

  const planGates = useMemo(
    () => (dayLevels && !nextSession ? goldenGates(dayLevels) : null),
    [dayLevels, nextSession]
  );

  const copyCaption = async () => {
    if (!reading) return;
    await navigator.clipboard.writeText(reading.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (error && !data) {
    return (
      <div className="pt-32 text-center text-zinc-400">
        Failed to load SPX data: {error}
      </div>
    );
  }
  if (!data || !levels) {
    return (
      <div className="pt-32 text-center text-zinc-500 animate-pulse">
        Loading SPX data…
      </div>
    );
  }

  const dayAnchor = replaying ? levels : atrLevels(data.daily, "day");
  const change = price - (dayAnchor?.previousClose ?? price);
  const changePct = (change / (price - change)) * 100;
  const rc = nextSession ? "zinc" : rangeColor(levels.rangeVsAtrPct);
  const trendColor =
    reading?.trend === "bullish"
      ? "green"
      : reading?.trend === "bearish"
        ? "red"
        : "orange";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 text-zinc-100">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            SPX <span className="text-zinc-500 font-semibold">· Saty Levels</span>
          </h1>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums">
              {fmt(price)}
            </span>
            <span
              className={`text-lg font-bold tabular-nums ${change >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {change >= 0 ? "+" : ""}
              {fmt(change)} ({changePct.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {replaying ? (
            <Badge color="orange">REPLAY {replayDate}</Badge>
          ) : (
            <>
              <Badge color={marketOpen ? "green" : "zinc"}>
                {marketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
              </Badge>
              <Badge color={data.realtime ? "green" : "orange"}>
                {data.realtime ? "● LIVE DATA" : "DELAYED ~15M"}
              </Badge>
            </>
          )}
          {reading && (
            <>
              <Badge color={trendColor as keyof typeof badgeColors}>
                RIBBON {reading.trend.toUpperCase()}
              </Badge>
              <Badge color={reading.atrDay >= 0 ? "green" : "red"}>
                {reading.atrDay >= 0 ? "+" : ""}
                {reading.atrDay.toFixed(2)} ATR DAY
              </Badge>
              <Badge color={rc}>
                RANGE {levels.rangeVsAtrPct.toFixed(0)}% OF ATR
              </Badge>
              <Badge color="zinc">
                PHASE {reading.phaseSignal.toFixed(1)} ·{" "}
                {phaseZone(reading.phaseSignal).toUpperCase()}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Auto-caption */}
      {reading && (
        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Daily Reading (auto-generated, Saty style)
            </h2>
            <button
              onClick={copyCaption}
              className="rounded-md border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="mt-2 whitespace-pre-line font-mono text-sm leading-6 text-zinc-200">
            {reading.caption}
          </p>
        </div>
      )}

      {/* Today's trade plan */}
      {plan && dayLevels && planGates && (
        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              {replaying ? `Trade Plan · replay ${replayDate}` : "Today's Trade Plan"}
            </h2>
            <span
              className={`rounded-full border px-3 py-1 text-sm font-black tracking-tight ${
                plan.bias === "long"
                  ? "border-green-500/50 bg-green-500/10 text-green-300"
                  : plan.bias === "short"
                    ? "border-red-500/50 bg-red-500/10 text-red-300"
                    : "border-zinc-600 bg-zinc-800/60 text-zinc-300"
              }`}
            >
              {plan.bias === "long"
                ? "▲ DAILY BIAS: LONG — FAVOR CALLS"
                : plan.bias === "short"
                  ? "▼ DAILY BIAS: SHORT — FAVOR PUTS"
                  : "◆ DAILY BIAS: MIXED — NO EDGE"}
            </span>
          </div>

          {/* Why: daily-chart evidence */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.reasons.map((r) => (
              <span
                key={r.label}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  r.side === "long"
                    ? "border-green-500/40 bg-green-500/10 text-green-300"
                    : r.side === "short"
                      ? "border-red-500/40 bg-red-500/10 text-red-300"
                      : "border-zinc-700 bg-zinc-800/60 text-zinc-400"
                }`}
              >
                {r.side === "long" ? "▲" : r.side === "short" ? "▼" : "◆"}{" "}
                {r.label}
              </span>
            ))}
          </div>

          {/* The two plans, exact prices */}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {(
              [
                {
                  side: "long" as const,
                  title: "BUY CALLS (long)",
                  gate: planGates[0],
                  checklist: signals?.long ?? null,
                  enterWord: "above",
                  trig: dayLevels.upper.trigger,
                  scale: dayLevels.upper["0.618"],
                  target: dayLevels.upper["1ATR"],
                  oddsGolden: plan.odds?.goldenUp,
                  oddsFull: plan.odds?.fullUp,
                },
                {
                  side: "short" as const,
                  title: "BUY PUTS (short)",
                  gate: planGates[1],
                  checklist: signals?.short ?? null,
                  enterWord: "below",
                  trig: dayLevels.lower.trigger,
                  scale: dayLevels.lower["0.618"],
                  target: dayLevels.lower["1ATR"],
                  oddsGolden: plan.odds?.goldenDown,
                  oddsFull: plan.odds?.fullDown,
                },
              ]
            ).map((p) => {
              const focused = plan.bias === p.side;
              const counter = plan.bias !== "mixed" && !focused;
              const status = p.gate.fullAtr
                ? "1 ATR DONE"
                : p.gate.complete
                  ? "GG COMPLETE"
                  : p.gate.gateCrossed
                    ? "GG OPEN"
                    : p.gate.triggerCrossed
                      ? "TRIGGERED"
                      : "WAITING";
              const accent =
                p.side === "long" ? "text-green-400" : "text-red-400";
              const tf = signalsTf;
              return (
                <div
                  key={p.side}
                  className={`rounded-lg border p-3 ${
                    focused
                      ? p.side === "long"
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-red-500/50 bg-red-500/5"
                      : "border-zinc-800 bg-zinc-900/40"
                  } ${counter ? "opacity-70" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-black ${accent}`}>
                      {p.side === "long" ? "▲" : "▼"} {p.title}
                    </span>
                    <span className="flex items-center gap-2">
                      {focused && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          p.side === "long"
                            ? "border-green-500/50 text-green-300"
                            : "border-red-500/50 text-red-300"
                        }`}>
                          FOCUS
                        </span>
                      )}
                      <span className="font-mono text-[11px] font-bold text-zinc-400">
                        {status}
                      </span>
                    </span>
                  </div>
                  {counter && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Counter-trend today — half size or skip.
                    </p>
                  )}
                  <ol className="mt-2 space-y-1.5 text-sm leading-5 text-zinc-300">
                    <li>
                      <span className="font-bold text-zinc-100">1. ENTER</span>{" "}
                      when a {tf} candle closes {p.enterWord}{" "}
                      <span className={`font-mono font-bold ${accent}`}>
                        ${fmt(p.trig)}
                      </span>
                      {p.checklist && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {(
                            [
                              ["price", p.checklist.triggerCrossed],
                              ["ribbon", p.checklist.ribbonAligned],
                              ["phase", p.checklist.phaseOk],
                            ] as [string, boolean][]
                          ).map(([label, ok]) => (
                            <span
                              key={label}
                              className={`rounded-full border px-2 py-0 text-[10px] font-semibold ${
                                ok
                                  ? "border-green-500/40 bg-green-500/10 text-green-300"
                                  : "border-zinc-700 bg-zinc-800/60 text-zinc-500"
                              }`}
                            >
                              {ok ? "✓" : "○"} {label}
                            </span>
                          ))}
                        </span>
                      )}
                    </li>
                    <li>
                      <span className="font-bold text-zinc-100">2. SCALE ½</span>{" "}
                      at{" "}
                      <span className="font-mono font-bold text-yellow-300">
                        ${fmt(p.scale)}
                      </span>{" "}
                      <span className="text-zinc-500">
                        (61.8%
                        {p.oddsGolden != null
                          ? ` — hits ${(p.oddsGolden * 100).toFixed(0)}% of triggered days`
                          : ""}
                        )
                      </span>
                    </li>
                    <li>
                      <span className="font-bold text-zinc-100">3. EXIT rest</span>{" "}
                      at{" "}
                      <span className="font-mono font-bold text-cyan-300">
                        ${fmt(p.target)}
                      </span>{" "}
                      <span className="text-zinc-500">
                        (±1 ATR
                        {p.oddsFull != null
                          ? ` — hits ${(p.oddsFull * 100).toFixed(0)}%`
                          : ""}
                        )
                      </span>
                    </li>
                    <li>
                      <span className="font-bold text-zinc-100">4. STOP</span>{" "}
                      <span className="text-zinc-400">
                        — a {tf} close back through the last level crossed
                        (fresh entries: the trigger). No adds, no hoping.
                      </span>
                    </li>
                  </ol>
                </div>
              );
            })}
          </div>

          {plan.notes.map((note) => (
            <p key={note} className="mt-2 text-xs font-semibold text-amber-300/90">
              ⚠ {note}
            </p>
          ))}

          {/* Live engine status + trade tape */}
          <div className="mt-4 border-t border-zinc-800 pt-3">
            {signals && signals.state !== "flat" && signals.entryPrice ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm">
                <span
                  className={`font-black ${
                    signals.state === "long" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {signals.state === "long" ? "▲ LONG ACTIVE" : "▼ SHORT ACTIVE"}
                </span>
                <span className="text-zinc-300">
                  entry ${fmt(signals.entryPrice)}
                </span>
                <span
                  className={
                    (price - signals.entryPrice) *
                      (signals.state === "long" ? 1 : -1) >=
                    0
                      ? "font-bold text-green-300"
                      : "font-bold text-red-300"
                  }
                >
                  P&L{" "}
                  {(
                    (price - signals.entryPrice) *
                    (signals.state === "long" ? 1 : -1)
                  ).toFixed(2)}{" "}
                  pts
                </span>
                <span className={signals.scaleHit ? "text-yellow-300" : "text-zinc-500"}>
                  scale ${fmt(signals.target1)}
                  {signals.scaleHit ? " ✓" : ""}
                </span>
                <span className="text-zinc-500">
                  target ${fmt(signals.target2)}
                </span>
                <span className="text-zinc-500">stop ${fmt(signals.stop)}</span>
              </div>
            ) : (
              <p className="font-mono text-xs text-zinc-500">
                NO POSITION — the engine enters when one side&apos;s three entry
                chips all turn green ({signalsTf} closes).
              </p>
            )}
            {signals && signals.events.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {signals.events.map((ev: TradeEvent, i: number) => {
                  const time = new Date(ev.t * 1000)
                    .toISOString()
                    .slice(11, 16);
                  const style =
                    ev.kind === "buy"
                      ? "border-green-500/40 bg-green-500/10 text-green-300"
                      : ev.kind === "sell"
                        ? "border-red-500/40 bg-red-500/10 text-red-300"
                        : ev.kind === "stop"
                          ? "border-zinc-600 bg-zinc-800/60 text-zinc-400"
                          : "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
                  const label =
                    ev.kind === "buy"
                      ? "▲ BUY"
                      : ev.kind === "sell"
                        ? "▼ SELL"
                        : ev.kind === "scale"
                          ? "scale ✓"
                          : ev.kind === "target"
                            ? "target ✓"
                            : "STOP";
                  return (
                    <span
                      key={`${ev.t}-${ev.kind}-${i}`}
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${style}`}
                    >
                      {label} {time} @ {fmt(ev.price)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <div className="flex rounded-lg border border-zinc-800 p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => !replaying && setMode(m.id)}
              disabled={replaying && m.id !== "day"}
              className={`rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
                mode === m.id
                  ? "bg-indigo-500/20 text-indigo-300"
                  : replaying
                    ? "text-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-zinc-800 p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => !(replaying && tf === "D") && setTimeframe(tf)}
              disabled={replaying && tf === "D"}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                timeframe === tf
                  ? "bg-indigo-500/20 text-indigo-300"
                  : replaying && tf === "D"
                    ? "text-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        {[
          ["All fibs", showAllFibs, setShowAllFibs],
          ["Extensions", showExtensions, setShowExtensions],
          ["13/48 EMAs", showConviction, setShowConviction],
        ].map(([label, value, setter]) => (
          <label
            key={label as string}
            className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-400"
          >
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) =>
                (setter as (v: boolean) => void)(e.target.checked)
              }
              className="accent-indigo-500"
            />
            {label as string}
          </label>
        ))}
        {!marketOpen && mode === "day" && !replaying && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-amber-400/90">
            <input
              type="checkbox"
              checked={nextSession}
              onChange={(e) => setNextSession(e.target.checked)}
              className="accent-amber-500"
            />
            Next session levels
          </label>
        )}
      </div>

      {/* Session replay */}
      <div
        className={`mt-4 rounded-xl border p-4 ${
          replaying
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-zinc-800 bg-zinc-900/40"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Session Replay
          </h2>
          <select
            value={replayDate ?? ""}
            onChange={(e) =>
              e.target.value ? startReplay(e.target.value) : exitReplay()
            }
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-200"
          >
            <option value="">— live —</option>
            {sessionDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {sessionDates.length === 0 && (
            <span className="text-xs text-zinc-600">
              Sessions archive as the dashboard runs — check back after a
              trading day.
            </span>
          )}
          {replaying && (
            <>
              <button
                onClick={() => {
                  if (replayIdx >= replayBars.length) setReplayIdx(21);
                  setPlaying((p) => !p);
                }}
                className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                {playing ? "❚❚ Pause" : "▶ Play"}
              </button>
              <div className="flex gap-1">
                {(
                  [
                    ["«", -30],
                    ["‹", -1],
                    ["›", 1],
                    ["»", 30],
                  ] as [string, number][]
                ).map(([label, step]) => (
                  <button
                    key={label}
                    onClick={() => {
                      setPlaying(false);
                      setReplayIdx((i) =>
                        Math.max(1, Math.min(i + step, replayBars.length))
                      );
                    }}
                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
                    title={`${step > 0 ? "+" : ""}${step} bars`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-200"
              >
                <option value={5}>slow (5 bars/s)</option>
                <option value={10}>normal (10 bars/s)</option>
                <option value={25}>fast (25 bars/s)</option>
                <option value={75}>blitz (75 bars/s)</option>
              </select>
              <input
                type="range"
                min={1}
                max={replayBars.length}
                value={replayIdx}
                onChange={(e) => {
                  setPlaying(false);
                  setReplayIdx(Number(e.target.value));
                }}
                className="w-48 accent-amber-500 sm:w-64"
              />
              <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                {slicedM1.length > 0
                  ? new Date(
                      slicedM1[slicedM1.length - 1].t * 1000
                    )
                      .toISOString()
                      .slice(11, 16)
                  : "--:--"}{" "}
                ET
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums">
                bar {replayIdx}/{replayBars.length}
              </span>
              <button
                onClick={exitReplay}
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                ✕ Exit replay
              </button>
            </>
          )}
        </div>
        {replaying && (
          <p className="mt-2 text-[11px] text-zinc-600">
            Watch the trade plan card above — entry chips flip green, then the
            BUY/SELL fires on the chart and the tape fills in below the plan.
          </p>
        )}
      </div>

      {/* Charts + side panel */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="h-[460px] rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
            <PriceChart
              key={`${timeframe}-${mode}-${nextSession}-${replayDate ?? "live"}`}
              bars={displayBars}
              levels={levels}
              showAllFibs={showAllFibs}
              showExtensions={showExtensions}
              showConviction={showConviction}
              visibleBars={VISIBLE_BARS[timeframe]}
              signalEvents={
                timeframe !== "D" && signals && signalsTf === timeframe
                  ? signals.events
                  : []
              }
              followLatest={playing}
            />
          </div>
          <div className="mt-3 h-[180px] rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
            <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Saty Phase Oscillator ({timeframe})
            </div>
            <div className="h-[150px]">
              <PhaseChart
                key={`phase-${timeframe}-${replayDate ?? "live"}`}
                bars={displayBars}
                visibleBars={VISIBLE_BARS[timeframe]}
                followLatest={playing}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Info table — mirrors the indicator's on-chart label */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              {MODES.find((m) => m.id === mode)?.label} Levels
              {nextSession ? " (next session)" : ""}
            </h3>
            <div className="mt-3 space-y-2 font-mono text-[13px]">
              {!nextSession && (
                <div
                  className={`rounded-md px-2 py-1 ${
                    rc === "green"
                      ? "bg-green-500/10 text-green-300"
                      : rc === "red"
                        ? "bg-red-500/10 text-red-300"
                        : "bg-orange-500/10 text-orange-300"
                  }`}
                >
                  Range ${fmt(levels.range)} = {levels.rangeVsAtrPct.toFixed(1)}%
                  of ATR ${fmt(levels.atr)}
                </div>
              )}
              {nextSession && (
                <div className="rounded-md bg-zinc-800/80 px-2 py-1 text-zinc-300">
                  ATR ${fmt(levels.atr)} · anchor close ${fmt(levels.previousClose)}
                </div>
              )}
              <div className="rounded-md bg-cyan-500/10 px-2 py-1 text-cyan-300">
                Calls &gt; ${fmt(levels.upper.trigger)} | +1 ATR $
                {fmt(levels.upper["1ATR"])}
              </div>
              <div className="rounded-md bg-yellow-500/10 px-2 py-1 text-yellow-300">
                Puts &lt; ${fmt(levels.lower.trigger)} | -1 ATR $
                {fmt(levels.lower["1ATR"])}
              </div>
            </div>
          </div>

          {/* Golden Gate tracker */}
          {gates && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Golden Gate Tracker
              </h3>
              {gates.map((g) => {
                const steps = [
                  ["Trigger 23.6%", g.triggerCrossed, g.triggerLevel],
                  ["Gate 38.2%", g.gateCrossed, g.gateLevel],
                  ["Golden 61.8%", g.complete, g.goldenLevel],
                  ["Full ±1 ATR", g.fullAtr, g.fullLevel],
                ] as const;
                const status = g.complete
                  ? "COMPLETE"
                  : g.gateCrossed
                    ? "OPEN — 61.8 MAGNET"
                    : g.triggerCrossed
                      ? "TRIGGERED"
                      : "—";
                return (
                  <div key={g.direction} className="mt-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span
                        className={
                          g.direction === "up"
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {g.direction === "up" ? "▲ UPSIDE" : "▼ DOWNSIDE"}
                      </span>
                      <span
                        className={
                          g.complete
                            ? "text-green-400"
                            : g.gateCrossed
                              ? "text-amber-400"
                              : "text-zinc-500"
                        }
                      >
                        {status}
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1 font-mono text-xs">
                      {steps.map(([label, hit, price]) => (
                        <div
                          key={label}
                          className={`flex justify-between ${hit ? "text-zinc-200" : "text-zinc-600"}`}
                        >
                          <span>
                            {hit ? "✓" : "○"} {label}
                          </span>
                          <span className="tabular-nums">${fmt(price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Level ladder */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Level Ladder
            </h3>
            <div className="mt-2 space-y-0.5 font-mono text-xs">
              {(
                [
                  ["+1 ATR", levels.upper["1ATR"], "text-zinc-100"],
                  ["+78.6%", levels.upper["0.786"], "text-zinc-500"],
                  ["+61.8%", levels.upper["0.618"], "text-zinc-300"],
                  ["+50%", levels.upper["0.5"], "text-zinc-500"],
                  ["+38.2%", levels.upper["0.382"], "text-zinc-500"],
                  ["+Trigger", levels.upper.trigger, "text-cyan-300"],
                  ["Prev Close", levels.previousClose, "text-white font-bold"],
                  ["-Trigger", levels.lower.trigger, "text-yellow-300"],
                  ["-38.2%", levels.lower["0.382"], "text-zinc-500"],
                  ["-50%", levels.lower["0.5"], "text-zinc-500"],
                  ["-61.8%", levels.lower["0.618"], "text-zinc-300"],
                  ["-78.6%", levels.lower["0.786"], "text-zinc-500"],
                  ["-1 ATR", levels.lower["1ATR"], "text-zinc-100"],
                ] as const
              ).map(([label, lvlPrice, cls]) => {
                const above = price >= lvlPrice;
                const tagged =
                  !nextSession &&
                  ((lvlPrice > levels.previousClose &&
                    levels.periodHigh >= lvlPrice) ||
                    (lvlPrice < levels.previousClose &&
                      levels.periodLow <= lvlPrice));
                return (
                  <div
                    key={label}
                    className={`flex items-center justify-between rounded px-2 py-0.5 ${cls} ${
                      tagged ? "bg-zinc-800/70" : ""
                    }`}
                  >
                    <span>
                      {label}
                      {tagged && <span className="ml-1 text-[10px] text-zinc-500">tagged</span>}
                    </span>
                    <span className="tabular-nums">
                      {fmt(lvlPrice)}
                      <span
                        className={`ml-1 ${above ? "text-green-500/70" : "text-red-500/70"}`}
                      >
                        {above ? "▾" : "▴"}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Historical trigger → target hit rates */}
          {stats && stats.up.days > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Trigger Stats
                </h3>
                <select
                  value={statsLookback}
                  onChange={(e) => setStatsLookback(Number(e.target.value))}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs font-semibold text-zinc-300"
                >
                  <option value={60}>60 days</option>
                  <option value={120}>120 days</option>
                  <option value={250}>250 days</option>
                  <option value={500}>500 days</option>
                </select>
              </div>
              <div className="mt-2 font-mono text-xs">
                <div className="flex justify-between py-0.5 text-[10px] uppercase tracking-widest text-zinc-600">
                  <span>level reached</span>
                  <span className="flex gap-4">
                    <span className="w-12 text-right text-green-500">▲ up</span>
                    <span className="w-12 text-right text-red-500">▼ down</span>
                  </span>
                </div>
                {(
                  [
                    [
                      "Trigger 23.6%",
                      stats.up.trigger / stats.up.days,
                      stats.down.trigger / stats.down.days,
                      "of all days",
                    ],
                    [
                      "Gate 38.2%",
                      stats.up.gate / Math.max(1, stats.up.trigger),
                      stats.down.gate / Math.max(1, stats.down.trigger),
                      "of triggered",
                    ],
                    [
                      "Golden 61.8%",
                      stats.up.golden / Math.max(1, stats.up.trigger),
                      stats.down.golden / Math.max(1, stats.down.trigger),
                      "of triggered",
                    ],
                    [
                      "Full ±1 ATR",
                      stats.up.full / Math.max(1, stats.up.trigger),
                      stats.down.full / Math.max(1, stats.down.trigger),
                      "of triggered",
                    ],
                  ] as const
                ).map(([label, upPct, downPct, note]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded px-1 py-0.5 text-zinc-300"
                  >
                    <span>
                      {label}{" "}
                      <span className="text-[10px] text-zinc-600">{note}</span>
                    </span>
                    <span className="flex gap-4 tabular-nums">
                      <span className="w-12 text-right">
                        {(upPct * 100).toFixed(0)}%
                      </span>
                      <span className="w-12 text-right">
                        {(downPct * 100).toFixed(0)}%
                      </span>
                    </span>
                  </div>
                ))}
                <p className="mt-2 text-[11px] leading-4 text-zinc-500">
                  n = {stats.up.days} sessions · both triggers same day:{" "}
                  {((stats.bothTriggers / stats.up.days) * 100).toFixed(0)}% ·
                  levels anchored on each prior day&apos;s close + ATR, scored
                  against session high/low.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playbook reference */}
      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          How Saty trades it (distilled from his posts)
        </h2>
        <div className="mt-3 grid gap-5 text-sm leading-6 text-zinc-300 lg:grid-cols-2">
          <div>
            <p className="font-bold text-zinc-100">The day-trade sequence</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                Pre-market: top-down read (Weekly → Daily → Hourly), note
                compression on the 10m/hourly phase oscillator, supply/demand
                zones, and the VIX key level.
              </li>
              <li>
                <span className="font-semibold text-green-400">Buy calls</span>{" "}
                when price closes through the{" "}
                <span className="text-cyan-300">+trigger (23.6%)</span> with the
                ribbon stacked bullish — &quot;in continuation, look for a move
                to +1 ATR.&quot;
              </li>
              <li>
                <span className="font-semibold text-red-400">Buy puts</span> on
                the mirror: close through the{" "}
                <span className="text-yellow-300">-trigger</span> with a bearish
                ribbon — a break can &quot;head back to PDC&quot; and beyond.
              </li>
              <li>
                Golden Gate: through 38.2% → the 61.8% golden fib is the magnet
                (~60%+). Scale there; ±1 ATR is the full-range target.
              </li>
              <li>
                Failure: a close back through the trigger kills the trade — PDC
                is the line in the sand.
              </li>
            </ol>
          </div>
          <div>
            <p className="font-bold text-zinc-100">His vocabulary</p>
            <dl className="mt-1 space-y-1">
              {(
                [
                  ["PDC", "previous day close — the white center line"],
                  ["D21 / H21", "daily / hourly 21 EMA (the pivot EMA)"],
                  ["±X ATR day", "today's move from PDC measured in ATRs"],
                  ["GG", "Golden Gate: 38.2% crossed, 61.8% is the magnet"],
                  ["Compression", "magenta phase oscillator — expansion is loading"],
                  ["Extreme", "phase beyond ±100 — momentum likely to wane"],
                  ["Supply / demand", "zones from prior session highs/lows he draws"],
                  ["10m continuation", "10-minute bars keep closing in trend direction"],
                ] as const
              ).map(([term, def]) => (
                <div key={term} className="flex gap-2">
                  <dt className="w-32 shrink-0 font-mono text-xs font-bold text-indigo-300 pt-0.5">
                    {term}
                  </dt>
                  <dd className="text-zinc-400">{def}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-zinc-500">
              His daily &quot;Day Trade Idea&quot; posts name a call strike near
              the upside 61.8% level and a put strike near the downside trigger,
              both rounded — the signal banner above mechanizes that same
              trigger → 61.8 → 1 ATR sequence.
            </p>
          </div>
        </div>
      </div>

      {/* Methodology footer */}
      <div className="mt-8 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 text-xs leading-5 text-zinc-500">
        <p className="font-semibold text-zinc-400">Methodology</p>
        <p className="mt-1">
          Exact ports of Saty Mahajan&apos;s open-source indicators: ATR Levels
          (previous {mode === "day" ? "daily" : mode === "multiday" ? "weekly" : "monthly"}{" "}
          close ± Fibonacci fractions of a 14-period Wilder ATR), Pivot Ribbon
          (8/21/34 EMA clouds + 13/48 conviction crosses), and Phase Oscillator
          ((close − 21 EMA) ÷ (3 × ATR14) × 100 on a fib grid, with Bollinger
          compression). Golden Gate: a cross of the 38.2% level historically
          reaches the 61.8% &quot;golden fib&quot; ~60%+ of the time. Sources:{" "}
          <a href="https://github.com/satymahajan/saty_atr_levels" className="underline hover:text-zinc-300">saty_atr_levels</a>,{" "}
          <a href="https://github.com/satymahajan/saty_pivot_ribbon" className="underline hover:text-zinc-300">saty_pivot_ribbon</a>,{" "}
          <a href="https://www.satyland.com" className="underline hover:text-zinc-300">satyland.com</a>.
          Data:{" "}
          {data.realtime
            ? "Yahoo Finance real-time ($SPX index) with CBOE fallback"
            : "CBOE delayed quotes ($SPX index, ~15min delay)"}
          ; daily history from CBOE. Auto-refresh every{" "}
          {marketOpen ? "20s" : "60s"}. Last data time: {data.etTime} ET.
        </p>
        <p className="mt-2">
          Not financial advice. This tool visualizes indicators only — verify
          levels against your broker before trading.
        </p>
      </div>
    </div>
  );
}
