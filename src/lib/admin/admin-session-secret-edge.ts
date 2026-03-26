import {
  ADMIN_SESSION_SECRET_MIN_LEN,
  buildAdminSessionDeriveMessage,
} from "./admin-constants";
import { sha256HexUtf8 } from "./session-token";

/** Для Edge middleware (без node:crypto). */
export async function getAdminSessionSecretEdge(): Promise<string | null> {
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
  return sha256HexUtf8(buildAdminSessionDeriveMessage(u, p));
}
