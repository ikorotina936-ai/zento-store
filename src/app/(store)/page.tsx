import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

const storeName =
  (process.env.NEXT_PUBLIC_STORE_NAME ?? "ZENTO").trim() || "ZENTO";

export const metadata: Metadata = {
  title: `${storeName} — Каталог`,
  description: `Відібрані товари преміум-якості. ${storeName}.`,
};

type ProductJson = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  currency: string;
};

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function fetchProducts(): Promise<ProductJson[]> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/products`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Products API error: ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    return [];
  }
  return data as ProductJson[];
}

function formatPrice(price: string | number, currency: string): string {
  const n = typeof price === "string" ? Number.parseFloat(price) : price;
  if (Number.isNaN(n)) {
    return "—";
  }
  const code =
    currency.length === 3 ? currency.toUpperCase() : "USD";
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

function ProductCard({ product }: { product: ProductJson }) {
  return (
    <li className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/70 bg-white/90 shadow-[0_1px_2px_rgba(28,25,23,0.04)] ring-1 ring-stone-900/[0.02] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-stone-300/80 hover:shadow-[0_24px_48px_-12px_rgba(28,25,23,0.12)] hover:ring-stone-900/[0.06]">
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
          <div
            className="absolute inset-0 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/80 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.5), transparent 70%)",
            }}
            aria-hidden
          />
          <span className="absolute bottom-4 left-4 text-[10px] font-medium uppercase tracking-[0.25em] text-stone-400 transition-colors duration-300 group-hover:text-stone-600">
            {storeName}
          </span>
        </div>
        <div className="flex flex-1 flex-col px-5 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
          <h2 className="line-clamp-2 min-h-[2.5rem] font-serif text-[1.0625rem] font-medium leading-snug tracking-tight text-stone-900 sm:min-h-[2.75rem] sm:text-lg">
            <Link
              href={`/products/${product.slug}`}
              className="transition-colors duration-300 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/20 focus-visible:ring-offset-2"
            >
              {product.name}
            </Link>
          </h2>
          <p className="mt-4 font-mono text-lg font-medium tabular-nums tracking-tight text-stone-800 sm:text-xl">
            {formatPrice(product.price, product.currency)}
          </p>
          <div className="mt-auto pt-6">
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex w-full items-center justify-center rounded-full border border-stone-900/90 bg-stone-900 px-5 py-3 text-[13px] font-medium uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-stone-800 hover:shadow-md active:scale-[0.98] sm:text-sm"
            >
              Переглянути
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

export default async function StoreHomePage() {
  let products: ProductJson[] = [];
  let fetchError = false;

  try {
    products = await fetchProducts();
  } catch {
    fetchError = true;
  }

  return (
    <div className="relative min-h-full overflow-x-hidden bg-stone-50 text-stone-900">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(120,113,108,0.11),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(214,211,209,0.35),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(231,229,228,0.5),transparent_45%)]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-stone-50/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:gap-6 sm:px-8 sm:py-4">
          <Link
            href="/"
            className="group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/25 focus-visible:ring-offset-2"
            aria-label={`${storeName} — на головну`}
          >
            <span className="block bg-gradient-to-b from-stone-700 via-stone-900 to-stone-950 bg-clip-text text-lg font-black uppercase tracking-[0.28em] text-transparent transition-opacity duration-300 group-hover:opacity-85 sm:text-xl">
              {storeName}
            </span>
          </Link>
          <nav
            className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1"
            aria-label="Основна навігація"
          >
            <Link
              href="/"
              className="rounded-full px-2.5 py-2 text-xs font-medium tracking-wide text-stone-600 transition-colors hover:bg-stone-900/[0.04] hover:text-stone-900 sm:px-3.5 sm:text-sm"
            >
              Головна
            </Link>
            <Link
              href="/cart"
              className="rounded-full px-2.5 py-2 text-xs font-medium tracking-wide text-stone-600 transition-colors hover:bg-stone-900/[0.04] hover:text-stone-900 sm:px-3.5 sm:text-sm"
            >
              Кошик
            </Link>
            <Link
              href="/checkout"
              className="rounded-full px-2.5 py-2 text-xs font-medium tracking-wide text-stone-600 transition-colors hover:bg-stone-900/[0.04] hover:text-stone-900 sm:px-3.5 sm:text-sm"
            >
              Checkout
            </Link>
          </nav>
        </div>
      </header>

      <section
        id="hero"
        className="relative px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 md:pb-24 md:pt-20 lg:pb-28 lg:pt-24"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-stone-500 sm:text-xs">
            Новий сезон
          </p>
          <h1 className="mt-5 max-w-4xl font-serif text-[2.25rem] font-light leading-[1.1] tracking-tight text-stone-900 sm:text-5xl md:text-6xl lg:text-[3.5rem]">
            <span className="font-semibold tracking-tight">{storeName}</span>
            <span className="mt-3 block text-stone-600">
              Речі, які тримають форму життя.
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-stone-600 sm:text-base">
            Відібраний каталог без зайвого шуму — лише те, що варто носити,
            дарувати та залишати з собою надовго.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <a
              href="#catalog"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-stone-900 px-8 py-3.5 text-sm font-medium tracking-wide text-white shadow-lg shadow-stone-900/15 transition-all duration-300 hover:bg-stone-800 hover:shadow-xl hover:shadow-stone-900/20 active:scale-[0.98]"
            >
              Перейти до каталогу
            </a>
            <Link
              href="/cart"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-stone-300/90 bg-white/60 px-8 py-3.5 text-sm font-medium tracking-wide text-stone-800 backdrop-blur-sm transition-all duration-300 hover:border-stone-400 hover:bg-white active:scale-[0.98]"
            >
              Кошик
            </Link>
          </div>
        </div>
      </section>

      <main
        id="catalog"
        className="scroll-mt-24 px-5 pb-20 sm:px-8 sm:pb-28 md:scroll-mt-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-2 sm:mb-14 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-stone-500">
                Каталог
              </p>
              <h2 className="mt-2 font-serif text-2xl font-medium tracking-tight text-stone-900 sm:text-3xl">
                Обране для вас
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-stone-500">
              Кожна позиція в наявності в один клік — перегляньте деталі та
              додайте в кошик.
            </p>
          </div>

          {fetchError ? (
            <p className="rounded-2xl border border-stone-200/80 bg-white/80 px-8 py-12 text-center text-sm text-stone-600">
              Не вдалося завантажити товари. Спробуйте пізніше.
            </p>
          ) : products.length === 0 ? (
            <p className="rounded-2xl border border-stone-200/80 bg-white/80 px-8 py-12 text-center text-sm text-stone-600">
              Товарів поки немає.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-9 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
