import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  CART_COOKIE,
  mergeCartLines,
  parseCartCookie,
  priceToNumber,
} from "@/lib/checkout/store-cart-cookie";
import { prisma } from "@/lib/db/prisma";
import { getAppOriginFromHeaders } from "@/lib/http/app-origin";
import { generateOrderNumber } from "@/lib/order/order-number";
import {
  buildStripeLineItemsFromStoreCart,
  createStripeCheckoutSession,
} from "@/lib/stripe/checkout-from-cart";
import { isStripeConfigured } from "@/lib/stripe/stripe";

import { StripeCheckoutSuccessClient } from "./stripe-checkout-success-client";

export const metadata: Metadata = {
  title: "Оформлення замовлення",
  description: "Підсумок та контактні дані",
};

const storeName =
  (process.env.NEXT_PUBLIC_STORE_NAME ?? "ZENTO").trim() || "ZENTO";

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

const checkoutFormSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(1).max(32),
  city: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(255),
  comment: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

type SummaryRow = {
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  unit: number;
  currency: string;
  subtotal: number;
  supplierSku: string | null;
};

async function buildSummaryFromCookie(): Promise<{
  rows: SummaryRow[];
  total: number;
  currency: string | null;
  mixedCurrency: boolean;
}> {
  const jar = await cookies();
  const lines = mergeCartLines(parseCartCookie(jar.get(CART_COOKIE)?.value));
  if (lines.length === 0) {
    return { rows: [], total: 0, currency: null, mixedCurrency: false };
  }

  const ids = lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      currency: true,
      supplierSku: true,
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const rows: SummaryRow[] = [];

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) {
      continue;
    }
    const unit = priceToNumber(p.price);
    rows.push({
      productId: line.productId,
      quantity: line.quantity,
      name: p.name,
      slug: p.slug,
      unit,
      currency: p.currency,
      subtotal: unit * line.quantity,
      supplierSku: p.supplierSku,
    });
  }

  const currencies = [...new Set(rows.map((r) => r.currency.toUpperCase()))];
  const mixedCurrency = currencies.length > 1;
  const currency = rows[0]?.currency ?? null;
  const total = rows.reduce((s, r) => s + r.subtotal, 0);

  return { rows, total, currency, mixedCurrency };
}

async function submitCheckoutOrder(formData: FormData) {
  "use server";

  const jar = await cookies();
  const lines = mergeCartLines(
    parseCartCookie(jar.get(CART_COOKIE)?.value),
  );

  if (lines.length === 0) {
    redirect("/checkout?error=empty");
  }

  const ids = lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      supplierSku: true,
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  type LineRow = {
    productId: string;
    quantity: number;
    name: string;
    unit: number;
    currency: string;
    subtotal: number;
    supplierSku: string | null;
  };

  const resolved: LineRow[] = [];
  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) {
      continue;
    }
    const unit = priceToNumber(p.price);
    resolved.push({
      productId: line.productId,
      quantity: line.quantity,
      name: p.name,
      unit,
      currency: p.currency,
      subtotal: unit * line.quantity,
      supplierSku: p.supplierSku,
    });
  }

  if (resolved.length === 0) {
    redirect("/checkout?error=empty");
  }

  const currencies = [...new Set(resolved.map((r) => r.currency.toUpperCase()))];
  if (currencies.length > 1) {
    redirect("/checkout?error=currency");
  }

  const cartCurrency = resolved[0].currency;
  const total = resolved.reduce((s, r) => s + r.subtotal, 0);

  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    line1: formData.get("line1"),
    comment: formData.get("comment"),
  };

  const parsed = checkoutFormSchema.safeParse({
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone,
    city: raw.city,
    line1: raw.line1,
    comment: raw.comment === null || raw.comment === "" ? undefined : raw.comment,
  });

  if (!parsed.success) {
    redirect("/checkout?error=validation");
  }

  const orderNumber = generateOrderNumber();

  await prisma.order.create({
    data: {
      orderNumber,
      email: parsed.data.email,
      subtotalAmount: total,
      totalAmount: total,
      currency: cartCurrency,
      status: "PENDING",
      paymentStatus: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      items: {
        create: resolved.map((r) => ({
          productId: r.productId,
          productName: r.name,
          quantity: r.quantity,
          price: r.unit,
          supplierSku: r.supplierSku,
        })),
      },
    },
  });

  jar.delete(CART_COOKIE);

  redirect(
    `/checkout?success=1&orderNumber=${encodeURIComponent(orderNumber)}`,
  );
}

