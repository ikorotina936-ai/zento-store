"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import {
  createProduct,
  importProductFromUrl,
  updateProduct,
  type ProductFormState,
} from "./actions";

export type AdminCategoryOption = { id: string; name: string };

export type ProductFormDefaults = {
  productId?: string;
  name: string;
  slug: string;
  sku: string;
  price: string;
  currency: string;
  categoryId: string;
  description: string;
  shortDescription: string;
  brand: string;
  stock: number;
  trackInventory: boolean;
  isActive: boolean;
  isFeatured: boolean;
  requiresShipping: boolean;
  imageUrl: string;
};

type ValuesNoPrice = Omit<ProductFormDefaults, "price">;

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "text-xs font-medium text-zinc-600";

function boolSelectValue(v: boolean): string {
  return v ? "true" : "false";
}

function splitDefaults(d: ProductFormDefaults): {
  rest: ValuesNoPrice;
  price: string;
} {
  const { price, ...rest } = d;
  return { rest, price };
}

type Props = {
  mode: "create" | "edit";
  categories: AdminCategoryOption[];
  defaults: ProductFormDefaults;
};

export function ProductFormClient({ mode, categories, defaults }: Props) {
  const { rest: initialRest, price: initialPrice } = splitDefaults(defaults);
  const [values, setValues] = useState<ValuesNoPrice>(initialRest);
  const [price, setPrice] = useState(initialPrice);

  useEffect(() => {
    const { rest, price: p } = splitDefaults(defaults);
    setValues(rest);
    setPrice(p);
  }, [defaults.productId]);

  const action = mode === "create" ? createProduct : updateProduct;
  const [state, formAction, pending] = useActionState<
    ProductFormState | null,
    FormData
  >(action, null);

  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importBanner, setImportBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  async function handleImportFromUrl() {
    if (mode !== "create") return;
    setImportBanner(null);
    if (!importUrl.trim()) {
      setImportBanner({ kind: "err", text: "Вставте посилання на товар." });
      return;
    }
    setImportLoading(true);
    try {
      const res = await importProductFromUrl(importUrl.trim());
      if (!res.ok) {
        setImportBanner({ kind: "err", text: res.message });
        return;
      }
      setValues((prev) => ({
        ...prev,
        name: res.data.name,
        slug: res.data.slug,
        sku: res.data.sku || prev.sku,
        description: res.data.description,
        shortDescription: res.data.shortDescription,
        brand: res.data.brand,
        imageUrl: res.data.imageUrl,
        stock: res.data.stock,
        trackInventory: res.data.trackInventory,
        ...(res.data.currency ? { currency: res.data.currency } : {}),
      }));
      setImportBanner({
        kind: "ok",
        text: "Дані підтягнуто. Перевірте поля та введіть ціну вручну.",
      });
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && values.productId ? (
        <input type="hidden" name="productId" value={values.productId} />
      ) : null}

      {mode === "create" ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
            Імпорт з посилання
          </p>
          <p className="mt-1 text-sm text-indigo-900/80">
            Вставте URL сторінки товару — спробуємо підтягнути назву, опис, фото,
            slug, SKU тощо. Ціна не змінюється автоматично.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="import-product-url" className={labelClass}>
                Посилання на товар
              </label>
              <input
                id="import-product-url"
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className={`${inputClass} mt-1 w-full`}
                placeholder="https://…"
                disabled={importLoading}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleImportFromUrl()}
              disabled={importLoading}
              className="shrink-0 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
            >
              {importLoading ? "Завантаження…" : "Заповнити автоматично"}
            </button>
          </div>
          {importBanner ? (
            <div
              className={
                importBanner.kind === "ok"
                  ? "mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                  : "mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              }
              role="status"
            >
              {importBanner.text}
            </div>
          ) : null}
        </div>
      ) : null}

      {state?.ok === false ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="name" className={labelClass}>
            Назва <span className="text-red-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={values.name}
            onChange={(e) =>
              setValues((v) => ({ ...v, name: e.target.value }))
            }
            className={inputClass}
            maxLength={500}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="slug" className={labelClass}>
            Slug <span className="text-red-600">*</span>
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            value={values.slug}
            onChange={(e) =>
              setValues((v) => ({ ...v, slug: e.target.value }))
            }
            className={inputClass}
            maxLength={500}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sku" className={labelClass}>
            SKU <span className="text-red-600">*</span>
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            required
            value={values.sku}
            onChange={(e) =>
              setValues((v) => ({ ...v, sku: e.target.value }))
            }
            className={inputClass}
            maxLength={120}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="price" className={labelClass}>
            Ціна <span className="text-red-600">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="text"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            inputMode="decimal"
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="currency" className={labelClass}>
            Валюта (код, 3 літери)
          </label>
          <input
            id="currency"
            name="currency"
            type="text"
            value={values.currency}
            onChange={(e) =>
              setValues((v) => ({ ...v, currency: e.target.value }))
            }
            className={inputClass}
            maxLength={3}
            placeholder="USD"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="categoryId" className={labelClass}>
            Категорія <span className="text-red-600">*</span>
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            value={values.categoryId}
            onChange={(e) =>
              setValues((v) => ({ ...v, categoryId: e.target.value }))
            }
            className={inputClass}
          >
            <option value="">— Оберіть —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="imageUrl" className={labelClass}>
            URL основного зображення
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            value={values.imageUrl}
            onChange={(e) =>
              setValues((v) => ({ ...v, imageUrl: e.target.value }))
            }
            className={inputClass}
            placeholder="https://…"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="shortDescription" className={labelClass}>
            Короткий опис
          </label>
          <input
            id="shortDescription"
            name="shortDescription"
            type="text"
            value={values.shortDescription}
            onChange={(e) =>
              setValues((v) => ({ ...v, shortDescription: e.target.value }))
            }
            className={inputClass}
            maxLength={2000}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="description" className={labelClass}>
            Опис
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={values.description}
            onChange={(e) =>
              setValues((v) => ({ ...v, description: e.target.value }))
            }
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="brand" className={labelClass}>
            Бренд
          </label>
          <input
            id="brand"
            name="brand"
            type="text"
            value={values.brand}
            onChange={(e) =>
              setValues((v) => ({ ...v, brand: e.target.value }))
            }
            className={inputClass}
            maxLength={255}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="stock" className={labelClass}>
            Залишок на складі
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min={0}
            value={values.stock}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                stock: Number.parseInt(e.target.value, 10) || 0,
              }))
            }
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="trackInventory" className={labelClass}>
            Відстежувати залишки
          </label>
          <select
            id="trackInventory"
            name="trackInventory"
            value={boolSelectValue(values.trackInventory)}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                trackInventory: e.target.value === "true",
              }))
            }
            className={inputClass}
          >
            <option value="true">Так</option>
            <option value="false">Ні</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="isActive" className={labelClass}>
            Активний (у каталозі)
          </label>
          <select
            id="isActive"
            name="isActive"
            value={boolSelectValue(values.isActive)}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                isActive: e.target.value === "true",
              }))
            }
            className={inputClass}
          >
            <option value="true">Так</option>
            <option value="false">Ні</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="isFeatured" className={labelClass}>
            Рекомендований
          </label>
          <select
            id="isFeatured"
            name="isFeatured"
            value={boolSelectValue(values.isFeatured)}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                isFeatured: e.target.value === "true",
              }))
            }
            className={inputClass}
          >
            <option value="true">Так</option>
            <option value="false">Ні</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="requiresShipping" className={labelClass}>
            Потрібна доставка
          </label>
          <select
            id="requiresShipping"
            name="requiresShipping"
            value={boolSelectValue(values.requiresShipping)}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                requiresShipping: e.target.value === "true",
              }))
            }
            className={inputClass}
          >
            <option value="true">Так</option>
            <option value="false">Ні</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          Зберегти
        </button>
        <Link
          href="/admin/products"
          className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Скасувати
        </Link>
      </div>
    </form>
  );
}
