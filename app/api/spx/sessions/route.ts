import { NextRequest, NextResponse } from "next/server";
import { listSessions, readSession } from "../store";

// GET /api/spx/sessions          → { dates: ["2026-06-09", ...] }
// GET /api/spx/sessions?date=... → { date, bars: [...] }

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (date) {
    const bars = await readSession(date);
    if (!bars) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ date, bars });
  }
  return NextResponse.json({ dates: await listSessions() });
}
