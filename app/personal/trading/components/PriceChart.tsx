"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  LineStyle,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type IPriceLine,
  type UTCTimestamp,
  type Time,
} from "lightweight-charts";
import { type Bar, type AtrLevels, pivotRibbon } from "../lib/indicators";
import { type TradeEvent } from "../lib/signals";
import { CloudPrimitive } from "./cloudPrimitive";

type Props = {
  bars: Bar[]; // timestamps pre-shifted for display
  levels: AtrLevels | null;
  showAllFibs: boolean;
  showExtensions: boolean;
  showConviction: boolean;
  visibleBars: number;
  signalEvents?: TradeEvent[];
  followLatest?: boolean; // keep the newest bar in view (replay playback)
};

// Saty's default level colors, adapted for a dark chart
const LEVEL_STYLES: Record<
  string,
  { color: string; key: boolean; ext: boolean; label: string }
> = {
  trigger: { color: "", key: true, ext: false, label: "" }, // handled separately
  "0.382": { color: "#6b7280", key: false, ext: false, label: "38.2%" },
  "0.5": { color: "#6b7280", key: false, ext: false, label: "50%" },
  "0.618": { color: "#cbd5e1", key: true, ext: false, label: "61.8%" },
  "0.786": { color: "#6b7280", key: false, ext: false, label: "78.6%" },
  "1ATR": { color: "#f8fafc", key: true, ext: false, label: "1 ATR" },
  "1.236": { color: "#cbd5e1", key: true, ext: true, label: "123.6%" },
  "1.382": { color: "#6b7280", key: false, ext: true, label: "138.2%" },
  "1.5": { color: "#6b7280", key: false, ext: true, label: "150%" },
  "1.618": { color: "#cbd5e1", key: true, ext: true, label: "161.8%" },
  "1.786": { color: "#6b7280", key: false, ext: true, label: "178.6%" },
  "2ATR": { color: "#f8fafc", key: true, ext: true, label: "2 ATR" },
  "2.236": { color: "#cbd5e1", key: true, ext: true, label: "223.6%" },
  "2.618": { color: "#cbd5e1", key: true, ext: true, label: "261.8%" },
  "3ATR": { color: "#f8fafc", key: true, ext: true, label: "3 ATR" },
};

