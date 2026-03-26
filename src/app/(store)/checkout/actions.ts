"use server";

import { cookies } from "next/headers";

import { CART_COOKIE } from "@/lib/checkout/store-cart-cookie";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getStripe } from "@/lib/stripe/stripe";

export type StripeSuccessOrderDetails = {
  id: string;
  orderNumber: string;
  email: string;
  currency: string;
  totalAmount: string;
  items: Array<{
    productName: string;
    quantity: number;
    lineTotal: string;
  }>;
};

export type FinalizeStripeSuccessResult =
  | { ok: true; orderNumber: string | null; details: StripeSuccessOrderDetails | null }
  | { ok: false; reason: "not_paid" | "stripe_error" };

function formatMoney2(d: Prisma.Decimal | { toString(): string }): string {
  return new Prisma.Decimal(d.toString()).toDecimalPlaces(2).toString();
}

function orderToStripeSuccessDetails(order: {
  id: string;
  orderNumber: string;
  email: string;
  currency: string;
  totalAmount: Prisma.Decimal;
  items: Array<{ productName: string; quantity: number; price: Prisma.Decimal }>;
}): StripeSuccessOrderDetails {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    email: order.email.trim(),
    currency: order.currency.trim().toUpperCase() || "USD",
    totalAmount: formatMoney2(order.totalAmount),
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      lineTotal: formatMoney2(
        new Prisma.Decimal(item.price.toString()).mul(item.quantity),
      ),
    })),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Один виклик з клієнта: перевіряє Stripe, один раз очищує store_cart,
 * опційно чекає на запис замовлення webhook (poll лише Prisma).
 */
export async function finalizeStripeCheckoutSuccess(
  sessionId: string,
): Promise<FinalizeStripeSuccessResult> {
  if (!sessionId || sessionId.length < 8) {
    return { ok: false, reason: "stripe_error" };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return { ok: false, reason: "not_paid" };
    }

    const jar = await cookies();
    jar.delete(CART_COOKIE);

    for (let i = 0; i < 12; i++) {
      const order = await prisma.order.findUnique({
        where: { stripeSessionId: sessionId },
        select: {
          id: true,
          orderNumber: true,
          email: true,
          paymentStatus: true,
          currency: true,
          totalAmount: true,
          items: {
            orderBy: { createdAt: "asc" },
            select: { productName: true, quantity: true, price: true },
          },
        },
      });
      if (order?.paymentStatus === "PAID") {
        const details = orderToStripeSuccessDetails(order);
        return {
          ok: true,
          orderNumber: order.orderNumber,
          details,
        };
      }
      await delay(600);
    }

    return { ok: true, orderNumber: null, details: null };
  } catch (err) {
    console.error("[finalizeStripeCheckoutSuccess]", sessionId, err);
    return { ok: false, reason: "stripe_error" };
  }
}
