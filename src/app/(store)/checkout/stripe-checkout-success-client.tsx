"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <p className="mt-4 text-sm text-red-700" role="alert">
        Платіж ще не підтверджено. Оновіть сторінку або зверніться у підтримку.
      </p>
    );
  }
  if (error === "stripe_error") {
    return (
      <p className="mt-4 text-sm text-red-700" role="alert">
        Не вдалося перевірити сесію. Спробуйте оновити сторінку.
      </p>
    );
  }
  if (pending) {
    return (
      <p className="mt-4 text-sm text-indigo-800/90">
        Підтверджуємо оплату та очікуємо номер замовлення…
      </p>
    );
  }
  if (details) {
    return (
      <div className="mt-6 w-full max-w-md text-left">
        <h2 className="text-sm font-semibold tracking-tight text-indigo-950">
          Деталі замовлення
        </h2>
        <p className="mt-2 font-mono text-base font-medium text-indigo-950">
          № {details.orderNumber}
        </p>
        <p className="mt-2 text-sm text-indigo-900/90">
          Разом:{" "}
          <span className="font-semibold tabular-nums">
            {details.currency} {details.totalAmount}
          </span>
        </p>
        <ul className="mt-4 space-y-3 border-t border-indigo-200/70 pt-4">
          {details.items.map((item, index) => (
            <li
              key={index}
              className="flex flex-col gap-0.5 text-sm text-indigo-900/90 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="min-w-0 flex-1 leading-snug">{item.productName}</span>
              <span className="shrink-0 text-indigo-800/85 tabular-nums">
                ×{item.quantity} · {details.currency} {item.lineTotal}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href={`/order/${details.id}`}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-indigo-300/90 bg-white px-6 py-3 text-sm font-medium text-indigo-950 shadow-sm hover:bg-indigo-100/40 sm:w-auto"
        >
          Переглянути замовлення
        </Link>
      </div>
    );
  }
  if (orderNumber) {
    return (
      <p className="mt-3 font-mono text-base font-medium text-indigo-950">
        № {orderNumber}
      </p>
    );
  }
  return (
    <p className="mt-4 text-sm leading-relaxed text-indigo-900/85">
      Оплата успішна, кошик очищено. Номер замовлення з’явиться після обробки
      webhook — оновіть сторінку за хвилину.
    </p>
  );
}
