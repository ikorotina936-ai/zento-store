import { prisma } from "@/lib/db/prisma";
import { prismaWhereExcludeBlockedProductImages } from "@/lib/store/storefront-image-blocklist";
import { HomeCategories } from "@/components/home/home-categories";
import { HomeFadeIn } from "@/components/home/home-fade-in";
import { HomeFeaturedProducts } from "@/components/home/home-featured-products";
import { HomeFinalCta } from "@/components/home/home-final-cta";
import { HomeHeader } from "@/components/home/home-header";
import { HomeHero } from "@/components/home/home-hero";
import { HomeProblemSolution } from "@/components/home/home-problem-solution";
import { HomeValueTrust } from "@/components/home/home-value-trust";

const storeName =
  (process.env.NEXT_PUBLIC_STORE_NAME ?? "ZENTO").trim() || "ZENTO";

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, ...prismaWhereExcludeBlockedProductImages() },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, description: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 antialiased">
      <HomeHeader storeName={storeName} />
      <main>
        <HomeHero />
        <HomeFadeIn>
          <HomeValueTrust />
        </HomeFadeIn>
        <HomeFadeIn>
          <HomeCategories categories={categories} />
        </HomeFadeIn>
        <HomeFadeIn>
          <HomeFeaturedProducts products={products} />
        </HomeFadeIn>
        <HomeFadeIn>
          <HomeProblemSolution />
        </HomeFadeIn>
        <HomeFadeIn>
          <HomeFinalCta />
        </HomeFadeIn>
      </main>
    </div>
  );
}
