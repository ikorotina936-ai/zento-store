/**
 * Витягує дані товару з HTML: JSON-LD (schema.org Product), Open Graph, meta, fallback.
 * Не додає вигаданих полів — лише те, що знайдено.
 */

export type ScrapedProductFields = {
  name: string;
  description: string;
  shortDescription: string;
  sku: string;
  brand: string;
  imageUrl: string;
  stock: number | null;
  trackInventory: boolean | null;
  currency: string | null;
  specLines: string[];
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function getMetaContent(
  html: string,
  attr: "property" | "name",
  key: string,
): string {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const r1 = new RegExp(
    `<meta[^>]+${attr}\\s*=\\s*["']${esc}["'][^>]+content\\s*=\\s*["']([^"']*)["']`,
    "i",
  );
  const r2 = new RegExp(
    `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]+${attr}\\s*=\\s*["']${esc}["']`,
    "i",
  );
  let x = html.match(r1);
  if (x?.[1]) return decodeHtmlEntities(x[1].trim());
  x = html.match(r2);
  if (x?.[1]) return decodeHtmlEntities(x[1].trim());
  return "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m
    ? decodeHtmlEntities(m[1].replace(/\s+/g, " ").trim())
    : "";
}

export function resolveUrl(base: URL, href: unknown): string {
  if (typeof href !== "string" || href.trim() === "") return "";
  try {
    return new URL(href.trim(), base).href;
  } catch {
    return "";
  }
}

function flattenLdNodes(node: unknown): unknown[] {
  if (node === null || node === undefined) return [];
  if (Array.isArray(node)) return node.flatMap(flattenLdNodes);
  if (typeof node === "object" && node !== null && "@graph" in node) {
    const g = (node as { "@graph": unknown })["@graph"];
    if (Array.isArray(g)) return g.flatMap(flattenLdNodes);
  }
  return [node];
}

function parseLdJsonScripts(html: string): unknown[] {
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: unknown[] = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const j = JSON.parse(raw) as unknown;
      out.push(...flattenLdNodes(j));
    } catch {
      /* ignore */
    }
  }
  return out;
}

