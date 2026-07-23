import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";

// Archive of intraday SPX sessions for replay. CBOE only serves the current
// session's 1-min bars, so the library accumulates one file per trading day
// as the dashboard gets used.

export type Bar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export const SESSIONS_DIR = path.join(process.cwd(), ".data", "spx-sessions");

export async function archiveSessions(m1: Bar[]) {
  if (m1.length === 0) return;
  const byDate = new Map<string, Bar[]>();
  for (const b of m1) {
    // bar timestamps are ET-display epochs, so UTC date == ET session date
    const d = new Date(b.t * 1000).toISOString().slice(0, 10);
    const arr = byDate.get(d) ?? [];
    arr.push(b);
    byDate.set(d, arr);
  }
  await mkdir(SESSIONS_DIR, { recursive: true });
  for (const [date, bars] of byDate) {
    // overwrite each time: the live session grows, past sessions are stable
    await writeFile(
      path.join(SESSIONS_DIR, `${date}.json`),
      JSON.stringify(bars)
    );
  }
}

export async function listSessions(): Promise<string[]> {
  try {
    const files = await readdir(SESSIONS_DIR);
    return files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function readSession(date: string): Promise<Bar[] | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  try {
    const raw = await readFile(path.join(SESSIONS_DIR, `${date}.json`), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
