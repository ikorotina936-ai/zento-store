"use client";

import Link from "next/link";
import { useRef } from "react";
import { useFormStatus } from "react-dom";

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`size-4 shrink-0 animate-spin ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

type Props = {
  submitCheckoutOrder: (formData: FormData) => void | Promise<void>;
  startStripeCheckoutSession: (formData: FormData) => void | Promise<void>;
  codDisabled: boolean;
  stripeDisabled: boolean;
};

export function CheckoutFormActions({
  submitCheckoutOrder,
  startStripeCheckoutSession,
  codDisabled,
  stripeDisabled,
}: Props) {
  const { pending } = useFormStatus();
  const submitKindRef = useRef<"cod" | "stripe" | null>(null);

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:flex-wrap">
      <button
        type="submit"
        formAction={submitCheckoutOrder}
        disabled={pending || codDisabled}
        aria-busy={pending && submitKindRef.current === "cod"}
        onClick={() => {
          submitKindRef.current = "cod";
        }}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[220px]"
      >
        {pending && submitKindRef.current === "cod" ? (
          <>
            <Spinner className="text-white" />
            <span>Обробка…</span>
          </>
        ) : (
          "Підтвердити замовлення"
        )}
      </button>
      <button
        type="submit"
        formAction={startStripeCheckoutSession}
        disabled={pending || stripeDisabled}
        aria-busy={pending && submitKindRef.current === "stripe"}
        onClick={() => {
          submitKindRef.current = "stripe";
        }}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-violet-300 bg-violet-50 px-6 py-3 text-sm font-medium text-violet-950 transition-colors hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[220px]"
      >
        {pending && submitKindRef.current === "stripe" ? (
          <>
            <Spinner className="text-violet-700" />
            <span>Перехід до Stripe…</span>
          </>
        ) : (
          "Оплатити карткою (Stripe)"
        )}
      </button>
      <Link
        href="/cart"
        className="inline-flex flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 sm:min-w-[200px]"
      >
        Назад до кошика
      </Link>
    </div>
  );
}
