import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

/**
 * Лінивий singleton для Stripe SDK (Route Handlers / Server Actions).
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.length === 0) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return typeof key === "string" && key.length > 0;
}