async function startStripeCheckoutSession(formData: FormData) {
  "use server";

  if (!isStripeConfigured()) {
    redirect("/checkout?error=stripe_config");
  }

  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    line1: formData.get("line1"),
    comment: formData.get("comment"),
  };

  const parsed = checkoutFormSchema.safeParse({
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone,
    city: raw.city,
    line1: raw.line1,
    comment: raw.comment === null || raw.comment === "" ? undefined : raw.comment,
  });

  if (!parsed.success) {
    redirect("/checkout?error=validation");
  }

  const jar = await cookies();
  const built = await buildStripeLineItemsFromStoreCart(jar);

  if (!built.ok) {
    if (built.reason === "empty_cart") {
      redirect("/checkout?error=empty");
    }
    if (built.reason === "mixed_currency") {
      redirect("/checkout?error=currency");
    }
    if (built.reason === "unsupported_currency") {
      redirect("/checkout?error=stripe_currency");
    }
    redirect("/checkout?error=stripe_error");
  }

  const origin = await getAppOriginFromHeaders();

  let session;
  try {
    session = await createStripeCheckoutSession({
      origin,
      lineItems: built.lineItems,
      customer: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        city: parsed.data.city,
        line1: parsed.data.line1,
        comment: parsed.data.comment,
      },
    });
  } catch (err) {
    console.error("[startStripeCheckoutSession]", err);
    redirect("/checkout?error=stripe_error");
  }

  if (!session.url) {
    redirect("/checkout?error=stripe_error");
  }

  redirect(session.url);
}

