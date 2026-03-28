import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";

import { DeleteProductButton } from "./delete-product-button";

export const metadata: Metadata = {
  title: "Товари — адмін",
  description: "Каталог товарів",
  robots: { index: false, follow: false },
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

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: { select: { name: true } } },
  });

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Адмін
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
              Товари
            </h1>
          </div>
          <Link
            href="/admin/products/new"
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Додати товар
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-700">Назва</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">Slug</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">SKU</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">Ціна</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">
                    Категорія
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700">Активний</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-zinc-500"
                    >
                      Товарів немає.{" "}
                      <Link
                        href="/admin/products/new"
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        Додати перший
                      </Link>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/80">
                      <td className="max-w-[14rem] truncate px-4 py-3 font-medium text-zinc-900">
                        {p.name}
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 font-mono text-xs text-zinc-600">
                        {p.slug}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-600">
                        {p.sku}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-800">
                        {formatMoney(
                          decimalToNumber(p.price),
                          p.currency,
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {p.category.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            p.isActive
                              ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                              : "inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
                          }
                        >
                          {p.isActive ? "Так" : "Ні"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                          >
                            Редагувати
                          </Link>
                          <DeleteProductButton id={p.id} name={p.name} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
