import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addProductToCart } from "@/lib/checkout/add-product-to-cart";
import { prisma } from "@/lib/db/prisma";

const storeName =
  (process.env.NEXT_PUBLIC_STORE_NAME ?? "ZENTO").trim() || "ZENTO";

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
    <div className="zento-store">
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-[#f7f6f4]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
          <Link
            href="/"
            className="zento-brand-nav rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 focus-visible:ring-offset-2"
            aria-label={`${storeName} — на головну`}
          >
            {storeName}
          </Link>
          <nav
            className="flex items-center gap-2 sm:gap-3"
            aria-label="Основна навігація"
          >
            <Link
              href="/cart"
              className="zento-btn-ghost inline-flex min-h-10 items-center px-4 py-2 text-xs sm:text-sm"
            >
              Кошик
            </Link>
            <Link
              href="/checkout"
              className="zento-btn-ghost inline-flex min-h-10 items-center px-4 py-2 text-xs sm:text-sm"
            >
              Оформлення
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
        >
          <span aria-hidden className="text-stone-400">
            ←
          </span>
          Назад до {storeName}
        </Link>

        <article className="zento-card-lux mt-8 p-7 sm:p-10">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-stone-500">
                {product.category.name}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-[2rem] sm:leading-tight">
                {product.name}
              </h1>
              <p className="mt-6 text-3xl font-medium tabular-nums tracking-tight text-stone-900 sm:text-[2rem]">
                {formatPrice(product.price, product.currency)}
              </p>
              <dl className="mt-8 space-y-3 border-t border-stone-100 pt-8 text-sm text-stone-600">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <dt className="font-medium text-stone-500">SKU</dt>
                  <dd className="font-mono text-stone-800">{product.sku}</dd>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <dt className="font-medium text-stone-500">Категорія</dt>
                  <dd>
                    <span className="text-stone-800">{product.category.name}</span>
                    <span className="ml-2 text-stone-400">({product.categoryId})</span>
                  </dd>
                </div>
              </dl>
              {product.shortDescription ? (
                <p className="mt-8 text-[15px] leading-relaxed text-stone-600 sm:text-base">
                  {product.shortDescription}
                </p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-3 border-t border-stone-100 pt-8 lg:max-w-[17rem] lg:flex-none lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch lg:flex-col">
                <form action={addProductToCart} className="min-w-0 flex-1">
                  <input type="hidden" name="productId" value={product.id} />
                  <button
                    type="submit"
                    className="zento-btn-primary w-full min-h-11 px-6 py-3 text-sm"
                  >
                    Додати в кошик
                  </button>
                </form>
                <Link
                  href="/cart"
                  className="zento-btn-ghost inline-flex min-h-11 flex-1 items-center justify-center px-6 py-3 text-sm"
                >
                  Перейти в кошик
                </Link>
              </div>
              <Link
                href="/"
                className="zento-btn-ghost flex min-h-11 w-full items-center justify-center px-6 py-3 text-sm text-stone-700"
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
