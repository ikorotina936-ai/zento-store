import { assertImportableUrl } from "./url-safety";

export async function fetchProductPageHtml(
  urlStr: string,
): Promise<{ finalUrl: URL; html: string }> {
  const url = assertImportableUrl(urlStr);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 18_000);
  try {
    const res = await fetch(url.href, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      throw new Error(`Сервер відповів ${res.status}. Спробуйте інший URL.`);
    }
    const html = await res.text();
    if (html.length < 80) {
      throw new Error("Отримано занадто коротку відповідь (не HTML?).");
    }
    let finalUrl = url;
    try {
      finalUrl = new URL(res.url);
    } catch {
      /* use request url */
    }
    return { finalUrl, html };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Час очікування відповіді вичерпано.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
