import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "personal_auth";

export function proxy(req: NextRequest) {
  const expected = process.env.PERSONAL_PASSWORD;
  const supplied = req.cookies.get(COOKIE_NAME)?.value;

  if (!expected || supplied !== expected) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/personal";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/personal/:path+", "/api/spx", "/api/spx/:path+"],
};