export default function PriceChart({
  bars,
  levels,
  showAllFibs,
  showExtensions,
  showConviction,
  visibleBars,
  signalEvents = [],
  followLatest = false,
}: Props) {
  const didInitialZoom = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const fastConvRef = useRef<ISeriesApi<"Line"> | null>(null);
  const slowConvRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fastCloudRef = useRef<CloudPrimitive | null>(null);
  const slowCloudRef = useRef<CloudPrimitive | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(63,63,70,0.3)" },
        horzLines: { color: "rgba(63,63,70,0.3)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#3f3f46",
      },
      rightPriceScale: { borderColor: "#3f3f46" },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: true,
    });
    const fastCloud = new CloudPrimitive(
      [],
      "rgba(34,197,94,0.18)",
      "rgba(239,68,68,0.18)"
    );
    const slowCloud = new CloudPrimitive(
      [],
      "rgba(34,211,238,0.15)",
      "rgba(249,115,22,0.15)"
    );
    candles.attachPrimitive(fastCloud);
    candles.attachPrimitive(slowCloud);
    const fastConv = chart.addSeries(LineSeries, {
      color: "#9ca3af",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const slowConv = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    chartRef.current = chart;
    candleRef.current = candles;
    fastConvRef.current = fastConv;
    slowConvRef.current = slowConv;
    fastCloudRef.current = fastCloud;
    slowCloudRef.current = slowCloud;
    markersRef.current = createSeriesMarkers(candles, []);
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Data + ribbon
  useEffect(() => {
    const candles = candleRef.current;
    if (!candles || bars.length === 0) return;
    candles.setData(
      bars.map((b) => ({
        time: b.t as UTCTimestamp,
        open: b.o,
        high: b.h,
        low: b.l,
        close: b.c,
      }))
    );
    const ribbon = pivotRibbon(bars);
    const toLine = (vals: number[]) =>
      bars
        .map((b, i) => ({ time: b.t as UTCTimestamp, value: vals[i] }))
        .filter((p) => !isNaN(p.value));
    fastConvRef.current?.setData(
      showConviction ? toLine(ribbon.fastConviction) : []
    );
    slowConvRef.current?.setData(
      showConviction ? toLine(ribbon.slowConviction) : []
    );
    fastCloudRef.current?.setData(
      bars
        .map((b, i) => ({
          time: b.t as UTCTimestamp,
          top: ribbon.fast[i],
          bottom: ribbon.pivot[i],
        }))
        .filter((p) => !isNaN(p.top) && !isNaN(p.bottom))
    );
    slowCloudRef.current?.setData(
      bars
        .map((b, i) => ({
          time: b.t as UTCTimestamp,
          top: ribbon.pivot[i],
          bottom: ribbon.slow[i],
        }))
        .filter((p) => !isNaN(p.top) && !isNaN(p.bottom))
    );
    // BUY/SELL/scale/target/stop markers from the signal engine, plus
    // 13/48 conviction cross arrows (aqua up / yellow down, per Saty defaults)
    const signalMarkers = signalEvents.map((ev) => {
      const isUpSide = ev.side === "long";
      switch (ev.kind) {
        case "buy":
          return {
            time: ev.t as UTCTimestamp,
            position: "belowBar" as const,
            color: "#22c55e",
            shape: "arrowUp" as const,
            text: "BUY",
            size: 2,
          };
        case "sell":
          return {
            time: ev.t as UTCTimestamp,
            position: "aboveBar" as const,
            color: "#ef4444",
            shape: "arrowDown" as const,
            text: "SELL",
            size: 2,
          };
        case "scale":
          return {
            time: ev.t as UTCTimestamp,
            position: isUpSide ? ("aboveBar" as const) : ("belowBar" as const),
            color: "#facc15",
            shape: "circle" as const,
            text: "61.8",
            size: 1,
          };
        case "target":
          return {
            time: ev.t as UTCTimestamp,
            position: isUpSide ? ("aboveBar" as const) : ("belowBar" as const),
            color: "#22d3ee",
            shape: "square" as const,
            text: "1 ATR",
            size: 1,
          };
        case "stop":
          return {
            time: ev.t as UTCTimestamp,
            position: isUpSide ? ("belowBar" as const) : ("aboveBar" as const),
            color: "#a1a1aa",
            shape: "circle" as const,
            text: "STOP",
            size: 1,
          };
      }
    });
    markersRef.current?.setMarkers(
      [
        ...signalMarkers,
        ...ribbon.bullishConvictionArrows.map((i) => ({
          time: bars[i].t as UTCTimestamp,
          position: "belowBar" as const,
          color: "#22d3ee",
          shape: "arrowUp" as const,
          size: 1,
        })),
        ...ribbon.bearishConvictionArrows.map((i) => ({
          time: bars[i].t as UTCTimestamp,
          position: "aboveBar" as const,
          color: "#facc15",
          shape: "arrowDown" as const,
          size: 1,
        })),
      ].sort((a, b) => (a.time as number) - (b.time as number))
    );
    if (!didInitialZoom.current) {
      didInitialZoom.current = true;
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: Math.max(0, bars.length - visibleBars),
        to: bars.length + 4,
      });
    } else if (followLatest) {
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [bars, showConviction, visibleBars, signalEvents, followLatest]);

  // ATR level lines
  useEffect(() => {
    const candles = candleRef.current;
    if (!candles) return;
    for (const line of priceLinesRef.current) candles.removePriceLine(line);
    priceLinesRef.current = [];
    if (!levels) return;
    const add = (
      price: number,
      color: string,
      title: string,
      style: LineStyle = LineStyle.Solid,
      width: 1 | 2 = 1,
      axisLabel = false
    ) => {
      priceLinesRef.current.push(
        candles.createPriceLine({
          price,
          color,
          lineWidth: width,
          lineStyle: style,
          axisLabelVisible: axisLabel,
          title,
        })
      );
    };
    add(levels.previousClose, "#f8fafc", "prev close", LineStyle.Solid, 2, true);
    add(levels.upper.trigger, "#22d3ee", "+trigger", LineStyle.Solid, 2, true);
    add(levels.lower.trigger, "#facc15", "-trigger", LineStyle.Solid, 2, true);
    for (const [name, style] of Object.entries(LEVEL_STYLES)) {
      if (name === "trigger") continue;
      if (style.ext && !showExtensions) continue;
      if (!style.key && !showAllFibs) continue;
      // Only key levels get axis labels to keep the price scale readable
      const axisLabel = name === "0.618" || name === "1ATR";
      add(
        levels.upper[name],
        style.color,
        `+${style.label}`,
        style.key ? LineStyle.Solid : LineStyle.Dotted,
        1,
        axisLabel
      );
      add(
        levels.lower[name],
        style.color,
        `-${style.label}`,
        style.key ? LineStyle.Solid : LineStyle.Dotted,
        1,
        axisLabel
      );
    }
  }, [levels, showAllFibs, showExtensions]);

  return <div ref={containerRef} className="h-full w-full" />;
}
