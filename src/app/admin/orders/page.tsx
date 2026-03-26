import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";
import { $Enums } from "@/generated/prisma/client";

import {
  appendSortParams,
  buildOrdersWhere,
  buildPrismaOrderBy,
  listQueryToSearchParams,
  resolveOrderSort,
  type FilterSearchParams,
  type ListQueryParams,
  type SortField,
  type SortDir,
} from "./list-query";

export const metadata: Metadata = {
  title: "Замовлення — адмін",
  description: "Список замовлень",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<
    FilterSearchParams & {
      page?: string;
      sort?: string;
      dir?: string;
    }
  >;
};

type QuickPreset = "all" | "paid" | "unfulfilled" | "processing" | "fulfilled";

function nextSortForHeader(
  current: { sort: SortField; dir: SortDir },
  column: SortField,
): { sort: SortField; dir: SortDir } {
  if (current.sort === column) {
    return {
      sort: column,
      dir: current.dir === "desc" ? "asc" : "desc",
    };
  }
  return { sort: column, dir: "desc" };
}

/** Quick filter: page=1 (без page у URL), зберігає лише q, решта — за preset. */
function buildQuickFilterHref(
  qRaw: string,
  preset: QuickPreset,
  list: Pick<ListQueryParams, "sort" | "dir">,
): string {
  const params = new URLSearchParams();
  const q = typeof qRaw === "string" ? qRaw.trim() : "";
  if (q.length > 0) {
    params.set("q", q);
  }
  appendSortParams(params, list.sort, list.dir);
  switch (preset) {
    case "all":
      break;
    case "paid":
      params.set("paymentStatus", $Enums.PaymentStatus.PAID);
      break;
    case "unfulfilled":
      params.set("fulfillmentStatus", $Enums.FulfillmentStatus.UNFULFILLED);
      break;
    case "processing":
      params.set("status", $Enums.OrderStatus.PROCESSING);
      break;
    case "fulfilled":
      params.set("fulfillmentStatus", $Enums.FulfillmentStatus.FULFILLED);
      break;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
  const qs = params.toString();
  return qs.length > 0 ? `/admin/orders?${qs}` : "/admin/orders";
}

/** Відповідає URL лише якщо рівно один сценарій quick filter (без змішаних полів). */
function resolveActiveQuickPreset(sp: FilterSearchParams): QuickPreset | null {
  const st = sp.status?.trim() ?? "";
  const ps = sp.paymentStatus?.trim() ?? "";
  const fs = sp.fulfillmentStatus?.trim() ?? "";
  if (st === "" && ps === "" && fs === "") {
    return "all";
  }
  if (st === "" && ps === $Enums.PaymentStatus.PAID && fs === "") {
    return "paid";
  }
  if (st === "" && ps === "" && fs === $Enums.FulfillmentStatus.UNFULFILLED) {
    return "unfulfilled";
  }
  if (st === $Enums.OrderStatus.PROCESSING && ps === "" && fs === "") {
    return "processing";
  }
  if (st === "" && ps === "" && fs === $Enums.FulfillmentStatus.FULFILLED) {
    return "fulfilled";
  }
  return null;
}

function buildOrdersListHref(sp: ListQueryParams, page: number): string {
  const params = listQueryToSearchParams(sp);
  if (page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs.length > 0 ? `/admin/orders?${qs}` : "/admin/orders";
}

function buildOrdersExportHref(sp: ListQueryParams): string {
  const qs = listQueryToSearchParams(sp).toString();
  return qs.length > 0 ? `/admin/orders/export?${qs}` : "/admin/orders/export";
}

/** 1-based index; невалідні або відсутні значення → 1 */
function parsePage(raw: string | undefined): number {
  if (typeof raw !== "string" || raw.trim() === "") {
    return 1;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    return 1;
  }
  return n;
}

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

type StatusBadgeTone = "success" | "info" | "warning" | "danger" | "neutral";

const STATUS_BADGE_BASE =
  "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide";

const STATUS_BADGE_TONE: Record<StatusBadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/90",
  info: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/90",
  warning: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/90",
  danger: "bg-red-50 text-red-800 ring-1 ring-red-200/90",
  neutral: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80",
};

function orderStatusTone(s: $Enums.OrderStatus): StatusBadgeTone {
  switch (s) {
    case $Enums.OrderStatus.DELIVERED:
    case $Enums.OrderStatus.SHIPPED:
      return "success";
    case $Enums.OrderStatus.CONFIRMED:
      return "info";
    case $Enums.OrderStatus.PENDING:
    case $Enums.OrderStatus.PROCESSING:
      return "warning";
    case $Enums.OrderStatus.CANCELLED:
    case $Enums.OrderStatus.REFUNDED:
      return "danger";
    default:
      return "neutral";
  }
}

function paymentStatusTone(s: $Enums.PaymentStatus): StatusBadgeTone {
  switch (s) {
    case $Enums.PaymentStatus.PAID:
      return "success";
    case $Enums.PaymentStatus.AUTHORIZED:
      return "info";
    case $Enums.PaymentStatus.PENDING:
      return "warning";
    case $Enums.PaymentStatus.FAILED:
    case $Enums.PaymentStatus.REFUNDED:
    case $Enums.PaymentStatus.PARTIALLY_REFUNDED:
      return "danger";
    default:
      return "neutral";
  }
}

function fulfillmentStatusTone(s: $Enums.FulfillmentStatus): StatusBadgeTone {
  switch (s) {
    case $Enums.FulfillmentStatus.FULFILLED:
      return "success";
    case $Enums.FulfillmentStatus.PARTIALLY_FULFILLED:
      return "info";
    case $Enums.FulfillmentStatus.UNFULFILLED:
      return "warning";
    case $Enums.FulfillmentStatus.CANCELLED:
      return "danger";
    case $Enums.FulfillmentStatus.ON_HOLD:
      return "neutral";
    default:
      return "neutral";
  }
}

function renderStatusBadge(value: string, tone: StatusBadgeTone) {
  return (
    <span
      className={`${STATUS_BADGE_BASE} ${STATUS_BADGE_TONE[tone]}`}
      title={value}
    >
      {value}
    </span>
  );
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const filterSp: FilterSearchParams = {
    q: sp.q,
    status: sp.status,
    paymentStatus: sp.paymentStatus,
    fulfillmentStatus: sp.fulfillmentStatus,
  };
  const { sort: sortField, dir: sortDir } = resolveOrderSort(sp.sort, sp.dir);
  const listSp: ListQueryParams = {
    ...filterSp,
    sort: sortField,
    dir: sortDir,
  };
  const where = buildOrdersWhere(filterSp);

  const hasFilters =
    qRaw.trim().length > 0 ||
    Boolean(
      sp.status?.trim() ||
        sp.paymentStatus?.trim() ||
        sp.fulfillmentStatus?.trim(),
    );

  const [
    summaryPaid,
    summaryUnfulfilled,
    summaryProcessing,
    summaryFulfilled,
    totalCount,
  ] = await Promise.all([
    prisma.order.count({
      where: { paymentStatus: $Enums.PaymentStatus.PAID },
    }),
    prisma.order.count({
      where: { fulfillmentStatus: $Enums.FulfillmentStatus.UNFULFILLED },
    }),
    prisma.order.count({
      where: { status: $Enums.OrderStatus.PROCESSING },
    }),
    prisma.order.count({
      where: { fulfillmentStatus: $Enums.FulfillmentStatus.FULFILLED },
    }),
    prisma.order.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const requestedPage = parsePage(sp.page);
  /** Якщо page > totalPages — показуємо останню валідну сторінку без редіректу */
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const orders = await prisma.order.findMany({
    where,
    orderBy: buildPrismaOrderBy(sortField, sortDir),
    select: {
      id: true,
      orderNumber: true,
      email: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
    },
    skip,
    take: PAGE_SIZE,
  });

  const prevHref = buildOrdersListHref(listSp, currentPage - 1);
  const nextHref = buildOrdersListHref(listSp, currentPage + 1);
  const rangeStart = totalCount === 0 ? 0 : skip + 1;
  const rangeEnd = skip + orders.length;

  const activeQuickPreset = resolveActiveQuickPreset(filterSp);
  const quickItems: Array<{ preset: QuickPreset; label: string }> = [
    { preset: "all", label: "Усі" },
    { preset: "paid", label: "Оплачені" },
    { preset: "unfulfilled", label: "Не виконані" },
    { preset: "processing", label: "В обробці" },
    { preset: "fulfilled", label: "Виконані" },
  ];

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Адмін
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              Замовлення
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {totalCount === 0
                ? hasFilters
                  ? "Нічого не знайдено"
                  : "Замовлень ще немає"
                : hasFilters
                  ? `Знайдено: ${totalCount} · показано ${rangeStart}–${rangeEnd}`
                  : `Усього: ${totalCount} · показано ${rangeStart}–${rangeEnd}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildOrdersExportHref(listSp)}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Експорт CSV
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              На сайт
            </Link>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href={buildQuickFilterHref(qRaw, "paid", listSp)}
            className="block rounded-xl border border-zinc-200/80 bg-white px-3 py-3 shadow-sm outline-none transition-colors hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Оплачені
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">
              {summaryPaid}
            </p>
          </Link>
          <Link
            href={buildQuickFilterHref(qRaw, "unfulfilled", listSp)}
            className="block rounded-xl border border-zinc-200/80 bg-white px-3 py-3 shadow-sm outline-none transition-colors hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Не виконані
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">
              {summaryUnfulfilled}
            </p>
          </Link>
          <Link
            href={buildQuickFilterHref(qRaw, "processing", listSp)}
            className="block rounded-xl border border-zinc-200/80 bg-white px-3 py-3 shadow-sm outline-none transition-colors hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              В обробці
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">
              {summaryProcessing}
            </p>
          </Link>
          <Link
            href={buildQuickFilterHref(qRaw, "fulfilled", listSp)}
            className="block rounded-xl border border-zinc-200/80 bg-white px-3 py-3 shadow-sm outline-none transition-colors hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Виконані
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">
              {summaryFulfilled}
            </p>
          </Link>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Швидкі фільтри
          </p>
          <div className="flex flex-wrap gap-2">
            {quickItems.map(({ preset, label }) => {
              const href = buildQuickFilterHref(qRaw, preset, listSp);
              const active = activeQuickPreset === preset;
              return (
                <Link
                  key={preset}
                  href={href}
                  className={
                    active
                      ? "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                      : "rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <form
          method="get"
          action="/admin/orders"
          className="mb-6 flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="sort" value={sortField} />
          <input type="hidden" name="dir" value={sortDir} />
          <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
            <label htmlFor="q" className="text-xs font-medium text-zinc-600">
              Пошук (номер або email)
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={qRaw}
              placeholder="ORD-… або email"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex min-w-[9rem] flex-col gap-1">
            <label
              htmlFor="status"
              className="text-xs font-medium text-zinc-600"
            >
              Статус замовлення
            </label>
            <select
              id="status"
              name="status"
              defaultValue={sp.status ?? ""}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Усі</option>
              {Object.values($Enums.OrderStatus).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-[9rem] flex-col gap-1">
            <label
              htmlFor="paymentStatus"
              className="text-xs font-medium text-zinc-600"
            >
              Оплата
            </label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={sp.paymentStatus ?? ""}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Усі</option>
              {Object.values($Enums.PaymentStatus).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-[9rem] flex-col gap-1">
            <label
              htmlFor="fulfillmentStatus"
              className="text-xs font-medium text-zinc-600"
            >
              Виконання
            </label>
            <select
              id="fulfillmentStatus"
              name="fulfillmentStatus"
              defaultValue={sp.fulfillmentStatus ?? ""}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Усі</option>
              {Object.values($Enums.FulfillmentStatus).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Застосувати
            </button>
            {hasFilters ? (
              <Link
                href="/admin/orders"
                className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Скинути
              </Link>
            ) : null}
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-600">
                <th className="whitespace-nowrap px-3 py-3 pl-4">
                  <Link
                    href={buildOrdersListHref(
                      {
                        ...listSp,
                        ...nextSortForHeader(
                          { sort: sortField, dir: sortDir },
                          "createdAt",
                        ),
                      },
                      1,
                    )}
                    className="inline-flex items-center gap-1 rounded text-zinc-700 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Створено
                    {sortField === "createdAt" ? (
                      <span className="font-normal text-zinc-400" aria-hidden>
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    ) : null}
                  </Link>
                </th>
                <th className="whitespace-nowrap px-3 py-3">
                  <Link
                    href={buildOrdersListHref(
                      {
                        ...listSp,
                        ...nextSortForHeader(
                          { sort: sortField, dir: sortDir },
                          "orderNumber",
                        ),
                      },
                      1,
                    )}
                    className="inline-flex items-center gap-1 rounded text-zinc-700 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Номер
                    {sortField === "orderNumber" ? (
                      <span className="font-normal text-zinc-400" aria-hidden>
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    ) : null}
                  </Link>
                </th>
                <th className="min-w-[8rem] px-3 py-3">Email</th>
                <th className="whitespace-nowrap px-3 py-3">Статус</th>
                <th className="whitespace-nowrap px-3 py-3">Оплата</th>
                <th className="whitespace-nowrap px-3 py-3">Виконання</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">
                  <Link
                    href={buildOrdersListHref(
                      {
                        ...listSp,
                        ...nextSortForHeader(
                          { sort: sortField, dir: sortDir },
                          "totalAmount",
                        ),
                      },
                      1,
                    )}
                    className="inline-flex w-full items-center justify-end gap-1 rounded text-zinc-700 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Сума
                    {sortField === "totalAmount" ? (
                      <span className="font-normal text-zinc-400" aria-hidden>
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    ) : null}
                  </Link>
                </th>
                <th className="whitespace-nowrap px-3 py-3">Вал.</th>
                <th className="whitespace-nowrap px-3 py-3 pr-4 font-mono text-[11px]">
                  id
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    {hasFilters
                      ? "Нічого не знайдено за цими умовами"
                      : "Замовлень ще немає"}
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const cur = o.currency.trim().toUpperCase() || "USD";
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-zinc-50/80 [&>td]:align-top"
                    >
                      <td className="whitespace-nowrap px-3 py-3 pl-4 tabular-nums text-zinc-700">
                        {o.createdAt.toLocaleString("uk-UA", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-0">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="font-mono text-xs font-medium text-indigo-700 hover:underline"
                          >
                            {o.orderNumber}
                          </Link>
                          <Link
                            href={`/order/${o.id}`}
                            className="text-xs font-medium text-zinc-500 hover:text-indigo-700 hover:underline"
                          >
                            Storefront
                          </Link>
                        </div>
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-3 text-zinc-800">
                        {o.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {renderStatusBadge(
                          o.status,
                          orderStatusTone(o.status),
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {renderStatusBadge(
                          o.paymentStatus,
                          paymentStatusTone(o.paymentStatus),
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {renderStatusBadge(
                          o.fulfillmentStatus,
                          fulfillmentStatusTone(o.fulfillmentStatus),
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-zinc-900">
                        {formatMoney(decimalToNumber(o.totalAmount), cur)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-zinc-700">
                        {cur}
                      </td>
                      <td className="max-w-[7rem] truncate px-3 py-3 pr-4 font-mono text-[10px] text-zinc-500">
                        {o.id}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 ? (
          <nav
            className="mt-4 border-t border-zinc-200/80 pt-4"
            aria-label="Сторінки списку замовлень"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3 text-sm">
              <div className="flex flex-1 justify-start">
                {currentPage <= 1 ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex min-w-[7rem] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-zinc-400"
                  >
                    Попередня
                  </span>
                ) : (
                  <Link
                    href={prevHref}
                    className="inline-flex min-w-[7rem] items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Попередня
                  </Link>
                )}
              </div>
              <p className="shrink-0 tabular-nums text-zinc-600">
                Сторінка {currentPage} з {totalPages}
              </p>
              <div className="flex flex-1 justify-end">
                {currentPage >= totalPages ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex min-w-[7rem] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-zinc-400"
                  >
                    Наступна
                  </span>
                ) : (
                  <Link
                    href={nextHref}
                    className="inline-flex min-w-[7rem] items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Наступна
                  </Link>
                )}
              </div>
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
