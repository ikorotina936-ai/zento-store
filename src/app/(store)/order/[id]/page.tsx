import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Замовлення",
  description: "Деталі замовлення",
};

const storeName =
  (process.env.NEXT_PUBLIC_STORE_NAME ?? "ZENTO").trim() || "ZENTO";

type PageProps = {
  params: Promise<{ id: string }>;
};

function decimalToNumber(d: { toString(): string }): number {
  return Number.parseFloat(d.toString());
}

function formatMoney(amount: number, currency: string): string {
  if (Number.isNaN(amount)) {
    return "—";
  }
  const code = currency.length === 3 ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function NotFoundState() {
  return (
    <div className="min-h-full bg-[#fafafa] text-zinc-900">
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center sm:py-28">
        <div className="rounded-2xl border border-zinc-200/80 bg-white px-10 py-14 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            Замовлення
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
            Не знайдено
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Такого замовлення в системі немає або посилання застаріло.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            До каталогу
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function OrderViewPage({ params }: PageProps) {
  const { id } = await params;

  if (!id?.trim()) {
    return <NotFoundState />;
  }

  const order = await prisma.order.findUnique({
    where: { id: id.trim() },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      totalAmount: true,
      currency: true,
      email: true,
      customerName: true,
      phone: true,
      city: true,
      line1: true,
      comment: true,
      trackingNumber: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: { id: true, productName: true, quantity: true, price: true },
      },
    },
  });

  if (!order) {
    return <NotFoundState />;
  }

  const currency = order.currency.trim().toUpperCase() || "USD";

  const contactRows: Array<{ key: string; label: string; value: string }> = [];
  const add = (key: string, label: string, raw: string | null | undefined) => {
    const v = typeof raw === "string" ? raw.trim() : "";
    if (v.length > 0) {
      contactRows.push({ key, label, value: v });
    }
  };
  add("name", "Ім’я", order.customerName);
  add("email", "Email", order.email);
  add("phone", "Телефон", order.phone);
  add("city", "Місто", order.city);
  add("line1", "Адреса", order.line1);
  add("comment", "Коментар", order.comment);
  add("tracking", "Трекінг", order.trackingNumber);

  return (
    <div className="min-h-full bg-[#fafafa] text-zinc-900">
      <div className="mx-auto max-w-lg px-6 py-16 sm:py-24">
        <div className="rounded-2xl border border-zinc-200/80 bg-white px-8 py-12 shadow-sm sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            {storeName}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
            Замовлення
          </h1>
          <p className="mt-2 font-mono text-sm font-medium text-zinc-800">
            № {order.orderNumber}
          </p>

          {contactRows.length > 0 ? (
            <section className="mt-6 border-t border-zinc-100 pt-6">
              <h2 className="text-sm font-semibold text-zinc-900">
                Контактні дані / Доставка
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                {contactRows.map((row) => (
                  <div key={row.key} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                    <dt className="shrink-0 text-zinc-500">{row.label}</dt>
                    <dd className="min-w-0 break-words text-right font-medium text-zinc-900 sm:text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <dl className="mt-6 space-y-2 border-t border-zinc-100 pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Статус</dt>
              <dd className="font-medium text-zinc-900">{order.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Оплата</dt>
              <dd className="font-medium text-zinc-900">{order.paymentStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Виконання</dt>
              <dd className="font-medium text-zinc-900">{order.fulfillmentStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Разом</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">
                {formatMoney(decimalToNumber(order.totalAmount), currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Валюта</dt>
              <dd className="font-medium text-zinc-900">{currency}</dd>
            </div>
          </dl>

          <h2 className="mt-8 text-sm font-semibold text-zinc-900">Товари</h2>
          <ul className="mt-3 divide-y divide-zinc-100 border-t border-zinc-100">
            {order.items.map((item) => {
              const unit = decimalToNumber(item.price);
              const line = unit * item.quantity;
              return (
                <li key={item.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-900">
                    {item.productName}
                  </span>
                  <div className="shrink-0 text-right text-sm tabular-nums text-zinc-700">
                    <span className="block sm:inline">
                      ×{item.quantity} · {formatMoney(unit, currency)}
                    </span>
                    <span className="mt-0.5 block font-medium text-zinc-900 sm:mt-1">
                      {formatMoney(line, currency)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              До каталогу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
