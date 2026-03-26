"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminSessionCookieSecure } from "@/lib/admin/admin-constants";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionSecret,
  isAdminAuthConfigured,
  verifyAdminLogin,
} from "@/lib/admin/admin-auth-config";
import { signAdminSessionToken } from "@/lib/admin/session-token";

function safeAdminRedirectPath(from: string | undefined): string {
  if (!from || typeof from !== "string") {
    return "/admin/orders";
  }
  const t = from.trim();
  if (!t.startsWith("/admin") || t.startsWith("//")) {
    return "/admin/orders";
  }
  if (t === "/admin/login" || t.startsWith("/admin/login?")) {
    return "/admin/orders";
  }
  return t;
}

export type AdminLoginState =
  | { ok: true }
  | { ok: false; error: string };

export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  if (!isAdminAuthConfigured()) {
    return { ok: false, error: "Адмін-логін не налаштовано (змінні середовища)." };
  }

  const secret = getAdminSessionSecret();
  if (!secret) {
    return { ok: false, error: "Адмін-логін не налаштовано (змінні середовища)." };
  }

  const username = formData.get("username");
  const password = formData.get("password");
  const fromRaw = formData.get("from");

  if (typeof username !== "string" || typeof password !== "string") {
    return { ok: false, error: "Невірні дані форми." };
  }

  const usernameTrim = username.trim();
  const passwordTrim = password.trim();

  const envU = process.env.ADMIN_USERNAME;
  const envP = process.env.ADMIN_PASSWORD;
  console.log("[adminLogin] credentials diag (no secrets)", {
    envKeysRead: ["ADMIN_USERNAME", "ADMIN_PASSWORD"],
    hasEnvUsername: envU !== undefined,
    hasEnvPassword: envP !== undefined,
    envUsernameLen: typeof envU === "string" ? envU.length : 0,
    envPasswordLen: typeof envP === "string" ? envP.length : 0,
    formUsernameTrimmed: usernameTrim,
    formUsernameLen: usernameTrim.length,
    formPasswordLen: passwordTrim.length,
  });

  if (!verifyAdminLogin(usernameTrim, passwordTrim)) {
    console.log("[adminLogin] verifyAdminLogin failed (no cookie)");
    return { ok: false, error: "Невірний логін або пароль." };
  }

  const token = await signAdminSessionToken(secret);

  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: adminSessionCookieSecure(),
    path: "/admin",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(safeAdminRedirectPath(fromRaw?.toString()));
}
