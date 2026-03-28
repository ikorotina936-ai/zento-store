import Link from "next/link";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

const fallback = [
  { slug: "power-stations", name: "Power Stations", blurb: "Станції для дому та офісу" },
  { slug: "powerbanks", name: "Powerbanks", blurb: "Мобільна енергія в дорозі" },
  { slug: "accessories", name: "Accessories", blurb: "Кабелі та аксесуари" },
] as const;

type Props = {
  categories: CategoryRow[];
};

function pickThree(categories: CategoryRow[]) {
  if (categories.length >= 3) {
    return categories.slice(0, 3).map((c, i) => ({
      key: c.id,
      title: c.name,
      blurb:
        c.description?.trim() ||
        fallback[Math.min(i, fallback.length - 1)]!.blurb,
      href: "#catalog",
    }));
  }
  return fallback.map((f) => ({
    key: f.slug,
    title: f.name,
    blurb: f.blurb,
    href: "#catalog",
  }));
}

export function HomeCategories({ categories }: Props) {
  const cards = pickThree(categories);

  return (
    <section
      className="border-b border-white/[0.06] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
      aria-labelledby="home-categories-heading"
    >
      <div className="mx-auto max-w-[90rem]">
        <h2
          id="home-categories-heading"
          className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          Категорії
        </h2>
        <p className="mt-2 max-w-lg text-sm text-zinc-500 sm:text-base">
          Оберіть напрям: станції, powerbank або аксесуари
        </p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {cards.map((card) => (
            <li key={card.key}>
              <Link
                href={card.href}
                className="group block rounded-2xl border border-white/[0.08] bg-gradient-to-br from-zinc-900/80 to-[#0a0a0a] p-8 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/35 hover:shadow-[0_0_48px_-12px_rgba(34,211,238,0.2)]"
              >
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400/70">
                  Категорія
                </span>
                <h3 className="mt-3 text-xl font-semibold text-white transition group-hover:text-cyan-100">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-500">{card.blurb}</p>
                <span className="mt-6 inline-flex text-sm font-medium text-cyan-400/90 transition group-hover:text-cyan-300">
                  До товарів →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
