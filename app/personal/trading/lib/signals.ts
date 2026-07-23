// Mechanical read of Saty's day-trade playbook, distilled from his posted
// process (Day Trade Idea posts, Golden Gate strat, indicator docs):
//
//   BUY  = the full long condition set BECOMES true: close beyond the +23.6%
//          trigger, ribbon bullish (close ≥ 8 EMA ≥ 21 EMA), phase not
//          extended. Covers both the trigger cross itself and a continuation
//          entry when phase resets while price holds beyond the trigger.
//   SELL = mirror image through the -trigger.
//
// Per-trade levels adapt to where the entry lands on the fib ladder:
//   stop   = the deepest ladder level already crossed at entry (a close back
//            through it kills the trade; for a fresh cross that's the trigger)
//   scale  = the 61.8% golden fib, or the next ladder level if entry is
//            already beyond it
//   target = the full ±1 ATR
//   no-chase: entries beyond ±1 ATR are skipped (day move already paid out).
//
// One position at a time: flat → long/short → exit (target or stop) → flat.

import {
  type Bar,
  type AtrLevels,
  ema,
  phaseOscillator,
} from "./indicators";

const FIB_LADDER = [0.236, 0.382, 0.5, 0.618, 0.786];

export type TradeEventKind = "buy" | "sell" | "scale" | "target" | "stop";

export type TradeEvent = {
  idx: number;
  t: number;
  kind: TradeEventKind;
  side: "long" | "short";
  price: number;
};

export type SideChecklist = {
  triggerCrossed: boolean;
  ribbonAligned: boolean;
  phaseOk: boolean;
};

export type SignalState = {
  state: "flat" | "long" | "short";
  entryPrice: number | null;
  entryT: number | null;
  scaleHit: boolean;
  target1: number; // scale level (61.8 or next ladder rung past entry)
  target2: number; // full ±1 ATR
  stop: number; // deepest crossed ladder level at entry
  long: SideChecklist;
  short: SideChecklist;
  events: TradeEvent[];
};

export function daySignals(bars: Bar[], levels: AtrLevels): SignalState | null {
  if (bars.length < 22) return null;
  const closes = bars.map((b) => b.c);
  const e8 = ema(closes, 8);
  const e21 = ema(closes, 21);
  const phase = phaseOscillator(bars).points.map((p) => p.signal);

  const pc = levels.previousClose;
  const atr = levels.atr;
  const upTrig = levels.upper.trigger;
  const dnTrig = levels.lower.trigger;

  const longOk = (i: number): SideChecklist => ({
    triggerCrossed: closes[i] > upTrig,
    ribbonAligned:
      !isNaN(e21[i]) && closes[i] >= e8[i] && e8[i] >= e21[i],
    phaseOk: isNaN(phase[i]) || phase[i] < 100,
  });
  const shortOk = (i: number): SideChecklist => ({
    triggerCrossed: closes[i] < dnTrig,
    ribbonAligned:
      !isNaN(e21[i]) && closes[i] <= e8[i] && e8[i] <= e21[i],
    phaseOk: isNaN(phase[i]) || phase[i] > -100,
  });
  const allOk = (cl: SideChecklist) =>
    cl.triggerCrossed && cl.ribbonAligned && cl.phaseOk;

  const events: TradeEvent[] = [];
  let state: "flat" | "long" | "short" = "flat";
  let entryPrice: number | null = null;
  let entryT: number | null = null;
  let scaleHit = false;
  let stopLv = NaN;
  let scaleLv = NaN;
  let finalLv = NaN;

  const push = (
    idx: number,
    kind: TradeEventKind,
    side: "long" | "short"
  ) => events.push({ idx, t: bars[idx].t, kind, side, price: closes[idx] });

  // Trade levels for an entry at close c. dir = +1 long, -1 short.
  // Returns null when the entry would chase beyond ±1 ATR.
  const tradeLevels = (c: number, dir: 1 | -1) => {
    if (dir * (c - pc) >= atr) return null; // no-chase
    let crossed = 0;
    for (let k = 0; k < FIB_LADDER.length; k++) {
      if (dir * (c - (pc + dir * FIB_LADDER[k] * atr)) > 0) crossed = k;
    }
    const golden = pc + dir * 0.618 * atr;
    return {
      stop: pc + dir * FIB_LADDER[crossed] * atr,
      scale:
        dir * (c - golden) < 0 ? golden : pc + dir * 0.786 * atr,
      final: pc + dir * atr,
    };
  };

  for (let i = 1; i < bars.length; i++) {
    const c = closes[i];
    if (state === "flat") {
      if (allOk(longOk(i)) && !allOk(longOk(i - 1))) {
        const lv = tradeLevels(c, 1);
        if (lv) {
          state = "long";
          entryPrice = c;
          entryT = bars[i].t;
          scaleHit = false;
          stopLv = lv.stop;
          scaleLv = lv.scale;
          finalLv = lv.final;
          push(i, "buy", "long");
        }
        continue;
      }
      if (allOk(shortOk(i)) && !allOk(shortOk(i - 1))) {
        const lv = tradeLevels(c, -1);
        if (lv) {
          state = "short";
          entryPrice = c;
          entryT = bars[i].t;
          scaleHit = false;
          stopLv = lv.stop;
          scaleLv = lv.scale;
          finalLv = lv.final;
          push(i, "sell", "short");
        }
      }
    } else if (state === "long") {
      if (c < stopLv) {
        push(i, "stop", "long");
        state = "flat";
        entryPrice = entryT = null;
      } else if (c >= finalLv) {
        push(i, "target", "long");
        state = "flat";
        entryPrice = entryT = null;
      } else if (!scaleHit && c >= scaleLv) {
        scaleHit = true;
        push(i, "scale", "long");
      }
    } else if (state === "short") {
      if (c > stopLv) {
        push(i, "stop", "short");
        state = "flat";
        entryPrice = entryT = null;
      } else if (c <= finalLv) {
        push(i, "target", "short");
        state = "flat";
        entryPrice = entryT = null;
      } else if (!scaleHit && c <= scaleLv) {
        scaleHit = true;
        push(i, "scale", "short");
      }
    }
  }

  const last = bars.length - 1;
  const active = state !== "flat";
  return {
    state,
    entryPrice,
    entryT,
    scaleHit,
    target1: active ? scaleLv : levels.upper["0.618"],
    target2: active ? finalLv : levels.upper["1ATR"],
    stop: active ? stopLv : upTrig,
    long: longOk(last),
    short: shortOk(last),
    events,
  };
}
