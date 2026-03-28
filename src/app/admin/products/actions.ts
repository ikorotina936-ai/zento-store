"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fetchProductPageHtml } from "@/lib/admin/product-url-import/fetch-page";
import { scrapeProductFromHtml } from "@/lib/admin/product-url-import/scrape-html";
import { slugifyFromName } from "@/lib/admin/product-url-import/slugify";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

export type ProductFormState =
  | { ok: true }
  | { ok: false; message: string };

function getStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function getBoolStr(fd: FormData, key: string, defaultVal: boolean): boolean {
  const v = fd.get(key);
  if (typeof v !== "string") return defaultVal;
  return v === "true";
}

function getInt(fd: FormData, key: string, defaultVal: number): number {
  const v = fd.get(key);
  if (typeof v !== "string" || v.trim() === "") return defaultVal;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : defaultVal;
}

function parsePrice(raw: string): { decimal: Prisma.Decimal } | { error: string } {
  const t = raw.trim().replace(",", ".");
  if (t === "") return { error: "Вкажіть ціну." };
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return { error: "Некоректна ціна." };
  try {
    return { decimal: new Prisma.Decimal(n) };
  } catch {
    return { error: "Некоректна ціна." };
  }
}

async function syncPrimaryImage(productId: string, imageUrl: string) {
  const url = imageUrl.trim();
  await prisma.productImage.deleteMany({ where: { productId } });
  if (url.length > 0) {
    await prisma.productImage.create({
      data: { productId, url, sortOrder: 0 },
    });
  }
}

export async function createProduct(
  _prev: ProductFormState | null,
  formData: FormData,
): Promise<ProductFormState> {
  const name = getStr(formData, "name");
  const slug = getStr(formData, "slug");
  const sku = getStr(formData, "sku");
  const categoryId = getStr(formData, "categoryId");
  const priceRaw = getStr(formData, "price");
  const currencyRaw = getStr(formData, "currency");
  const currencyCode =
    (currencyRaw.length >= 3 ? currencyRaw.slice(0, 3) : currencyRaw || "USD").toUpperCase() ||
    "USD";

  if (!name) return { ok: false, message: "Вкажіть назву." };
  if (!slug) return { ok: false, message: "Вкажіть slug." };
  if (!sku) return { ok: false, message: "Вкажіть SKU." };
  if (!categoryId) return { ok: false, message: "Оберіть категорію." };

  const priceResult = parsePrice(priceRaw);
  if ("error" in priceResult) return { ok: false, message: priceResult.error };

  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) return { ok: false, message: "Категорія не знайдена." };

  const description = getStr(formData, "description") || null;
  const shortDescription = getStr(formData, "shortDescription") || null;
  const brand = getStr(formData, "brand") || null;

  if ((shortDescription ?? "").length > 2000) {
    return { ok: false, message: "Короткий опис занадто довгий (макс. 2000 символів)." };
  }

  const stock = getInt(formData, "stock", 0);
  const trackInventory = getBoolStr(formData, "trackInventory", true);
  const isActive = getBoolStr(formData, "isActive", true);
  const isFeatured = getBoolStr(formData, "isFeatured", false);
  const requiresShipping = getBoolStr(formData, "requiresShipping", true);
  const imageUrl = getStr(formData, "imageUrl");

  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        price: priceResult.decimal,
        currency: currencyCode,
        categoryId,
        description,
        shortDescription,
        brand,
        stock,
        trackInventory,
        isActive,
        isFeatured,
        requiresShipping,
      },
    });
    await syncPrimaryImage(product.id, imageUrl);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const meta = e.meta as { target?: string[] } | undefined;
      const t = meta?.target?.join(", ") ?? "";
      if (t.includes("slug")) return { ok: false, message: "Товар з таким slug вже існує." };
      if (t.includes("sku")) return { ok: false, message: "Товар з таким SKU вже існує." };
      return { ok: false, message: "Порушено унікальність поля (slug або SKU)." };
    }
    console.error(e);
    return { ok: false, message: "Помилка збереження." };
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(
  _prev: ProductFormState | null,
  formData: FormData,
): Promise<ProductFormState> {
  const id = getStr(formData, "productId");
  if (!id) return { ok: false, message: "Відсутній id товару." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Товар не знайдено." };

  const name = getStr(formData, "name");
  const slug = getStr(formData, "slug");
  const sku = getStr(formData, "sku");
  const categoryId = getStr(formData, "categoryId");
  const priceRaw = getStr(formData, "price");
  const currencyRaw = getStr(formData, "currency");
  const currencyCode =
    (currencyRaw.length >= 3 ? currencyRaw.slice(0, 3) : currencyRaw || "USD").toUpperCase() ||
    "USD";

  if (!name) return { ok: false, message: "Вкажіть назву." };
  if (!slug) return { ok: false, message: "Вкажіть slug." };
  if (!sku) return { ok: false, message: "Вкажіть SKU." };
  if (!categoryId) return { ok: false, message: "Оберіть категорію." };

  const priceResult = parsePrice(priceRaw);
  if ("error" in priceResult) return { ok: false, message: priceResult.error };

  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) return { ok: false, message: "Категорія не знайдена." };

  const description = getStr(formData, "description") || null;
  const shortDescription = getStr(formData, "shortDescription") || null;
  const brand = getStr(formData, "brand") || null;

  if ((shortDescription ?? "").length > 2000) {
    return { ok: false, message: "Короткий опис занадто довгий (макс. 2000 символів)." };
  }

  const stock = getInt(formData, "stock", 0);
  const trackInventory = getBoolStr(formData, "trackInventory", true);
  const isActive = getBoolStr(formData, "isActive", true);
  const isFeatured = getBoolStr(formData, "isFeatured", false);
  const requiresShipping = getBoolStr(formData, "requiresShipping", true);
  const imageUrl = getStr(formData, "imageUrl");

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        sku,
        price: priceResult.decimal,
        currency: currencyCode,
        categoryId,
        description,
        shortDescription,
        brand,
        stock,
        trackInventory,
        isActive,
        isFeatured,
        requiresShipping,
      },
    });
    await syncPrimaryImage(id, imageUrl);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, message: "Порушено унікальність slug або SKU." };
    }
    console.error(e);
    return { ok: false, message: "Помилка збереження." };
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath(`/products/${slug}`);
  redirect("/admin/products");
}

