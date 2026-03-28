import Link from "next/link";

export function HomeFinalCta() {
  return (
    <section
      className="px-5 py-24 sm:px-8 lg:px-12 lg:py-28"
      aria-labelledby="home-final-cta-heading"
    >
      <div className="mx-auto max-w-[90rem]">
        <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-zinc-900/90 via-[#0c1014] to-[#0a0a0a] px-8 py-16 text-center shadow-[0_0_64px_-16px_rgba(34,211,238,0.2)] sm:px-12 sm:py-20">
          <h2
            id="home-final-cta-heading"
            className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            Обери свою станцію вже сьогодні
          </h2>
          <div className="mt-10">
            <Link
              href="#catalog"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-400/10 px-10 py-3.5 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/70 hover:bg-cyan-400/20"
            >
              До каталогу
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
