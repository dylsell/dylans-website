import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";

// Fills the area between two EMA lines (Saty Pivot Ribbon clouds).
// Bullish color when top EMA >= bottom EMA, bearish otherwise.

export type CloudPoint = { time: Time; top: number; bottom: number };

export class CloudPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Candlestick"> | null = null;
  private requestUpdate: (() => void) | null = null;

  constructor(
    private points: CloudPoint[],
    private bullColor: string,
    private bearColor: string
  ) {}

  attached(param: SeriesAttachedParameter<Time>) {
    this.chart = param.chart;
    this.series = param.series as ISeriesApi<"Candlestick">;
    this.requestUpdate = param.requestUpdate;
  }

  detached() {
    this.chart = null;
    this.series = null;
  }

  setData(points: CloudPoint[]) {
    this.points = points;
    this.requestUpdate?.();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    const renderer: IPrimitivePaneRenderer = {
      draw: (target) => {
        const chart = this.chart;
        const series = this.series;
        if (!chart || !series) return;
        const timeScale = chart.timeScale();
        // Precompute screen coords in media space
        const coords: { x: number; top: number; bottom: number }[] = [];
        for (const p of this.points) {
          if (isNaN(p.top) || isNaN(p.bottom)) continue;
          const x = timeScale.timeToCoordinate(p.time);
          const top = series.priceToCoordinate(p.top);
          const bottom = series.priceToCoordinate(p.bottom);
          if (x === null || top === null || bottom === null) continue;
          coords.push({ x, top, bottom });
        }
        if (coords.length < 2) return;
        target.useMediaCoordinateSpace(({ context: ctx }) => {
          for (let i = 0; i < coords.length - 1; i++) {
            const a = coords[i];
            const b = coords[i + 1];
            ctx.beginPath();
            ctx.moveTo(a.x, a.top);
            ctx.lineTo(b.x, b.top);
            ctx.lineTo(b.x, b.bottom);
            ctx.lineTo(a.x, a.bottom);
            ctx.closePath();
            // top<=bottom in screen coords means price top >= bottom (bullish)
            ctx.fillStyle = a.top <= a.bottom ? this.bullColor : this.bearColor;
            ctx.fill();
          }
        });
      },
    };
    return [
      {
        renderer: () => renderer,
        zOrder: () => "bottom" as const,
      },
    ];
  }
}
