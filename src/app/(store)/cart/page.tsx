import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Кошик",
  description: "Ваш кошик",
};

const CART_COOKIE = "store_cart";

const storeName =
  (process.env.NEXT_PUBLIC_STORE_NAME ?? "ZENTO").trim() || "ZENTO";

type CartLine = { productId: string; quantity: number };

function parseCartCookie(raw: string | undefined): CartLine[] {
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

function priceToNumber(price: unknown): number {
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

function formatMoney(amount: number, currency: string): string {
  if (Number.isNaN(amount)) {
    return "—";
  }
  const code = currency.length === 3 ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default async function CartPage() {
  const jar = await cookies();
  const lines = parseCartCookie(jar.get(CART_COOKIE)?.value);

  if (lines.length === 0) {
    return (
      <div className="zento-store">
        <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-[#f7f6f4]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
            <Link href="/" className="zento-brand-nav">
              {storeName}
            </Link>
            <Link
              href="/"
              className="zento-btn-ghost inline-flex px-4 py-2 text-xs sm:text-sm"
            >
              Каталог
            </Link>
          </div>
        </header>
        <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-14 text-center sm:px-6 sm:py-20">
          <div className="zento-card-lux w-full px-8 py-12 sm:px-10 sm:py-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-stone-500">
              Кошик
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
              Поки порожньо
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Додайте товари з каталогу — вони з’являться тут.
            </p>
            <Link
              href="/"
              className="zento-btn-primary mt-8 inline-flex min-h-11 w-full items-center justify-center px-6 py-3 text-sm"
            >
              До каталогу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mergedQty = new Map<string, number>();
  for (const line of lines) {
    mergedQty.set(
      line.productId,
      (mergedQty.get(line.productId) ?? 0) + line.quantity,
    );
  }
  const mergedLines: CartLine[] = [...mergedQty.entries()].map(
    ([productId, quantity]) => ({ productId, quantity }),
  );

  const ids = [...mergedQty.keys()];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      currency: true,
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));

  type Row = {
    productId: string;
    quantity: number;
    name: string;
    slug: string;
    unit: number;
    currency: string;
    subtotal: number;
  };

  const rows: Row[] = [];
  for (const line of mergedLines) {
    const p = byId.get(line.productId);
    if (!p) {
      continue;
    }
    const unit = priceToNumber(p.price);
    const subtotal = unit * line.quantity;
    rows.push({
      productId: line.productId,
      quantity: line.quantity,
      name: p.name,
      slug: p.slug,
      unit,
      currency: p.currency,
      subtotal,
    });
  }

  const currencies = [...new Set(rows.map((r) => r.currency.toUpperCase()))];
  const singleCurrency = currencies.length === 1 ? currencies[0] : null;
  const cartTotal = rows.reduce((sum, r) => sum + r.subtotal, 0);

  return (
    <div className="zento-store">
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-[#f7f6f4]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-5">
          <div>
            <Link href="/" className="zento-brand-nav inline-block">
              {storeName}
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Кошик
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="zento-btn-ghost inline-flex px-4 py-2 text-xs sm:text-sm"
            >
              Каталог
            </Link>
            <Link
              href="/checkout"
              className="zento-btn-ghost inline-flex px-4 py-2 text-xs sm:text-sm"
            >
              Оформлення
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        {rows.length === 0 ? (
          <div className="zento-card-lux p-10 text-center">
            <p className="text-sm leading-relaxed text-stone-600">
              Товари з кошика більше недоступні. Очистіть кошик або додайте нові
              позиції.
            </p>
            <Link
              href="/"
              className="zento-btn-primary mt-6 inline-flex min-h-11 items-center justify-center px-6 py-3 text-sm"
            >
              До каталогу
            </Link>
          </div>
        ) : (
          <>
            <ul className="zento-card-lux overflow-hidden">
              {rows.map((row) => (
                <li
                  key={row.productId}
                  className="flex flex-col gap-4 border-b border-stone-100 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${row.slug}`}
                      className="text-base font-semibold tracking-tight text-stone-900 transition-colors hover:text-stone-600"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-1.5 text-sm tabular-nums text-stone-500">
                      {formatMoney(row.unit, row.currency)} × {row.quantity}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-baseline justify-between gap-8 sm:flex-col sm:items-end sm:justify-center">
                    <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
                      Підсумок
                    </span>
                    <p className="text-lg font-semibold tabular-nums text-stone-900">
                      {formatMoney(row.subtotal, row.currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="zento-card-lux mt-8 p-6 sm:p-8">
              <div className="flex flex-col gap-2 border-b border-stone-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <span className="text-sm font-medium text-stone-500">
                  Разом
                </span>
                {singleCurrency ? (
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-stone-900">
                    {formatMoney(cartTotal, singleCurrency)}
                  </p>
                ) : (
                  <div className="text-right sm:text-left">
                    <p className="text-2xl font-semibold tabular-nums text-stone-900">
                      {formatMoney(cartTotal, rows[0]?.currency ?? "USD")}
                    </p>
                    <p className="mt-1 text-xs text-amber-800/90">
                      У кошику кілька валют; сума — орієнтовна (перевірте позиції).
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/checkout"
                  className="zento-btn-primary inline-flex min-h-11 flex-1 items-center justify-center px-6 py-3 text-sm sm:min-w-[200px]"
                >
                  До оплати (Stripe)
                </Link>
                <Link
                  href="/"
                  className="zento-btn-ghost inline-flex min-h-11 flex-1 items-center justify-center px-6 py-3 text-sm sm:min-w-[200px]"
                >
                  Продовжити покупки
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
