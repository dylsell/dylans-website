"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  createSeriesMarkers,
  LineStyle,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type UTCTimestamp,
  type Time,
} from "lightweight-charts";
import { type Bar, phaseOscillator } from "../lib/indicators";

// Saty Phase Oscillator panel: green = momentum strength, red = weakness,
// magenta = Bollinger compression. Fib grid at ±23.6 / ±61.8 / ±100.

export default function PhaseChart({
  bars,
  visibleBars,
  followLatest = false,
}: {
  bars: Bar[];
  visibleBars: number;
  followLatest?: boolean;
}) {
  const didInitialZoom = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
        fontSize: 10,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#3f3f46",
      },
      rightPriceScale: { borderColor: "#3f3f46" },
      autoSize: true,
    });
    const line = chart.addSeries(LineSeries, {
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    const zone = (price: number, color: string, title: string) =>
      line.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: price === 0 ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: false,
        title,
      });
    zone(100, "#52525b", "+100 extended");
    zone(61.8, "#16a34a", "distribution");
    zone(23.6, "#52525b", "");
    zone(0, "#71717a", "");
    zone(-23.6, "#52525b", "");
    zone(-61.8, "#dc2626", "accumulation");
    zone(-100, "#52525b", "-100 extended");
    chartRef.current = chart;
    lineRef.current = line;
    markersRef.current = createSeriesMarkers(line, []);
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const line = lineRef.current;
    if (!line || bars.length === 0) return;
    const phase = phaseOscillator(bars);
    line.setData(
      phase.points
        .filter((p) => !isNaN(p.signal))
        .map((p) => ({
          time: p.t as UTCTimestamp,
          value: p.signal,
          color: p.compression ? "#d946ef" : p.rising ? "#22c55e" : "#ef4444",
        }))
    );
    const mk = (
      idx: number[],
      color: string,
      shape: "circle",
      position: "aboveBar" | "belowBar"
    ) =>
      idx.map((i) => ({
        time: bars[i].t as UTCTimestamp,
        position,
        color,
        shape,
        size: 1,
      }));
    markersRef.current?.setMarkers(
      [
        ...mk(phase.leavingAccumulation, "#facc15", "circle", "belowBar"),
        ...mk(phase.leavingDistribution, "#facc15", "circle", "aboveBar"),
        ...mk(phase.leavingExtendedUp, "#f97316", "circle", "aboveBar"),
        ...mk(phase.leavingExtendedDown, "#f97316", "circle", "belowBar"),
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
  }, [bars, visibleBars, followLatest]);

  return <div ref={containerRef} className="h-full w-full" />;
}