function isProductType(t: unknown): boolean {
  if (t === "Product") return true;
  if (typeof t === "string" && t.toLowerCase() === "product") return true;
  if (Array.isArray(t)) {
    return (t as unknown[]).some(
      (x) => x === "Product" || (typeof x === "string" && x.toLowerCase() === "product"),
    );
  }
  return false;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function brandName(brand: unknown): string {
  if (typeof brand === "string") return brand.trim();
  if (brand && typeof brand === "object" && "name" in brand) {
    return asString((brand as { name: unknown }).name);
  }
  return "";
}

function firstImage(
  base: URL,
  image: unknown,
): string {
  if (typeof image === "string") return resolveUrl(base, image);
  if (Array.isArray(image)) {
    for (const it of image) {
      if (typeof it === "string") {
        const u = resolveUrl(base, it);
        if (u) return u;
      }
      if (it && typeof it === "object" && "url" in it) {
        const u = resolveUrl(base, (it as { url: unknown }).url);
        if (u) return u;
      }
    }
  }
  if (image && typeof image === "object" && "url" in image) {
    return resolveUrl(base, (image as { url: unknown }).url);
  }
  return "";
}

function parseAvailability(
  availability: unknown,
): { stock: number | null; trackInventory: boolean | null } {
  if (typeof availability !== "string") {
    return { stock: null, trackInventory: null };
  }
  const a = availability.toLowerCase();
  if (a.includes("instock") || a.includes("in_stock")) {
    return { stock: 1, trackInventory: true };
  }
  if (
    a.includes("outofstock") ||
    a.includes("soldout") ||
    a.includes("discontinued")
  ) {
    return { stock: 0, trackInventory: true };
  }
  return { stock: null, trackInventory: null };
}

function collectOffers(
  base: URL,
  offers: unknown,
): {
  currency: string | null;
  stock: number | null;
  trackInventory: boolean | null;
} {
  let currency: string | null = null;
  let stock: number | null = null;
  let trackInventory: boolean | null = null;

  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  for (const o of list) {
    if (!o || typeof o !== "object") continue;
    const obj = o as Record<string, unknown>;
    if (!currency && typeof obj.priceCurrency === "string") {
      currency = obj.priceCurrency.trim().slice(0, 3).toUpperCase();
    }
    const av = parseAvailability(obj.availability);
    if (av.stock !== null) stock = av.stock;
    if (av.trackInventory !== null) trackInventory = av.trackInventory;
  }

  return { currency, stock, trackInventory };
}

function additionalProperties(obj: Record<string, unknown>): string[] {
  const raw = obj.additionalProperty;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const lines: string[] = [];
  for (const p of list) {
    if (!p || typeof p !== "object") continue;
    const row = p as Record<string, unknown>;
    const n = asString(row.name ?? row.propertyID);
    const v = asString(row.value);
    if (n && v) lines.push(`${n}: ${v}`);
  }
  return lines;
}

function mergeProductNode(
  base: URL,
  obj: Record<string, unknown>,
  into: ScrapedProductFields,
): void {
  const name = asString(obj.name);
  if (name && !into.name) into.name = name;

  const desc = asString(obj.description);
  if (desc && !into.description) into.description = desc;

  const sku =
    asString(obj.sku) ||
    asString(obj.gtin) ||
    asString(obj.gtin13) ||
    asString(obj.mpn);
  if (sku && !into.sku) into.sku = sku;

  const b = brandName(obj.brand);
  if (b && !into.brand) into.brand = b;

  const img = firstImage(base, obj.image);
  if (img && !into.imageUrl) into.imageUrl = img;

  const { currency, stock, trackInventory } = collectOffers(base, obj.offers);
  if (currency && !into.currency) into.currency = currency;
  if (stock !== null && into.stock === null) into.stock = stock;
  if (trackInventory !== null && into.trackInventory === null) {
    into.trackInventory = trackInventory;
  }

  const specs = additionalProperties(obj);
  for (const line of specs) {
    if (!into.specLines.includes(line)) into.specLines.push(line);
  }
}

export function scrapeProductFromHtml(html: string, pageUrl: string): ScrapedProductFields {
  const base = new URL(pageUrl);

  const into: ScrapedProductFields = {
    name: "",
    description: "",
    shortDescription: "",
    sku: "",
    brand: "",
    imageUrl: "",
    stock: null,
    trackInventory: null,
    currency: null,
    specLines: [],
  };

  const nodes = parseLdJsonScripts(html);
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const obj = node as Record<string, unknown>;
    if (!isProductType(obj["@type"])) continue;
    mergeProductNode(base, obj, into);
  }

  const ogTitle = getMetaContent(html, "property", "og:title");
  const ogDesc = getMetaContent(html, "property", "og:description");
  const ogImage = getMetaContent(html, "property", "og:image");
  const twTitle = getMetaContent(html, "name", "twitter:title");
  const twDesc = getMetaContent(html, "name", "twitter:description");
  const twImage = getMetaContent(html, "name", "twitter:image");
  const metaDesc = getMetaContent(html, "name", "description");

  if (!into.name) into.name = ogTitle || twTitle || extractTitle(html);
  if (!into.shortDescription) {
    into.shortDescription =
      ogDesc || twDesc || metaDesc || (into.description ? into.description.slice(0, 500) : "");
  }
  if (!into.description) {
    into.description = ogDesc || twDesc || metaDesc || "";
  }

  if (!into.imageUrl) {
    const og = resolveUrl(base, ogImage);
    const tw = resolveUrl(base, twImage);
    into.imageUrl = og || tw;
  }

  if (!into.sku) {
    const skuMeta =
      getMetaContent(html, "property", "product:retailer_item_id") ||
      getMetaContent(html, "name", "sku") ||
      getMetaContent(html, "property", "og:sku");
    if (skuMeta) into.sku = skuMeta;
  }

  if (!into.brand) {
    const b = getMetaContent(html, "property", "product:brand");
    if (b) into.brand = b;
  }

  if (into.specLines.length > 0) {
    const specBlock = into.specLines.join("\n");
    if (into.description) {
      into.description = `${into.description.trim()}\n\n${specBlock}`;
    } else {
      into.description = specBlock;
    }
  }

  if (into.shortDescription.length > 2000) {
    into.shortDescription = into.shortDescription.slice(0, 2000);
  }

  return into;
}