export type ImportProductFromUrlResult =
  | {
      ok: true;
      data: {
        name: string;
        slug: string;
        sku: string;
        description: string;
        shortDescription: string;
        brand: string;
        imageUrl: string;
        stock: number;
        trackInventory: boolean;
        currency?: string;
      };
    }
  | { ok: false; message: string };

async function ensureUniqueProductSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 0;
  for (;;) {
    const ex = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!ex) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

/** Імпорт метаданих товару з HTML сторінки (без ціни). Тільки для адмінки. */
export async function importProductFromUrl(
  rawUrl: string,
): Promise<ImportProductFromUrlResult> {
  const urlTrim = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!urlTrim) {
    return { ok: false, message: "Вставте посилання на товар." };
  }
  try {
    const { finalUrl, html } = await fetchProductPageHtml(urlTrim);
    const scraped = scrapeProductFromHtml(html, finalUrl.href);
    if (!scraped.name.trim()) {
      return {
        ok: false,
        message:
          "Не вдалося визначити назву товару (немає JSON-LD Product / достатніх meta). Спробуйте іншу сторінку або заповніть вручну.",
      };
    }
    const slug = await ensureUniqueProductSlug(slugifyFromName(scraped.name));
    return {
      ok: true,
      data: {
        name: scraped.name.trim(),
        slug,
        sku: scraped.sku.trim(),
        description: scraped.description.trim(),
        shortDescription: scraped.shortDescription.trim(),
        brand: scraped.brand.trim(),
        imageUrl: scraped.imageUrl.trim(),
        stock: scraped.stock ?? 0,
        trackInventory: scraped.trackInventory ?? true,
        ...(scraped.currency ? { currency: scraped.currency } : {}),
      },
    };
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "Не вдалося завантажити сторінку. Сайт може блокувати автоматичні запити.";
    return { ok: false, message: msg };
  }
}

export async function deleteProduct(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = id.trim();
  if (!trimmed) return { ok: false, message: "Невірний id." };

  try {
    await prisma.product.delete({ where: { id: trimmed } });
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      message:
        "Не вдалося видалити товар. Можливі зв’язки в БД або товар уже видалено.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  return { ok: true };
}
