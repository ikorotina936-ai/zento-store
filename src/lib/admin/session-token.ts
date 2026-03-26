/**
 * Signed admin session (HMAC-SHA256). Uses Web Crypto only — works in Edge middleware and Node server actions.
 */

const enc = new TextEncoder();

/** SHA-256 у hex; однаковий результат у Node (login) та Edge (middleware). */
export async function sha256HexUtf8(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

async function hmacSha256Base64Url(
  secret: string,
  message: string,
): Promise<string> {
  const keyRaw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  const key = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToBase64Url(new Uint8Array(sig));
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i)! ^ b.charCodeAt(i)!;
  }
  return out === 0;
}

const SESSION_VERSION = 1;
const MAX_AGE_SEC_DEFAULT = 60 * 60 * 24 * 7;

export async function signAdminSessionToken(
  secret: string,
  maxAgeSec: number = MAX_AGE_SEC_DEFAULT,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = JSON.stringify({ exp, v: SESSION_VERSION });
  const payloadB64 = bytesToBase64Url(enc.encode(payload));
  const sig = await hmacSha256Base64Url(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyAdminSessionToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return false;
  }
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) {
    return false;
  }
  const expectedSig = await hmacSha256Base64Url(secret, payloadB64);
  if (!timingSafeEqualStr(sig, expectedSig)) {
    return false;
  }
  let payload: { exp?: number; v?: number };
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    payload = JSON.parse(json) as { exp?: number; v?: number };
  } catch {
    return false;
  }
  if (payload.v !== SESSION_VERSION || typeof payload.exp !== "number") {
    return false;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  return true;
}
