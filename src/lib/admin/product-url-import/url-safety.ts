/** Базова захист від SSRF: лише http(s), без localhost / приватних діапазонів. */
export function assertImportableUrl(urlStr: string): URL {
  let u: URL;
  try {
    u = new URL(urlStr.trim());
  } catch {
    throw new Error("Некоректний URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Дозволені лише http та https.");
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host.startsWith("127.")
  ) {
    throw new Error("Цей хост не дозволено.");
  }
  if (
    host === "0.0.0.0" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error("Приватні адреси не дозволені.");
  }
  if (host.endsWith(".local")) {
    throw new Error("Цей хост не дозволено.");
  }
  return u;
}
