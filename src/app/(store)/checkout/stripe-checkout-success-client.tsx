"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { CheckoutSuccessHomeRedirect } from "./checkout-success-home-redirect";
import {
  finalizeStripeCheckoutSuccess,
  type StripeSuccessOrderDetails,
} from "./actions";

type Props = { sessionId: string };

export function StripeCheckoutSuccessClient({ sessionId }: Props) {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [details, setDetails] = useState<StripeSuccessOrderDetails | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<"not_paid" | "stripe_error" | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const r = await finalizeStripeCheckoutSuccess(sessionId);
      if (cancelled) {
        return;
      }
      if (!r.ok) {
        setError(r.reason === "not_paid" ? "not_paid" : "stripe_error");
        setPending(false);
        return;
      }
      setOrderNumber(r.orderNumber);
      setDetails(r.details);
      setPending(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (error === "not_paid") {
    return (
      <>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
          Платіж не підтверджено
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-red-800" role="alert">
          Транзакцію ще не зафіксовано. Оновіть сторінку або спробуйте ще раз
          через Stripe.
        </p>
      </>
    );
  }
  if (error === "stripe_error") {
    return (
      <>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
          Щось пішло не так
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-red-800" role="alert">
          Не вдалося перевірити сесію оплати. Оновіть сторінку.
        </p>
      </>
    );
  }
  if (pending) {
    return (
      <>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-stone-500">
          Stripe
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
          Ми обробляємо ваше замовлення
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          Підтверджуємо оплату та завантажуємо номер замовлення…
        </p>
      </>
    );
  }
  if (details) {
    return (
      <>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-700/80">
          Готово
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
          Замовлення підтверджено
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Ми обробляємо ваше замовлення.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Статус і трекінг будуть доступні онлайн.
        </p>
        <p className="mt-6 text-sm font-medium text-stone-600">
          Номер замовлення
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-stone-900">
          {details.orderNumber}
        </p>
        <p className="mt-5 text-sm font-medium text-stone-600">
          Електронна пошта
        </p>
        <p className="mt-1 break-all text-base text-stone-900">{details.email}</p>
        <div className="mt-8 w-full max-w-md border-t border-stone-200/80 pt-8 text-left">
          <h2 className="text-sm font-semibold tracking-tight text-stone-900">
            Ваше замовлення
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Разом:{" "}
            <span className="font-semibold tabular-nums text-stone-900">
              {details.currency} {details.totalAmount}
            </span>
          </p>
          <ul className="mt-4 space-y-3 border-t border-stone-100 pt-4">
            {details.items.map((item, index) => (
              <li
                key={index}
                className="flex flex-col gap-0.5 text-sm text-stone-600 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <span className="min-w-0 flex-1 leading-snug">{item.productName}</span>
                <span className="shrink-0 tabular-nums text-stone-800">
                  ×{item.quantity} · {details.currency} {item.lineTotal}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={`/order/${details.id}`}
            className="zento-btn-ghost mt-6 inline-flex w-full min-h-11 items-center justify-center px-6 py-3 text-sm text-stone-900 sm:w-auto"
          >
            Статус замовлення
          </Link>
        </div>
        <CheckoutSuccessHomeRedirect className="mt-6 text-center text-xs text-stone-500" />
      </>
    );
  }
  if (orderNumber) {
    return (
      <>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
          Замовлення підтверджено
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Ми обробляємо ваше замовлення.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Статус і трекінг будуть доступні онлайн.
        </p>
        <p className="mt-6 text-sm font-medium text-stone-600">
          Номер замовлення
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-stone-900">
          {orderNumber}
        </p>
        <CheckoutSuccessHomeRedirect className="mt-6 text-center text-xs text-stone-500" />
      </>
    );
  }
  return (
    <>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
        Замовлення підтверджено
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        Ми обробляємо ваше замовлення.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Статус і трекінг будуть доступні онлайн. Номер з’явиться на сторінці
        після синхронізації — оновіть через хвилину.
      </p>
      <CheckoutSuccessHomeRedirect className="mt-6 text-center text-xs text-stone-500" />
    </>
  );
}
