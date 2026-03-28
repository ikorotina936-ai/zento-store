import { HomeProductCard, type HomeProductCardData } from "./home-product-card";

type Props = {
  products: HomeProductCardData[];
};

export function HomeFeaturedProducts({ products }: Props) {
  const list = products.slice(0, 6);

  return (
    <section
      id="catalog"
      className="scroll-mt-24 border-b border-white/[0.06] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
      aria-labelledby="home-featured-heading"
    >
      <div className="mx-auto max-w-[90rem]">
        <h2
          id="home-featured-heading"
          className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          Популярні товари
        </h2>
        <p className="mt-2 text-sm text-zinc-500 sm:text-base">
          Обрані позиції з каталогу
        </p>

        {list.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center text-zinc-500">
            Товарів поки немає. Додайте їх у адмінці.
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {list.map((product) => (
              <li key={product.id}>
                <HomeProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
