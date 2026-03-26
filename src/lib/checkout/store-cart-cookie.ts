export const CART_COOKIE = "store_cart";

export type CartLine = { productId: string; quantity: number };

export function parseCartCookie(raw: string | undefined): CartLine[] {
  if (!raw || raw.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const lines: CartLine[] = [];
    for (const item of parsed) {
      if (
        item !== null &&
        typeof item === "object" &&
        "productId" in item &&
        typeof (item as CartLine).productId === "string" &&
        (item as CartLine).productId.length > 0
      ) {
        const qty = Number((item as { quantity?: unknown }).quantity);
        const quantity =
          Number.isFinite(qty) && qty > 0 ? Math.min(Math.floor(qty), 99_999) : 1;
        lines.push({ productId: (item as CartLine).productId, quantity });
      }
    }
    return lines;
  } catch {
    return [];
  }
}

export function mergeCartLines(lines: CartLine[]): CartLine[] {
  const mergedQty = new Map<string, number>();
  for (const line of lines) {
    mergedQty.set(
      line.productId,
      (mergedQty.get(line.productId) ?? 0) + line.quantity,
    );
  }
  return [...mergedQty.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function priceToNumber(price: unknown): number {
  if (
    typeof price === "object" &&
    price !== null &&
    "toString" in price &&
    typeof (price as { toString: () => string }).toString === "function"
  ) {
    return Number.parseFloat((price as { toString: () => string }).toString());
  }
  if (typeof price === "number") {
    return price;
  }
  return Number.parseFloat(String(price));
}
