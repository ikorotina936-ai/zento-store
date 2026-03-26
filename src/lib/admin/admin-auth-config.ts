import { createHash, timingSafeEqual } from "node:crypto";

import { ADMIN_SESSION_COOKIE } from "./admin-constants";

export { ADMIN_SESSION_COOKIE };
export { getAdminSessionSecret } from "./admin-session-secret-node";

export function getAdminCredentials(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password =
    typeof process.env.ADMIN_PASSWORD === "string"
      ? process.env.ADMIN_PASSWORD.trim()
      : "";
  if (!username || password.length === 0) {
    return null;
  }
  return { username, password };
}

function sha256Utf8(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

export function timingSafeEqualUtf8(a: string, b: string): boolean {
  const ba = sha256Utf8(a);
  const bb = sha256Utf8(b);
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function verifyAdminLogin(username: string, password: string): boolean {
  const creds = getAdminCredentials();
  if (!creds) {
    return false;
  }
  return (
    timingSafeEqualUtf8(username, creds.username) &&
    timingSafeEqualUtf8(password, creds.password)
  );
}

export function isAdminAuthConfigured(): boolean {
  return getAdminCredentials() !== null;
}
