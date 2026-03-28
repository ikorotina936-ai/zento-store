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
import {
  buildStripeLineItemsFromStoreCart,
  createStripeCheckoutSession,
} from "@/lib/stripe/checkout-from-cart";
import { isStripeConfigured } from "@/lib/stripe/stripe";

import { CheckoutFormActions } from "./checkout-form-actions";
import { StripeCheckoutSuccessClient } from "./stripe-checkout-success-client";

export const metadata: Metadata = {
  title: "Оформлення замовлення",
  description: "Безпечна оплата через Stripe та доставка ZENTO.",
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

/** HTML5: `required` alone allows whitespace-only; pattern requires at least one non-space. */
const REQUIRED_NON_EMPTY_PATTERN = ".*\\S.*";
const REQUIRED_NON_EMPTY_TITLE =
  "Обов’язкове поле. Введіть текст, не лише пробіли.";
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
    error?: string;
    stripe_success?: string;
    stripe_cancel?: string;
    session_id?: string;
  }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  if (sp.success === "1") {
    redirect("/checkout");
  }

  const showStripeSuccess =
    sp.stripe_success === "1" && Boolean(sp.session_id);

  if (showStripeSuccess && sp.session_id) {
    return (
      <div className="zento-store">
        <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-[#f7f6f4]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4 sm:px-6">
            <Link href="/" className="zento-brand-nav">
              {storeName}
            </Link>
          </div>
        </header>
        <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-12 text-center sm:px-6 sm:py-20">
          <div className="zento-card-lux w-full px-8 py-12 sm:px-10 sm:py-14">
            <StripeCheckoutSuccessClient sessionId={sp.session_id} />
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="zento-btn-primary inline-flex min-h-11 items-center justify-center px-7 py-3 text-sm"
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
      <div className="zento-store">
        <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-14 text-center sm:px-6 sm:py-20">
          <div className="zento-card-lux w-full px-8 py-12 sm:px-10 sm:py-14">
            <Link href="/" className="zento-brand-nav inline-block">
              {storeName}
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
              Немає товарів для оформлення
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Кошик порожній або товари з cookie більше не знайдені в каталозі.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="zento-btn-primary inline-flex min-h-11 items-center justify-center px-6 py-3 text-sm"
              >
                До каталогу
              </Link>
              <Link
                href="/cart"
                className="zento-btn-ghost inline-flex min-h-11 items-center justify-center px-6 py-3 text-sm"
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
    <div className="zento-store">
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-[#f7f6f4]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-5">
          <div>
            <Link href="/" className="zento-brand-nav inline-block">
              {storeName}
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Оформлення замовлення
            </h1>
          </div>
          <Link
            href="/cart"
            className="zento-btn-ghost inline-flex self-start px-4 py-2 text-xs sm:self-auto sm:text-sm"
          >
            Кошик
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        {errorKey === "validation" ? (
          <div
            className="mb-8 rounded-2xl border border-red-200/70 bg-red-50/80 px-5 py-4 text-sm leading-relaxed text-red-900 sm:px-6"
            role="alert"
          >
            Перевірте коректність полів форми та спробуйте ще раз.
          </div>
        ) : null}
        {errorKey === "empty" ? (
          <div
            className="mb-8 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-5 py-4 text-sm leading-relaxed text-amber-950 sm:px-6"
            role="alert"
          >
            Кошик був порожній. Оновіть сторінку або додайте товари.
          </div>
        ) : null}
        {errorKey === "currency" ? (
          <div
            className="mb-8 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-5 py-4 text-sm leading-relaxed text-amber-950 sm:px-6"
            role="alert"
          >
            У кошику кілька валют. Об’єднайте замовлення в одній валюті перед
            оплатою.
          </div>
        ) : null}
        {errorKey === "stripe_config" ? (
          <div
            className="mb-8 rounded-2xl border border-red-200/70 bg-red-50/80 px-5 py-4 text-sm leading-relaxed text-red-900 sm:px-6"
            role="alert"
          >
            Онлайн-оплата не налаштована: додайте{" "}
            <code className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs ring-1 ring-red-200/50">
              STRIPE_SECRET_KEY
            </code>{" "}
            у змінні середовища.
          </div>
        ) : null}
        {errorKey === "stripe_error" ? (
          <div
            className="mb-8 rounded-2xl border border-red-200/70 bg-red-50/80 px-5 py-4 text-sm leading-relaxed text-red-900 sm:px-6"
            role="alert"
          >
            Не вдалося відкрити безпечну оплату Stripe. Спробуйте ще раз
            пізніше.
          </div>
        ) : null}
        {errorKey === "stripe_currency" ? (
          <div
            className="mb-8 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-5 py-4 text-sm leading-relaxed text-amber-950 sm:px-6"
            role="alert"
          >
            Stripe Checkout зараз підтримує лише валюти UAH та USD згідно з
            цінами в каталозі. Змініть валюту товарів або розділіть замовлення.
          </div>
        ) : null}
        {stripeCancelled ? (
          <div
            className="mb-8 rounded-2xl border border-stone-200/70 bg-white px-5 py-4 text-sm leading-relaxed text-stone-700 sm:px-6"
            role="status"
          >
            Оплату скасовано — кошик не змінено. Натисніть «Оплатити через
            Stripe», щоб спробувати ще раз.
          </div>
        ) : null}

        {mixedCurrency ? (
          <div
            className="mb-8 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-5 py-4 text-sm leading-relaxed text-amber-950"
            role="note"
          >
            У кошику різні валюти. Оберіть одну валюту або розділіть замовлення
            перед оплатою через Stripe.
          </div>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
          <section className="lg:col-span-2">
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Підсумок замовлення
            </h2>
            <ul className="zento-card-lux mt-5 overflow-hidden">
              {rows.map((row) => (
                <li
                  key={row.productId}
                  className="flex flex-col gap-3 border-b border-stone-100 p-5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/products/${row.slug}`}
                      className="font-medium text-stone-900 hover:text-stone-600"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-1 text-sm tabular-nums text-stone-500">
                      {formatMoney(row.unit, row.currency)} × {row.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-semibold tabular-nums text-stone-900">
                    {formatMoney(row.subtotal, row.currency)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="zento-card-lux mt-5 flex items-end justify-between px-5 py-4">
              <span className="text-sm font-medium text-stone-500">Разом</span>
              {currency && !mixedCurrency ? (
                <span className="text-xl font-semibold tabular-nums text-stone-900">
                  {formatMoney(total, currency)}
                </span>
              ) : (
                <span className="text-right text-sm text-stone-500">
                  Уточніть валюту
                </span>
              )}
            </div>
          </section>

          <section className="lg:col-span-3">
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Контакти та доставка
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Контактні дані передаються в Stripe (поле{" "}
              <code className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs text-stone-800 ring-1 ring-stone-200/80">
                metadata
              </code>{" "}
              та email для чеку). Ціни завжди з каталогу, не з браузера.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Поля з <span className="text-red-600">*</span> обов’язкові; порожні
              значення або лише пробіли не приймаються.
            </p>

            <form className="mt-8 space-y-6" id="checkout-form">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="fullName"
                    className="block text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500"
                  >
                    Повне ім’я{" "}
                    <span className="text-red-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    minLength={1}
                    maxLength={255}
                    pattern={REQUIRED_NON_EMPTY_PATTERN}
                    title={REQUIRED_NON_EMPTY_TITLE}
                    autoComplete="name"
                    className="mt-2 w-full rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm shadow-stone-900/[0.03] outline-none transition-[box-shadow,border-color] focus:border-stone-400 focus:ring-4 focus:ring-stone-900/10"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500"
                  >
                    Email{" "}
                    <span className="text-red-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={255}
                    autoComplete="email"
                    className="mt-2 w-full rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm shadow-stone-900/[0.03] outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-900/10"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500"
                  >
                    Телефон{" "}
                    <span className="text-red-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    minLength={1}
                    maxLength={32}
                    pattern={REQUIRED_NON_EMPTY_PATTERN}
                    title={REQUIRED_NON_EMPTY_TITLE}
                    autoComplete="tel"
                    className="mt-2 w-full rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm shadow-stone-900/[0.03] outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-900/10"
                  />
                </div>
                <div>
                  <label
                    htmlFor="city"
                    className="block text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500"
                  >
                    Місто{" "}
                    <span className="text-red-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    minLength={1}
                    maxLength={120}
                    pattern={REQUIRED_NON_EMPTY_PATTERN}
                    title={REQUIRED_NON_EMPTY_TITLE}
                    autoComplete="address-level2"
                    className="mt-2 w-full rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm shadow-stone-900/[0.03] outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-900/10"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="line1"
                    className="block text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500"
                  >
                    Адреса (вулиця, будинок){" "}
                    <span className="text-red-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="line1"
                    name="line1"
                    type="text"
                    required
                    minLength={1}
                    maxLength={255}
                    pattern={REQUIRED_NON_EMPTY_PATTERN}
                    title={REQUIRED_NON_EMPTY_TITLE}
                    autoComplete="street-address"
                    className="mt-2 w-full rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm shadow-stone-900/[0.03] outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-900/10"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="comment"
                    className="block text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500"
                  >
                    Коментар{" "}
                    <span className="font-normal normal-case text-stone-400">
                      (необов’язково)
                    </span>
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    rows={3}
                    className="mt-2 w-full resize-y rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm shadow-stone-900/[0.03] outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-900/10"
                  />
                </div>
              </div>

              <CheckoutFormActions
                startStripeCheckoutSession={startStripeCheckoutSession}
                stripeDisabled={
                  rows.length === 0 ||
                  mixedCurrency ||
                  !isStripeConfigured()
                }
              />
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
