import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const expected = process.env.PERSONAL_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { password } = await req.json();
  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("personal_auth", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
