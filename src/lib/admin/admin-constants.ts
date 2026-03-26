export const ADMIN_SESSION_COOKIE = "admin_session";

/** Мінімальна довжина явного ADMIN_SESSION_SECRET. */
export const ADMIN_SESSION_SECRET_MIN_LEN = 16;

export function buildAdminSessionDeriveMessage(
  username: string,
  password: string,
): string {
  return `admin-session-v1|${username}|${password}`;
}

/**
 * `Secure` лише для HTTPS-сайту. Якщо `NODE_ENV=production`, але відкриваєш адмінку по
 * `http://localhost` (наприклад `next start`), `secure: true` змусить браузер ігнорувати Set-Cookie.
 */
export function adminSessionCookieSecure(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  return base.startsWith("https://");
}
