import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { archiveSessions } from "./store";

const execFileAsync = promisify(execFile);

// Live SPX data via CBOE's public delayed-quote API (no key required; ~15min
// delay). This is the actual SPX index (the product Saty trades). Yahoo
// Finance was the original source but rate-limits Node clients aggressively.
//
// Timestamps are returned as "display epochs": ET wall-clock parsed as UTC,
// so charts label bars in market time regardless of viewer timezone.

const BASE = "https://cdn.cboe.com/api/global/delayed_quotes";

type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };

type IntradayPoint = {
  datetime: string;
  price: { open: number; high: number; low: number; close: number };
  volume: { total_options_volume?: number };
};

type HistoricalPoint = {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

const etEpoch = (etString: string) => Math.floor(Date.parse(etString + "Z") / 1000);

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}/${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`CBOE ${path}: ${res.status}`);
  return res.json();
}

// Yahoo's ^GSPC feed is real-time (CBOE is ~15min delayed), but Yahoo 429s
// Node's TLS fingerprint — curl gets through, so shell out to it. Yahoo also
// rate-limits per IP: a session cookie + crumb raises the limit, and any
// throttle/failure triggers a 5-minute cooldown during which the payload
// falls back to CBOE delayed data (the UI shows a DELAYED badge). On a host
// without curl this simply always falls back.
const YAHOO_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

let yahooSession: { cookie: string; crumb: string } | null = null;
let yahooCooldownUntil = 0;
// Don't re-attempt the 2-request session handshake on every payload build —
// failed acquisitions back off for 10 minutes and requests go bare meanwhile.
let yahooSessionRetryAt = 0;

