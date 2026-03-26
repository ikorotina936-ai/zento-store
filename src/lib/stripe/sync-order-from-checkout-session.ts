import type Stripe from "stripe";

import { generateOrderNumber } from "@/lib/order/order-number";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

import { getStripe } from "./stripe";

type LineItemRow = {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceMajor: number;
  supplierSku: string | null;
};

function extractProductIdFromStripeProduct(
  product: string | Stripe.Product | Stripe.DeletedProduct,
): string | null {
  if (typeof product === "string") {
    return null;
  }
  if ("deleted" in product && product.deleted) {
    return null;
  }
  const pid = product.metadata?.productId;
  return typeof pid === "string" && pid.length > 0 ? pid : null;
}

function parseCheckoutLineItems(session: Stripe.Checkout.Session): LineItemRow[] {
  const rows = session.line_items?.data;
  if (!rows || rows.length === 0) {
    return [];
  }

  const out: LineItemRow[] = [];
  for (const li of rows) {
    const qty = li.quantity ?? 0;
    if (qty <= 0) {
      continue;
    }

    let productId: string | null = null;
    const price = li.price;
    if (price && typeof price === "object" && price.product) {
      productId = extractProductIdFromStripeProduct(price.product);
    }

    const name =
      li.description ??
      (typeof price === "object" && price?.nickname
        ? price.nickname
        : "Товар");

    const subtotalMinor = li.amount_subtotal ?? 0;
    const unitMinor = qty > 0 ? subtotalMinor / qty : 0;
    const unitMajor = unitMinor / 100;

    out.push({
      productId,
      productName: name,
      quantity: qty,
      unitPriceMajor: unitMajor,
      supplierSku: null,
    });
  }
  return out;
}

async function attachSupplierSkus(rows: LineItemRow[]): Promise<LineItemRow[]> {
  const ids = rows
    .map((r) => r.productId)
    .filter((id): id is string => id !== null && id.length > 0);
  if (ids.length === 0) {
    return rows;
  }
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, supplierSku: true },
  });
  const map = new Map(products.map((p) => [p.id, p.supplierSku]));
  return rows.map((r) => ({
    ...r,
    supplierSku:
      r.productId !== null ? (map.get(r.productId) ?? null) : null,
  }));
}

function isZentoCheckoutSession(session: Stripe.Checkout.Session): boolean {
  const m = session.metadata;
  return m?.store_cart_flow === "1" || m?.zento_checkout === "1";
}

/** Checkout form → session.metadata (createStripeCheckoutSession); map fullName → customerName. */
function orderContactFromSessionMetadata(
  metadata: Stripe.Metadata | null | undefined,
): {
  customerName: string | null;
  phone: string | null;
  city: string | null;
  line1: string | null;
  comment: string | null;
} {
  const pick = (key: string): string | null => {
    const v = metadata?.[key];
    const s = typeof v === "string" ? v.trim() : "";
    return s.length > 0 ? s : null;
  };
  return {
    customerName: pick("fullName")?.slice(0, 255) ?? null,
    phone: pick("phone")?.slice(0, 64) ?? null,
    city: pick("city")?.slice(0, 120) ?? null,
    line1: pick("line1")?.slice(0, 255) ?? null,
    comment: pick("comment"),
  };
}

export type SyncPaidOrderResult =
  | { ok: true; orderId: string; alreadyPaid: boolean }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: unknown };

/**
 * Ідемпотентно створює або оновлює Order після успішної оплати Checkout Session.
 * Один рядок на `stripeSessionId` (уникальний індекс + атомарний upsert), повторні webhook не створюють дублікатів.
 */
