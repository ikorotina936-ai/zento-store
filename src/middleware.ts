import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin/admin-constants";
import { getAdminSessionSecretEdge } from "@/lib/admin/admin-session-secret-edge";
import { verifyAdminSessionToken } from "@/lib/admin/session-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login")) {
    const secret = await getAdminSessionSecretEdge();
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (secret && token && (await verifyAdminSessionToken(token, secret))) {
      return NextResponse.redirect(new URL("/admin/orders", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/logout")) {
    return NextResponse.next();
  }

  const secret = await getAdminSessionSecretEdge();
  if (!secret) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminSessionToken(token, secret))) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
