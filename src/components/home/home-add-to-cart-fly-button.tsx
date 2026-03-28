"use client";

import { useState, type RefObject } from "react";

import { addProductToCart } from "@/lib/checkout/add-product-to-cart";

import { HOME_CART_FLY_TARGET_ID } from "./home-cart-fly-constants";

const FLY_MS = 700;

type Props = {
  productId: string;
  imageUrl: string | null | undefined;
  imageContainerRef: RefObject<HTMLElement | null>;
  productName: string;
};

function pulseCartTarget() {
  const el = document.getElementById(HOME_CART_FLY_TARGET_ID);
  if (!el) return;
  el.classList.add("home-cart-fly-pulse");
  window.setTimeout(() => {
    el.classList.remove("home-cart-fly-pulse");
  }, 900);
}

function flyToCart(opts: {
  fromEl: HTMLElement | null;
  imageUrl: string | null | undefined;
  productName: string;
}) {
  if (typeof window === "undefined") return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    pulseCartTarget();
    return;
  }

  const cart = document.getElementById(HOME_CART_FLY_TARGET_ID);
  const cartRect = cart?.getBoundingClientRect();
  let fromRect = opts.fromEl?.getBoundingClientRect();

  const fallback = 72;
  if (!fromRect || fromRect.width < 2 || fromRect.height < 2) {
    fromRect = new DOMRect(
      window.innerWidth / 2 - fallback / 2,
      window.innerHeight / 2 - fallback / 2,
      fallback,
      fallback,
    );
  }

  if (!cartRect || cartRect.width < 1) {
    pulseCartTarget();
    return;
  }

  const fly: HTMLImageElement | HTMLDivElement = opts.imageUrl
    ? document.createElement("img")
    : document.createElement("div");

  if (fly instanceof HTMLImageElement) {
    fly.src = opts.imageUrl ?? "";
    fly.alt = opts.productName.slice(0, 120);
  } else {
    fly.setAttribute("aria-hidden", "true");
    fly.style.background =
      "radial-gradient(circle at 35% 35%, rgba(34,211,238,0.95), rgba(6,182,212,0.4) 50%, rgba(34,211,238,0.15) 100%)";
    fly.style.boxShadow = "0 0 28px rgba(34,211,238,0.55)";
  }

  const { left, top, width: w, height: h } = fromRect;
  const s = fly.style;
  s.position = "fixed";
  s.left = `${left}px`;
  s.top = `${top}px`;
  s.width = `${w}px`;
  s.height = `${h}px`;
  s.zIndex = "100";
  s.pointerEvents = "none";
  s.borderRadius = fly instanceof HTMLImageElement ? "12px" : "9999px";
  if (fly instanceof HTMLImageElement) {
    s.objectFit = "cover";
  }
  s.boxShadow =
    "0 12px 40px rgba(0,0,0,0.35), 0 0 24px rgba(34,211,238,0.25)";
  s.transition = `transform ${FLY_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${FLY_MS}ms ease-in-out`;
  s.transform = "translate(0,0) scale(1)";
  s.opacity = "1";

  document.body.appendChild(fly);

  const cx = left + w / 2;
  const cy = top + h / 2;
  const tcx = cartRect.left + cartRect.width / 2;
  const tcy = cartRect.top + cartRect.height / 2;
  const dx = tcx - cx;
  const dy = tcy - cy;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fly.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
      fly.style.opacity = "0";
    });
  });

  window.setTimeout(() => {
    fly.remove();
    pulseCartTarget();
  }, FLY_MS + 50);
}

export function HomeAddToCartFlyButton({
  productId,
  imageUrl,
  imageContainerRef,
  productName,
}: Props) {
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await addProductToCart(fd);
    } catch {
      setPending(false);
      return;
    }
    flyToCart({
      fromEl: imageContainerRef.current,
      imageUrl,
      productName,
    });
    setPending(false);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="min-w-0 flex-1">
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-60"
      >
        {pending ? "Додаємо…" : "Додати в кошик"}
      </button>
    </form>
  );
}
