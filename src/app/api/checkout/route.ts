import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppOriginFromRequest } from "@/lib/http/app-origin";
import {
  buildStripeLineItemsFromStoreCart,
  createStripeCheckoutSession,
} from "@/lib/stripe/checkout-from-cart";
import { isStripeConfigured } from "@/lib/stripe/stripe";

export const dynamic = "force-dynamic";

const postBodySchema = z.object({
  email: z.string().trim().email().max(255).optional(),
});

/**
 * POST /api/checkout — створює Stripe Checkout Session з `store_cart` cookie.
 * Ціни лише з Prisma; тіло запиту не містить сум.
 */
export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "stripe_not_configured" },
        { status: 503 },
      );
    }

    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.length > 0) {
        body = JSON.parse(text) as unknown;
      }
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const parsedBody = postBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const jar = await cookies();
    const built = await buildStripeLineItemsFromStoreCart(jar);

    if (!built.ok) {
      const status =
        built.reason === "empty_cart" ? 400 : 422;
      return NextResponse.json({ error: built.reason }, { status });
    }

    const origin = getAppOriginFromRequest(request);
    const session = await createStripeCheckoutSession({
      origin,
      lineItems: built.lineItems,
      prefillEmail: parsedBody.data.email,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "no_checkout_url" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[api/checkout]", err);
    return NextResponse.json(
      { error: "checkout_session_failed" },
      { status: 500 },
    );
  }
}