export async function syncPaidOrderFromCheckoutSessionId(
  sessionId: string,
): Promise<SyncPaidOrderResult> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });

    if (!isZentoCheckoutSession(session)) {
      console.warn(
        "[stripe/sync-order] skip session (not ZENTO storefront metadata)",
        sessionId,
      );
      return { ok: false, skipped: true, reason: "not_zento_checkout" };
    }

    if (session.payment_status !== "paid") {
      console.warn(
        "[stripe/sync-order] skip session (not paid)",
        sessionId,
        session.payment_status,
      );
      return { ok: false, skipped: true, reason: "not_paid" };
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const amountTotal = session.amount_total;
    const currency = session.currency;
    if (amountTotal == null || currency == null) {
      console.error("[stripe/sync-order] missing amount/currency", sessionId);
      return { ok: false, skipped: true, reason: "missing_amount" };
    }

    const totalMajor = amountTotal / 100;
    const emailRaw =
      session.customer_details?.email?.trim() ??
      session.customer_email?.trim() ??
      "";
    const email =
      emailRaw.length > 0 ? emailRaw : "stripe-pending@orders.local";

    let lineRows = parseCheckoutLineItems(session);
    if (lineRows.length === 0) {
      console.error("[stripe/sync-order] no line items", sessionId);
      return { ok: false, skipped: true, reason: "no_line_items" };
    }
    lineRows = await attachSupplierSkus(lineRows);

    const contact = orderContactFromSessionMetadata(session.metadata);

    const prior = await prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      select: { id: true, paymentStatus: true },
    });

    if (prior?.paymentStatus === "PAID") {
      return { ok: true, orderId: prior.id, alreadyPaid: true };
    }

    const paidAt = new Date();
    const orderNumber = generateOrderNumber();

    try {
      let order = await prisma.order.upsert({
        where: { stripeSessionId: sessionId },
        create: {
          orderNumber,
          email,
          ...contact,
          subtotalAmount: totalMajor,
          totalAmount: totalMajor,
          currency: currency.toUpperCase(),
          status: "PROCESSING",
          paymentStatus: "PAID",
          fulfillmentStatus: "UNFULFILLED",
          paidAt,
          stripeSessionId: sessionId,
          stripePaymentIntentId: paymentIntentId,
          items: {
            create: lineRows.map((row) => ({
              productId: row.productId,
              productName: row.productName,
              quantity: row.quantity,
              price: row.unitPriceMajor,
              supplierSku: row.supplierSku,
            })),
          },
        },
        update: {
          status: "PROCESSING",
          paymentStatus: "PAID",
          fulfillmentStatus: "UNFULFILLED",
          stripePaymentIntentId: paymentIntentId,
          totalAmount: totalMajor,
          subtotalAmount: totalMajor,
          currency: currency.toUpperCase(),
          email,
          ...contact,
        },
      });

      if (order.paidAt == null) {
        order = await prisma.order.update({
          where: { id: order.id },
          data: { paidAt: new Date() },
        });
      }

      return { ok: true, orderId: order.id, alreadyPaid: false };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        const race = await prisma.order.findUnique({
          where: { stripeSessionId: sessionId },
          select: {
            id: true,
            paymentStatus: true,
            paidAt: true,
          },
        });
        if (race) {
          const wasPaid = race.paymentStatus === "PAID";
          if (!wasPaid) {
            await prisma.order.update({
              where: { id: race.id },
              data: {
                status: "PROCESSING",
                paymentStatus: "PAID",
                fulfillmentStatus: "UNFULFILLED",
                stripePaymentIntentId: paymentIntentId,
                totalAmount: totalMajor,
                subtotalAmount: totalMajor,
                currency: currency.toUpperCase(),
                email,
                paidAt: race.paidAt ?? new Date(),
                ...contact,
              },
            });
          }
          return {
            ok: true,
            orderId: race.id,
            alreadyPaid: wasPaid,
          };
        }
      }
      console.error("[stripe/sync-order] upsert failed", sessionId, e);
      return { ok: false, skipped: false, error: e };
    }
  } catch (e) {
    console.error("[stripe/sync-order] retrieve failed", sessionId, e);
    return { ok: false, skipped: false, error: e };
  }
}