async function curlText(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

async function getYahooSession() {
  if (yahooSession) return yahooSession;
  if (Date.now() < yahooSessionRetryAt) return null;
  yahooSessionRetryAt = Date.now() + 10 * 60_000;
  const head = await curlText([
    "-s", "-D", "-", "-o", "/dev/null", "--max-time", "6",
    "-A", YAHOO_UA,
    "https://fc.yahoo.com",
  ]);
  const cookie = head.match(/set-cookie:\s*([^;\r\n]+)/i)?.[1];
  if (!cookie) return null;
  const crumb = (
    await curlText([
      "-s", "--max-time", "6",
      "-A", YAHOO_UA,
      "-H", `Cookie: ${cookie}`,
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
    ])
  ).trim();
  if (!crumb || crumb.length > 32 || /requests|error/i.test(crumb)) return null;
  yahooSession = { cookie, crumb };
  return yahooSession;
}

type YahooData = { price: number; m1: Bar[] };

// Yahoo's per-IP limiter is tight for unauthenticated clients, so: hit the
// chart endpoint at most once per minute, reuse the last good result between
// attempts (still far fresher than CBOE's 15min delay), and serve it for up
// to 5 minutes through throttle windows.
let yahooCache: { at: number; data: YahooData } | null = null;

async function getYahooData(): Promise<YahooData | null> {
  if (yahooCache && Date.now() - yahooCache.at < 90_000) return yahooCache.data;
  const fresh = await fetchYahooRealtime();
  if (fresh) {
    yahooCache = { at: Date.now(), data: fresh };
    return fresh;
  }
  if (yahooCache && Date.now() - yahooCache.at < 5 * 60_000) {
    return yahooCache.data;
  }
  return null;
}

async function fetchYahooRealtime(): Promise<YahooData | null> {
  if (Date.now() < yahooCooldownUntil) return null;
  try {
    // Use a session if we already have one (higher rate limits). Don't try to
    // acquire one here: while throttled the handshake always fails and only
    // adds requests. Acquisition happens after a successful bare fetch below,
    // when the IP is demonstrably not throttled.
    const session = yahooSession;
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1m&range=1d" +
      (session ? `&crumb=${encodeURIComponent(session.crumb)}` : "");
    const stdout = await curlText([
      "-s", "--max-time", "6",
      "-A", YAHOO_UA,
      ...(session ? ["-H", `Cookie: ${session.cookie}`] : []),
      url,
    ]);
    if (/^too many|^<|"code"/i.test(stdout.trim().slice(0, 40))) {
      throw new Error("throttled");
    }
    const result = JSON.parse(stdout)?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    if (typeof price !== "number") return null;
    const off: number = result.meta.gmtoffset ?? -14400;
    const ts: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const m1: Bar[] = [];
    for (let i = 0; i < ts.length; i++) {
      if (
        q.open?.[i] == null ||
        q.high?.[i] == null ||
        q.low?.[i] == null ||
        q.close?.[i] == null
      )
        continue;
      // shift to ET-display epochs to match the CBOE bar convention
      m1.push({
        t: ts[i] + off,
        o: q.open[i],
        h: q.high[i],
        l: q.low[i],
        c: q.close[i],
        v: q.volume?.[i] ?? 0,
      });
    }
    if (m1.length === 0) return null;
    if (!session) {
      // bare fetch worked → not throttled right now → good moment to upgrade
      // to a session for higher limits (fire-and-forget)
      getYahooSession().catch(() => null);
    }
    return { price, m1 };
  } catch {
    yahooCooldownUntil = Date.now() + 10 * 60_000;
    yahooSession = null;
    return null;
  }
}

type Payload = Record<string, unknown>;
let cached: { at: number; payload: Payload } | null = null;
let inflight: Promise<Payload> | null = null;

async function buildPayload(): Promise<Payload> {
  const [quote, historical, intraday, yahoo] = await Promise.all([
    fetchJson("quotes/_SPX.json"),
    fetchJson("charts/historical/_SPX.json"),
    fetchJson("charts/intraday/_SPX.json"),
    getYahooData(),
  ]);

  const daily: Bar[] = (historical.data as HistoricalPoint[]).map((d) => ({
    t: etEpoch(d.date + "T00:00:00"),
    o: parseFloat(d.open),
    h: parseFloat(d.high),
    l: parseFloat(d.low),
    c: parseFloat(d.close),
    v: parseFloat(d.volume) || 0,
  }));

  const cboeM1: Bar[] = (intraday.data as IntradayPoint[]).map((p) => ({
    t: etEpoch(p.datetime),
    o: p.price.open,
    h: p.price.high,
    l: p.price.low,
    c: p.price.close,
    v: p.volume?.total_options_volume ?? 0,
  }));

  // Prefer the real-time source for intraday bars and the live price
  const m1 = yahoo?.m1 ?? cboeM1;
  const realtime = !!yahoo;

  // quote.timestamp is UTC (e.g. "2026-06-10 11:28:20"); intraday/historical
  // datetimes are ET wall-clock. Convert the quote clock to ET for the
  // session check.
  const utcMs = Date.parse(quote.timestamp.replace(" ", "T") + "Z");
  const etFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    etFmt.formatToParts(utcMs).map((p) => [p.type, p.value])
  );
  const datePart = `${parts.year}-${parts.month}-${parts.day}`;
  const timePart = `${parts.hour}:${parts.minute}:${parts.second}`;
  const etNow = `${datePart} ${timePart}`;
  const weekday = !["Sat", "Sun"].includes(parts.weekday);
  const marketOpen =
    weekday && timePart >= "09:30:00" && timePart < "16:00:00";

  const q = quote.data;
  if (marketOpen && daily.length > 0) {
    // Keep today's daily bar in sync so range utilization, tagged levels, and
    // golden gates reflect the current session. Derive it from today's
    // intraday prints only — the quote's OHLC (and sometimes the historical
    // row) still carries the PRIOR session for ~15min after the open because
    // CBOE data is delayed.
    const todayT = etEpoch(datePart + "T00:00:00");
    const todayM1 = m1.filter((b) => b.t >= todayT && b.t < todayT + 86400);
    const last = daily[daily.length - 1];
    const todayBar: Bar =
      todayM1.length > 0
        ? {
            t: todayT,
            o: todayM1[0].o,
            h: Math.max(...todayM1.map((b) => b.h)),
            l: Math.min(...todayM1.map((b) => b.l)),
            c: todayM1[todayM1.length - 1].c,
            v: 0,
          }
        : {
            // No prints yet (first delayed minutes): flat bar at last close so
            // levels anchor to yesterday correctly and range reads ~0.
            t: todayT,
            o: q.current_price,
            h: q.current_price,
            l: q.current_price,
            c: q.current_price,
            v: 0,
          };
    if (last.t === todayT) {
      daily[daily.length - 1] = todayBar;
    } else if (last.t < todayT) {
      daily.push(todayBar);
    }
  }

  // Archive intraday sessions for replay. CBOE only serves the current
  // session's 1-min bars, so the replay library accumulates one file per
  // trading day as the dashboard gets used.
  await archiveSessions(m1).catch(() => {});

  return {
    symbol: "SPX",
    price: yahoo?.price ?? q.current_price,
    etTime: etNow,
    marketOpen,
    realtime,
    // CBOE history goes back to 1975; ~2 years is plenty for ATR/EMA warmup
    daily: daily.slice(-520),
    m1,
  };
}

export async function GET() {
  // short cache so the real-time source actually feels real-time, but not so
  // short that Yahoo's per-IP rate limit trips
  if (cached && Date.now() - cached.at < 20_000) {
    return NextResponse.json(cached.payload);
  }
  try {
    if (!inflight) {
      inflight = buildPayload().finally(() => {
        inflight = null;
      });
    }
    const payload = await inflight;
    cached = { at: Date.now(), payload };
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    if (cached) {
      return NextResponse.json({ ...cached.payload, stale: true });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502 }
    );
  }
}
