export function HomeProblemSolution() {
  return (
    <section
      className="relative overflow-hidden border-b border-white/[0.06] px-5 py-24 sm:px-8 lg:px-12 lg:py-28"
      aria-labelledby="home-problem-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.07] via-transparent to-cyan-500/[0.08]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/4 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-cyan-500/[0.06] blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[90rem] text-center">
        <h2
          id="home-problem-heading"
          className="mx-auto max-w-3xl text-2xl font-medium leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl"
        >
          Світло може зникнути у будь-який момент
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
          Будь готовий з нашими зарядними станціями
        </p>
      </div>
    </section>
  );
}
