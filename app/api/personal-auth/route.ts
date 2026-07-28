import { NextRequest, NextResponse } from "next/server";
import {
  createPersonalSessionToken,
  PERSONAL_AUTH_COOKIE,
  PERSONAL_SESSION_TTL_SECONDS,
} from "../../../lib/personalAuth";

export async function POST(req: NextRequest) {
  const secret = process.env.PERSONAL_PASSWORD;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;
  if (typeof password !== "string" || password !== secret) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    PERSONAL_AUTH_COOKIE,
    await createPersonalSessionToken(secret),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PERSONAL_SESSION_TTL_SECONDS,
    },
  );
  return res;
}
