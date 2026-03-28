import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";

import { ProductFormClient } from "../product-form-client";

export const metadata: Metadata = {
  title: "Новий товар — адмін",
  robots: { index: false, follow: false },
};

export default async function AdminNewProductPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const defaults = {
    name: "",
    slug: "",
    sku: "",
    price: "",
    currency: "USD",
    categoryId: "",
    description: "",
    shortDescription: "",
    brand: "",
    stock: 0,
    trackInventory: true,
    isActive: true,
    isFeatured: false,
    requiresShipping: true,
    imageUrl: "",
  };

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/admin/products"
          className="text-sm font-medium text-zinc-600 hover:text-indigo-700"
        >
          ← До списку товарів
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
          Новий товар
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Поля зірочкою (*) обов’язкові. Slug і SKU мають бути унікальними.
        </p>

        <div className="mt-8 rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
          {categories.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Немає активних категорій. Додайте категорію в базі (наприклад через
              Prisma Studio або seed), потім поверніться сюди.
            </p>
          ) : (
            <ProductFormClient
              mode="create"
              categories={categories}
              defaults={defaults}
            />
          )}
        </div>
      </div>
    </div>
  );
}
