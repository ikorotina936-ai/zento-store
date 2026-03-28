"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { HomeAddToCartFlyButton } from "@/components/home/home-add-to-cart-fly-button";

export type HomeProductCardData = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: unknown;
  currency: string;
  description: string | null;
  shortDescription: string | null;
  brand: string | null;
  stock: number;
  trackInventory: boolean;
  category: { name: string; slug: string };
  images: { url: string; alt: string | null }[];
};

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
  const code = currency.length === 3 ? currency.toUpperCase() : "EUR";
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

type Props = { product: HomeProductCardData };

export function HomeProductCard({ product }: Props) {
  const [specOpen, setSpecOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const cover = product.images[0];
  const coverUrl = cover?.url;
  const productHref = `/products/${product.slug}`;
  const priceLabel = formatPrice(product.price, product.currency);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!specOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSpecOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [specOpen]);

  const specRows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Назва", value: product.name },
    { label: "Категорія", value: product.category.name },
    { label: "Ціна", value: priceLabel },
    { label: "SKU", value: product.sku, mono: true },
    { label: "Slug", value: product.slug, mono: true },
    { label: "Slug категорії", value: product.category.slug, mono: true },
  ];
  if (product.brand) {
    specRows.push({ label: "Бренд", value: product.brand });
  }
  specRows.push({ label: "Залишок", value: String(product.stock) });
  specRows.push({
    label: "Відстеження залишків",
    value: product.trackInventory ? "Так" : "Ні",
  });

  const modal =
    specOpen && mounted ? (
      createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            aria-label="Закрити вікно"
            onClick={() => setSpecOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 max-h-[min(90dvh,36rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-cyan-400/35 bg-zinc-950/95 p-6 pt-14 shadow-[0_0_48px_-8px_rgba(34,211,238,0.28)] sm:max-h-[min(85vh,40rem)] sm:rounded-2xl sm:pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="sr-only">
              Характеристики: {product.name}
            </h2>
            <button
              type="button"
              className="absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white"
              onClick={() => setSpecOpen(false)}
              aria-label="Закрити"
            >
              <span className="text-lg leading-none" aria-hidden>
                ×
              </span>
            </button>

            <div className="flex flex-col gap-3 text-sm text-white/80 sm:text-base">
              {specRows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                >
                  <span className="shrink-0 text-white/50">{row.label}:</span>
                  <span
                    className={`min-w-0 break-words font-medium text-cyan-300/95 ${row.mono ? "font-mono text-[0.8125rem] sm:text-sm" : ""}`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )
    ) : null;

  return (
    <div className="group block overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/40 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_40px_-8px_rgba(34,211,238,0.18)]">
      {modal}
      <Link
        href={productHref}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <div
          ref={imageContainerRef}
          className="relative aspect-[4/3] overflow-hidden bg-zinc-950"
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={cover?.alt ?? product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-600">
              Немає фото
            </div>
          )}
        </div>
        <div className="space-y-2 px-5 pt-5 sm:px-6">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-cyan-500/70">
            {product.category.name}
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-white transition group-hover:text-cyan-100 sm:text-xl">
            {product.name}
          </h3>
          {product.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500">
              {product.description}
            </p>
          ) : null}
          <p className="pt-1 text-base font-medium text-cyan-200/90 sm:text-lg">
            {priceLabel}
          </p>
        </div>
      </Link>
      <div className="px-5 pb-6 sm:px-6">
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="flex flex-1 items-center justify-center rounded-xl border border-cyan-400/30 bg-transparent px-4 py-2 text-center text-sm font-medium text-white/80 transition hover:border-cyan-400/60 hover:bg-cyan-500/10"
            onClick={() => setSpecOpen(true)}
          >
            Характеристики
          </button>
          <HomeAddToCartFlyButton
            productId={product.id}
            imageUrl={coverUrl}
            imageContainerRef={imageContainerRef}
            productName={product.name}
          />
        </div>
      </div>
    </div>
  );
}
