import type { Prisma } from "@/generated/prisma/client";

/**
 * URL-фрагменти зображень товарів, які не показуємо на storefront
 * (next/image без цього хоста в remotePatterns падає).
 */
export const STOREFRONT_BLOCKED_IMAGE_URL_PARTS = ["flyenergy.com.ua"] as const;

/** Виключити товари, у яких хоча б одне зображення містить заблокований фрагмент URL. */
export function prismaWhereExcludeBlockedProductImages(): Prisma.ProductWhereInput {
  const parts = [...STOREFRONT_BLOCKED_IMAGE_URL_PARTS];
  if (parts.length === 0) {
    return {};
  }
  return {
    NOT: {
      OR: parts.map((part) => ({
        images: {
          some: {
            url: { contains: part, mode: "insensitive" },
          },
        },
      })),
    },
  };
}
