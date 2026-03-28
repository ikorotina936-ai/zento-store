"use server";

import { cookies } from "next/headers";

import { CART_COOKIE, type CartLine } from "./store-cart-cookie";

export async function addProductToCart(formData: FormData) {
  const productId = formData.get("productId");
  if (typeof productId !== "string" || productId.length === 0) {
    return;
  }

  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value ?? "[]";
  let lines: CartLine[] = [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (
          item !== null &&
          typeof item === "object" &&
          "productId" in item &&
          typeof (item as CartLine).productId === "string"
        ) {
          const qty = Number((item as { quantity?: unknown }).quantity);
          lines.push({
            productId: (item as CartLine).productId,
            quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
          });
        }
      }
    }
  } catch {
    lines = [];
  }

  const idx = lines.findIndex((l) => l.productId === productId);
  if (idx >= 0) {
    lines[idx].quantity += 1;
  } else {
    lines.push({ productId, quantity: 1 });
  }

  jar.set(CART_COOKIE, JSON.stringify(lines), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
}
