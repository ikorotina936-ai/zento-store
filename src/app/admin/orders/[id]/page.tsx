import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";
import { $Enums } from "@/generated/prisma/client";

import {
  updateOrderFulfillmentStatus,
  updateOrderPaymentStatus,
  updateOrderStatus,
  updateOrderTrackingNumber,
} from "./actions";

export const metadata: Metadata = {
  title: "Замовлення — деталі",
  robots: { index: false, follow: false },
};

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

function textOrDash(v: string | null | undefined): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : "—";
}

function formatOrderDateTime(d: Date): string {
  return d.toLocaleString("uk-UA", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function AdminNotFound() {
  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
        <div className="rounded-xl border border-zinc-200 bg-white px-8 py-12 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Адмін
          </p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-950">
            Замовлення не знайдено
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Невірний id або запис видалено.
          </p>
          <Link
            href="/admin/orders"
            className="mt-8 inline-flex rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            До списку замовлень
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!id?.trim()) {
    return <AdminNotFound />;
  }

  const order = await prisma.order.findUnique({
    where: { id: id.trim() },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      paidAt: true,
      fulfilledAt: true,
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
      stripeSessionId: true,
      stripePaymentIntentId: true,
      trackingNumber: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productName: true,
          quantity: true,
          price: true,
          supplierSku: true,
        },
      },
    },
  });

  if (!order) {
    return <AdminNotFound />;
  }

  const currency = order.currency.trim().toUpperCase() || "USD";

  const orderStatusLabels: Record<$Enums.OrderStatus, string> = {
    PENDING: "Очікує",
    CONFIRMED: "Підтверджено",
    PROCESSING: "В обробці",
    SHIPPED: "Відправлено",
    DELIVERED: "Доставлено",
    CANCELLED: "Скасовано",
    REFUNDED: "Повернено",
  };

  const paymentStatusLabels: Record<$Enums.PaymentStatus, string> = {
    PENDING: "Очікує оплати",
    AUTHORIZED: "Авторизовано",
    PAID: "Оплачено",
    FAILED: "Відхилено",
    REFUNDED: "Повернено",
    PARTIALLY_REFUNDED: "Часткове повернення",
  };

  const fulfillmentLabels: Record<$Enums.FulfillmentStatus, string> = {
    UNFULFILLED: "Не виконано",
    PARTIALLY_FULFILLED: "Частково виконано",
    FULFILLED: "Виконано",
    CANCELLED: "Скасовано (виконання)",
    ON_HOLD: "На паузі",
  };

  const saveOrderStatus = updateOrderStatus.bind(null, order.id);
  const savePaymentStatus = updateOrderPaymentStatus.bind(null, order.id);
  const saveFulfillment = updateOrderFulfillmentStatus.bind(null, order.id);
  const saveTracking = updateOrderTrackingNumber.bind(null, order.id);

  const paidDone = order.paymentStatus === $Enums.PaymentStatus.PAID;
  const fulfilledDone =
    order.fulfillmentStatus === $Enums.FulfillmentStatus.FULFILLED;

  const timelineSteps = [
    {
      key: "created",
      label: "Created",
      done: true as const,
      detail: formatOrderDateTime(order.createdAt),
    },
    {
      key: "paid",
      label: "Paid",
      done: paidDone,
      detail: paidDone
        ? order.paidAt != null
          ? formatOrderDateTime(order.paidAt)
          : "No timestamp in DB — set payment to Paid once or wait for next Stripe sync"
        : "Pending",
    },
    {
      key: "fulfilled",
      label: "Fulfilled",
      done: fulfilledDone,
      detail: fulfilledDone
        ? order.fulfilledAt != null
          ? formatOrderDateTime(order.fulfilledAt)
          : "No timestamp in DB — set fulfillment to Fulfilled once to record"
        : "Pending",
    },
  ] as const;

  const detailRows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "id", value: order.id, mono: true },
    { label: "Номер", value: order.orderNumber, mono: true },
    {
      label: "Створено",
      value: order.createdAt.toLocaleString("uk-UA", {
        dateStyle: "short",
        timeStyle: "medium",
      }),
    },
    {
      label: "Разом",
      value: formatMoney(decimalToNumber(order.totalAmount), currency),
    },
    { label: "Валюта", value: currency },
    { label: "Email", value: textOrDash(order.email) },
    { label: "Ім’я", value: textOrDash(order.customerName) },
    { label: "Телефон", value: textOrDash(order.phone) },
    { label: "Місто", value: textOrDash(order.city) },
    { label: "Адреса", value: textOrDash(order.line1) },
    { label: "Коментар", value: textOrDash(order.comment) },
    {
      label: "Stripe session",
      value: textOrDash(order.stripeSessionId),
      mono: true,
    },
    {
      label: "Payment intent",
      value: textOrDash(order.stripePaymentIntentId),
      mono: true,
    },
  ];

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-indigo-700 hover:underline"
          >
            ← Усі замовлення
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href={`/admin/orders/${order.id}/export`}
              className="text-sm font-medium text-zinc-600 hover:text-indigo-700 hover:underline"
            >
              Експорт замовлення CSV
            </Link>
            <Link
              href={`/order/${order.id}`}
              className="text-sm font-medium text-zinc-600 hover:text-indigo-700 hover:underline"
            >
              Storefront замовлення
            </Link>
            <Link
              href="/"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              На сайт
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Адмін
          </p>
          <h1 className="mt-1 font-mono text-lg font-semibold text-zinc-950">
            {order.orderNumber}
          </h1>

          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-950">
              Status timeline
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Created → Paid → Fulfilled (timestamps from database)
            </p>
            <ol className="mt-4 space-y-0" aria-label="Order status timeline">
              {timelineSteps.map((step, index) => (
                <li key={step.key} className="flex gap-3">
                  <div className="flex w-4 shrink-0 flex-col items-center pt-0.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        step.done ? "bg-emerald-500" : "bg-zinc-300"
                      }`}
                      aria-hidden
                    />
                    {index < timelineSteps.length - 1 ? (
                      <span
                        className="mt-1 min-h-[1.75rem] w-px flex-1 bg-zinc-200"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <div
                    className={
                      index < timelineSteps.length - 1 ? "pb-4" : "pb-0"
                    }
                  >
                    <p className="text-sm font-semibold text-zinc-950">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-600">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-950">
              Статус замовлення
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Поточне:{" "}
              <span className="font-mono text-zinc-700">{order.status}</span>
              {" · "}
              {orderStatusLabels[order.status]}
            </p>
            <form
              action={saveOrderStatus}
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <label
                  htmlFor="orderStatus"
                  className="text-xs font-medium text-zinc-600"
                >
                  Змінити на
                </label>
                <select
                  id="orderStatus"
                  name="status"
                  defaultValue={order.status}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(
                    Object.entries(orderStatusLabels) as Array<
                      [$Enums.OrderStatus, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label} ({value})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Зберегти статус
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-950">
              Статус оплати
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Поточне:{" "}
              <span className="font-mono text-zinc-700">
                {order.paymentStatus}
              </span>
              {" · "}
              {paymentStatusLabels[order.paymentStatus]}
            </p>
            <form
              action={savePaymentStatus}
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <label
                  htmlFor="paymentStatus"
                  className="text-xs font-medium text-zinc-600"
                >
                  Змінити на
                </label>
                <select
                  id="paymentStatus"
                  name="paymentStatus"
                  defaultValue={order.paymentStatus}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(
                    Object.entries(paymentStatusLabels) as Array<
                      [$Enums.PaymentStatus, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label} ({value})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Зберегти оплату
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-950">
              Статус виконання
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Поточне:{" "}
              <span className="font-mono text-zinc-700">
                {order.fulfillmentStatus}
              </span>
              {" · "}
              {fulfillmentLabels[order.fulfillmentStatus]}
            </p>
            <form
              action={saveFulfillment}
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <label
                  htmlFor="fulfillmentStatus"
                  className="text-xs font-medium text-zinc-600"
                >
                  Змінити на
                </label>
                <select
                  id="fulfillmentStatus"
                  name="fulfillmentStatus"
                  defaultValue={order.fulfillmentStatus}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(
                    Object.entries(fulfillmentLabels) as Array<
                      [$Enums.FulfillmentStatus, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label} ({value})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Зберегти
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-950">Трекінг</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Поточне:{" "}
              <span className="font-mono text-zinc-700">
                {textOrDash(order.trackingNumber)}
              </span>
            </p>
            <form
              action={saveTracking}
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <label
                  htmlFor="trackingNumber"
                  className="text-xs font-medium text-zinc-600"
                >
                  Номер відстеження
                </label>
                <input
                  id="trackingNumber"
                  name="trackingNumber"
                  type="text"
                  maxLength={120}
                  defaultValue={order.trackingNumber ?? ""}
                  placeholder="Вставте трекінг або залиште порожнім, щоб скинути"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Зберегти трекінг
              </button>
            </form>
          </div>

          <dl className="mt-6 space-y-3 border-t border-zinc-100 pt-6 text-sm">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-6"
              >
                <dt className="shrink-0 text-zinc-500">{row.label}</dt>
                <dd
                  className={`min-w-0 break-words text-right text-zinc-900 sm:text-right ${row.mono ? "font-mono text-xs" : ""}`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-8 border-t border-zinc-100 pt-8 text-sm font-semibold text-zinc-950">
            Позиції
          </h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-100">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-medium uppercase tracking-wide text-zinc-600">
                  <th className="px-3 py-2 pl-3">Товар</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">
                    К-сть
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">
                    Ціна
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">
                    Рядок
                  </th>
                  <th className="px-3 py-2 pr-3 font-mono text-[10px] normal-case">
                    SKU
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items.map((item) => {
                  const unit = decimalToNumber(item.price);
                  const line = unit * item.quantity;
                  const sku = item.supplierSku?.trim();
                  return (
                    <tr key={item.id} className="align-top">
                      <td className="px-3 py-3 pl-3 font-medium text-zinc-900">
                        {item.productName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-zinc-800">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-zinc-800">
                        {formatMoney(unit, currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-zinc-900">
                        {formatMoney(line, currency)}
                      </td>
                      <td className="max-w-[10rem] px-3 py-3 pr-3 font-mono text-xs text-zinc-600">
                        {sku && sku.length > 0 ? sku : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
