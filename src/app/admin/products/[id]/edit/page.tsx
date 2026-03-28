import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db/prisma";

import { ProductFormClient } from "../../product-form-client";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: id?.trim() ?? "" },
    select: { name: true },
  });
  return {
    title: product ? `${product.name} — редагування` : "Товар — адмін",
    robots: { index: false, follow: false },
  };
}

export default async function AdminEditProductPage({ params }: PageProps) {
  const { id } = await params;
  const trimmed = id?.trim() ?? "";
  if (!trimmed) notFound();

  const product = await prisma.product.findUnique({
    where: { id: trimmed },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  if (!product) notFound();

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ isActive: true }, { id: product.categoryId }],
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const primaryImage = product.images[0];

  const defaults = {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    price: product.price.toString(),
    currency: product.currency,
    categoryId: product.categoryId,
    description: product.description ?? "",
    shortDescription: product.shortDescription ?? "",
    brand: product.brand ?? "",
    stock: product.stock,
    trackInventory: product.trackInventory,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    requiresShipping: product.requiresShipping,
    imageUrl: primaryImage?.url ?? "",
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
          Редагування: {product.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Зміни збережуться в каталозі та на головній після збереження.
        </p>

        <div className="mt-8 rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
          {categories.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Немає активних категорій. Активуйте категорію в БД або змініть
              фільтр у коді.
            </p>
          ) : (
            <ProductFormClient
              mode="edit"
              categories={categories}
              defaults={defaults}
            />
          )}
        </div>
      </div>
    </div>
  );
}
