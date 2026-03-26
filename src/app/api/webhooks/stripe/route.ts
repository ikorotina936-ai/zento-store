import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/stripe";
import { syncPaidOrderFromCheckoutSessionId } from "@/lib/stripe/sync-order-from-checkout-session";

export const dynamic = "force-dynamic";

/**
 * Stripe webhooks: Dashboard → Webhooks → endpoint URL, `STRIPE_WEBHOOK_SECRET`.
 * Подія `checkout.session.completed` — ідемпотентний upsert Order (stripeSessionId).
 */
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.length === 0) {
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[webhooks/stripe] invalid signature", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const obj = event.data.object as Stripe.Checkout.Session;
      const sessionId = obj.id;

      const result = await syncPaidOrderFromCheckoutSessionId(sessionId);

      if (!result.ok) {
        if (result.skipped) {
          console.warn(
            "[webhooks/stripe] checkout.session.completed skipped",
            sessionId,
            result.reason,
          );
        } else {
          console.error(
            "[webhooks/stripe] checkout.session.completed sync error",
            sessionId,
            result.error,
          );
          return NextResponse.json(
            { error: "order_sync_failed" },
            { status: 500 },
          );
        }
      } else {
        console.info(
          "[webhooks/stripe] order synced",
          sessionId,
          result.orderId,
          result.alreadyPaid ? "(idempotent)" : "",
        );
      }
    }
  } catch (err) {
    console.error("[webhooks/stripe] handler", event.type, err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
