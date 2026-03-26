import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieSecure,
} from "@/lib/admin/admin-constants";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL("/admin/login", url.origin), 303);
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: adminSessionCookieSecure(),
    path: "/admin",
    maxAge: 0,
  });
  return res;
}
