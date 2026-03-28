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
  startStripeCheckoutSession: (formData: FormData) => void | Promise<void>;
  stripeDisabled: boolean;
};

export function CheckoutFormActions({
  startStripeCheckoutSession,
  stripeDisabled,
}: Props) {
  const { pending } = useFormStatus();
  const clickedRef = useRef(false);

  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
      <button
        type="submit"
        formAction={startStripeCheckoutSession}
        disabled={pending || stripeDisabled}
        aria-busy={pending && clickedRef.current}
        onClick={() => {
          clickedRef.current = true;
        }}
        className="zento-btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[240px]"
      >
        {pending && clickedRef.current ? (
          <>
            <Spinner className="text-white" />
            <span>Перехід до Stripe…</span>
          </>
        ) : (
          "Оплатити через Stripe"
        )}
      </button>
      <Link
        href="/cart"
        className="zento-btn-ghost inline-flex min-h-11 flex-1 items-center justify-center px-6 py-3 text-sm sm:min-w-[200px]"
      >
        Назад до кошика
      </Link>
    </div>
  );
}
