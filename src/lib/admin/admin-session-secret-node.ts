import { createHash } from "node:crypto";

import {
  ADMIN_SESSION_SECRET_MIN_LEN,
  buildAdminSessionDeriveMessage,
} from "./admin-constants";

/** Для Server Actions / route handlers (Node). */
export function getAdminSessionSecret(): string | null {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit && explicit.length >= ADMIN_SESSION_SECRET_MIN_LEN) {
    return explicit;
  }
  const u = process.env.ADMIN_USERNAME?.trim();
  const p =
    typeof process.env.ADMIN_PASSWORD === "string"
      ? process.env.ADMIN_PASSWORD.trim()
      : "";
  if (!u || p.length === 0) {
    return null;
  }
  return createHash("sha256")
    .update(buildAdminSessionDeriveMessage(u, p), "utf8")
    .digest("hex");
}
