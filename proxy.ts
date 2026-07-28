import { NextRequest, NextResponse } from "next/server";
import {
  PERSONAL_AUTH_COOKIE,
  verifyPersonalSessionToken,
} from "./lib/personalAuth";

export async function proxy(req: NextRequest) {
  const secret = process.env.PERSONAL_PASSWORD;
  const token = req.cookies.get(PERSONAL_AUTH_COOKIE)?.value;
  const authed = await verifyPersonalSessionToken(token, secret);

  if (!authed) {
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