type PageProps = {
  searchParams: Promise<{
    success?: string;
    orderNumber?: string;
    error?: string;
    stripe_success?: string;
    stripe_cancel?: string;
    session_id?: string;
  }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const showCodSuccess = sp.success === "1" && Boolean(sp.orderNumber);
  const showStripeSuccess =
    sp.stripe_success === "1" && Boolean(sp.session_id);

  if (showCodSuccess) {
    return (
      <div className="min-h-full bg-[#fafafa] text-zinc-900">
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center sm:py-28">
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-10 py-14 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700/80">
              Готово
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-emerald-950">
              Дякуємо за замовлення
            </h1>
            <p className="mt-3 font-mono text-sm text-emerald-900">
              № {sp.orderNumber}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-emerald-900/85">
              Замовлення збережено в системі. Якщо очікується оплата окремо —
              менеджер зв’яжеться з вами за вказаним email.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                До каталогу
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Кошик
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showStripeSuccess && sp.session_id) {
    return (
      <div className="min-h-full bg-[#fafafa] text-zinc-900">
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center sm:py-28">
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 px-10 py-14 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-700/80">
              Stripe
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-indigo-950">
              Дякуємо за оплату
            </h1>
            <StripeCheckoutSuccessClient sessionId={sp.session_id} />
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                До каталогу
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { rows, total, currency, mixedCurrency } = await buildSummaryFromCookie();
  const errorKey = sp.error;
  const stripeCancelled = sp.stripe_cancel === "1";

  if (rows.length === 0) {
    return (
      <div className="min-h-full bg-[#fafafa] text-zinc-900">
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center sm:py-28">
          <div className="rounded-2xl border border-zinc-200/80 bg-white px-10 py-14 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              {storeName}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
              Немає товарів для оформлення
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Кошик порожній або товари з cookie більше не знайдені в каталозі.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                До каталогу
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                До кошика
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fafafa] text-zinc-900">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6 py-5 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            {storeName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Оформлення замовлення
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8 sm:py-12">
        {errorKey === "validation" ? (
          <div
            className="mb-10 rounded-2xl border border-red-200/80 bg-red-50/90 px-6 py-4 text-sm text-red-900"
            role="alert"
          >
            Перевірте коректність полів форми та спробуйте ще раз.
          </div>
        ) : null}
        {errorKey === "empty" ? (
          <div
            className="mb-10 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-6 py-4 text-sm text-amber-950"
            role="alert"
          >
            Кошик був порожній під час відправки. Оновіть сторінку або додайте
            товари.
          </div>
        ) : null}
        {errorKey === "currency" ? (
          <div
            className="mb-10 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-6 py-4 text-sm text-amber-950"
            role="alert"
          >
            У кошику кілька валют. Об’єднайте замовлення в одній валюті перед
            оплатою.
          </div>
        ) : null}
        {errorKey === "stripe_config" ? (
          <div
            className="mb-10 rounded-2xl border border-red-200/80 bg-red-50/90 px-6 py-4 text-sm text-red-900"
            role="alert"
          >
            Онлайн-оплата не налаштована: додайте{" "}
            <code className="rounded bg-white/80 px-1 text-xs">
              STRIPE_SECRET_KEY
            </code>{" "}
            у змінні середовища.
          </div>
        ) : null}
        {errorKey === "stripe_error" ? (
          <div
            className="mb-10 rounded-2xl border border-red-200/80 bg-red-50/90 px-6 py-4 text-sm text-red-900"
            role="alert"
          >
            Не вдалося створити Stripe Checkout. Спробуйте пізніше або
            оформіть замовлення без картки.
          </div>
        ) : null}
        {errorKey === "stripe_currency" ? (
          <div
            className="mb-10 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-6 py-4 text-sm text-amber-950"
            role="alert"
          >
            Stripe Checkout зараз підтримує лише валюти UAH та USD згідно з
            цінами в каталозі. Змініть валюту товарів або розділіть замовлення.
          </div>
        ) : null}
        {stripeCancelled ? (
          <div
            className="mb-10 rounded-2xl border border-zinc-200/80 bg-zinc-50 px-6 py-4 text-sm text-zinc-800"
            role="status"
          >
            Оплату в Stripe скасовано. Кошик не змінено — можете спробувати ще
            раз або оформити замовлення без онлайн-оплати.
          </div>
        ) : null}

        {mixedCurrency ? (
          <div
            className="mb-8 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 text-sm text-amber-950"
            role="note"
          >
            У кошику різні валюти — оформлення можливе лише після узгодження
            валюти (або розділіть замовлення).
          </div>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
          <section className="lg:col-span-2">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Підсумок замовлення
            </h2>
            <ul className="mt-6 divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
              {rows.map((row) => (
                <li
                  key={row.productId}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/products/${row.slug}`}
                      className="font-medium text-zinc-900 hover:text-zinc-600"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-1 text-sm tabular-nums text-zinc-500">
                      {formatMoney(row.unit, row.currency)} × {row.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-medium tabular-nums text-zinc-900">
                    {formatMoney(row.subtotal, row.currency)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-end justify-between rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-sm">
              <span className="text-sm font-medium text-zinc-500">Разом</span>
              {currency && !mixedCurrency ? (
                <span className="text-xl font-semibold tabular-nums text-zinc-900">
                  {formatMoney(total, currency)}
                </span>
              ) : (
                <span className="text-right text-sm text-zinc-500">
                  Уточніть валюту
                </span>
              )}
            </div>
          </section>

          <section className="lg:col-span-3">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Контакти та доставка
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Для оплати карткою дані йдуть у Stripe як{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">metadata</code>{" "}
              та email отримувача. Ціни завжди з бази, не з браузера.
            </p>

            <form className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Повне ім’я
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-zinc-900/10 transition-[box-shadow,border-color] focus:border-zinc-400 focus:ring-4"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/10"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Телефон
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/10"
                  />
                </div>
                <div>
                  <label
                    htmlFor="city"
                    className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Місто
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/10"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="line1"
                    className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Адреса (вулиця, будинок)
                  </label>
                  <input
                    id="line1"
                    name="line1"
                    type="text"
                    required
                    autoComplete="street-address"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/10"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="comment"
                    className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Коментар{" "}
                    <span className="font-normal normal-case text-zinc-400">
                      (необов’язково)
                    </span>
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    rows={3}
                    className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:flex-wrap">
                <button
                  type="submit"
                  formAction={submitCheckoutOrder}
                  disabled={rows.length === 0 || mixedCurrency}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[220px]"
                >
                  Підтвердити замовлення
                </button>
                <button
                  type="submit"
                  formAction={startStripeCheckoutSession}
                  disabled={
                    rows.length === 0 ||
                    mixedCurrency ||
                    !isStripeConfigured()
                  }
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-6 py-3 text-sm font-medium text-violet-950 transition-colors hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[220px]"
                >
                  Оплатити карткою (Stripe)
                </button>
                <Link
                  href="/cart"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 sm:min-w-[200px]"
                >
                  Назад до кошика
                </Link>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
