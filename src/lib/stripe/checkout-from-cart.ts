import type Stripe from "stripe";

import {
  CART_COOKIE,
  mergeCartLines,
  parseCartCookie,
  priceToNumber,
  type CartLine,
} from "@/lib/checkout/store-cart-cookie";
import { prisma } from "@/lib/db/prisma";

import { getStripe } from "./stripe";

/** Підтримувані для Checkout Session валюти цього storefront (див. dbCurrencyToStripeCheckoutCurrency). */
export type StripeCheckoutCurrency = "uah" | "usd";

export type BuildStripeCartResult =
  | {
      ok: true;
      lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
      stripeCurrency: StripeCheckoutCurrency;
    }
  | {
      ok: false;
      reason:
        | "empty_cart"
        | "mixed_currency"
        | "no_valid_lines"
        | "unsupported_currency";
    };

/**
 * Stripe Checkout підтримує UAH. Якщо всі позиції в кошику в UAH — сесія в `uah`.
 * Інакше безпечний fallback на `usd` лише коли валюта в БД саме USD (ті самі числові суми).
 * Для EUR, GBP тощо конвертація не виконується — повертаємо unsupported_currency
 * (додайте курси або окремі Stripe prices, коли знадобиться).
 */
function dbCurrencyToStripeCheckoutCurrency(
  codes: Set<string>,
): StripeCheckoutCurrency | "mixed" | "unsupported" {
  if (codes.size !== 1) {
    return "mixed";
  }
  const code = [...codes][0].trim().toUpperCase();
  if (code === "UAH") {
    return "uah";
  }
  if (code === "USD") {
    return "usd";
  }
  return "unsupported";
}

function toMinorUnits(unitMajor: number): number {
  if (!Number.isFinite(unitMajor) || unitMajor < 0) {
    return 0;
  }
  return Math.round(unitMajor * 100);
}

type CookieGetter = { get: (name: string) => { value: string } | undefined };

/**
 * Збирає line_items для Stripe з cookie `store_cart` і актуальних цін Prisma.
 */
export async function buildStripeLineItemsFromStoreCart(
  cookieStore: CookieGetter,
): Promise<BuildStripeCartResult> {
  const raw = cookieStore.get(CART_COOKIE)?.value;
  const merged = mergeCartLines(parseCartCookie(raw));
  if (merged.length === 0) {
    return { ok: false, reason: "empty_cart" };
  }

  const ids = merged.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const currencyCodes = new Set<string>();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const line of merged) {
    const p = byId.get(line.productId);
    if (!p) {
      continue;
    }
    const unit = priceToNumber(p.price);
    if (!Number.isFinite(unit) || unit < 0) {
      continue;
    }
    currencyCodes.add(p.currency);
  }

  const stripeCurrency = dbCurrencyToStripeCheckoutCurrency(currencyCodes);
  if (stripeCurrency === "mixed") {
    return { ok: false, reason: "mixed_currency" };
  }
  if (stripeCurrency === "unsupported") {
    return { ok: false, reason: "unsupported_currency" };
  }

  for (const line of merged) {
    const p = byId.get(line.productId);
    if (!p) {
      continue;
    }
    const unit = priceToNumber(p.price);
    if (!Number.isFinite(unit) || unit < 0) {
      continue;
    }
    const unitAmount = toMinorUnits(unit);
    if (unitAmount <= 0) {
      continue;
    }
    lineItems.push({
      quantity: line.quantity,
      price_data: {
        currency: stripeCurrency,
        unit_amount: unitAmount,
        product_data: {
          name: p.name,
          metadata: { productId: p.id },
        },
      },
    });
  }

  if (lineItems.length === 0) {
    return { ok: false, reason: "no_valid_lines" };
  }

  return { ok: true, lineItems, stripeCurrency };
}

export type StripeCheckoutCustomerMeta = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  line1: string;
  comment?: string;
};

function truncateMeta(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return value.slice(0, max - 1) + "…";
}

/**
 * Створює Checkout Session. Кошик очищається на success-сторінці після перевірки
 * `payment_status`; замовлення фіксує webhook `checkout.session.completed`.
 */
export async function createStripeCheckoutSession(params: {
  origin: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  /** Повні контактні дані з форми checkout (metadata + email). */
  customer?: StripeCheckoutCustomerMeta;
  /** Лише email з API — без зайвих полів у metadata. */
  prefillEmail?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const origin = params.origin.replace(/\/$/, "");

  const meta: Stripe.MetadataParam = {
    store_cart_flow: "1",
    zento_checkout: "1",
  };
  if (params.customer) {
    meta.fullName = truncateMeta(params.customer.fullName, 500);
    meta.phone = truncateMeta(params.customer.phone, 500);
    meta.city = truncateMeta(params.customer.city, 500);
    meta.line1 = truncateMeta(params.customer.line1, 500);
    if (params.customer.comment) {
      meta.comment = truncateMeta(params.customer.comment, 500);
    }
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: params.lineItems,
    success_url: `${origin}/checkout?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?stripe_cancel=1`,
    metadata: meta,
    payment_intent_data: {
      metadata: meta,
    },
  };

  const email = params.customer?.email ?? params.prefillEmail;
  if (email) {
    sessionParams.customer_email = email;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

/** Для тестів / імпорту типів без Prisma query */
export type { CartLine };
