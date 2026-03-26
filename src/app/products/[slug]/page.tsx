import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db/prisma";

const CART_COOKIE = "store_cart";

const storeName =
  (process.env.NEXT_PUBLIC_STORE_NAME ?? "ZENTO").trim() || "ZENTO";

type CartLine = { productId: string; quantity: number };

async function addProductToCart(formData: FormData) {
  "use server";

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

function formatPrice(price: unknown, currency: string): string {
  const n =
    typeof price === "object" &&
    price !== null &&
    "toString" in price &&
    typeof (price as { toString: () => string }).toString === "function"
      ? Number.parseFloat((price as { toString: () => string }).toString())
      : typeof price === "number"
        ? price
        : Number.parseFloat(String(price));

  if (Number.isNaN(n)) {
    return "—";
  }

  const code = currency.length === 3 ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, seoTitle: true, seoDescription: true },
  });

  if (!product) {
    return { title: "Товар" };
  }

  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? undefined,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-full bg-[#fafafa] text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <Link
            href="/"
            className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 rounded-sm"
            aria-label={`${storeName} — на головну`}
          >
            <span className="block bg-gradient-to-b from-zinc-600 via-zinc-900 to-zinc-950 bg-clip-text text-xl font-black uppercase tracking-[0.32em] text-transparent transition-[opacity,filter] duration-300 group-hover:opacity-90 sm:text-2xl">
              {storeName}
            </span>
            <span
              className="mt-2 block h-px max-w-[2.5rem] bg-gradient-to-r from-transparent via-zinc-400 to-transparent opacity-80 transition-all duration-300 group-hover:max-w-full group-hover:via-zinc-600 sm:max-w-[3rem]"
              aria-hidden
            />
          </Link>
          <nav
            className="flex items-center gap-1 sm:gap-2"
            aria-label="Основна навігація"
          >
            <Link
              href="/cart"
              className="rounded-full px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-4"
            >
              Кошик
            </Link>
            <Link
              href="/checkout"
              className="rounded-full px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-4"
            >
              Checkout
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6 sm:px-8 sm:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <span aria-hidden>←</span>
          Назад до {storeName}
        </Link>

        <article className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                {product.category.name}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-6 text-3xl font-medium tabular-nums tracking-tight text-zinc-900">
                {formatPrice(product.price, product.currency)}
              </p>
              <dl className="mt-8 space-y-3 text-sm text-zinc-600">
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <dt className="font-medium text-zinc-500">SKU</dt>
                  <dd className="font-mono text-zinc-800">{product.sku}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <dt className="font-medium text-zinc-500">Категорія</dt>
                  <dd>
                    <span className="text-zinc-800">{product.category.name}</span>
                    <span className="ml-2 text-zinc-400">({product.categoryId})</span>
                  </dd>
                </div>
              </dl>
              {product.shortDescription ? (
                <p className="mt-8 text-base leading-relaxed text-zinc-600">
                  {product.shortDescription}
                </p>
              ) : null}
            </div>

            <div className="flex w-full flex-col justify-end gap-4 lg:max-w-xs lg:flex-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <form action={addProductToCart} className="min-w-0 flex-1">
                  <input type="hidden" name="productId" value={product.id} />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 active:scale-[0.99]"
                  >
                    Додати в кошик
                  </button>
                </form>
                <Link
                  href="/cart"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Перейти в кошик
                </Link>
              </div>
              <Link
                href="/"
                className="flex w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              >
                Назад до {storeName}
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
