import { Fragment } from "react";
import Link from "next/link";

const heroTitleText = "Енергія завжди з тобою";
const heroTitleWords = heroTitleText.split(" ");

export function HomeHero() {
  return (
    <section
      className="relative flex min-h-screen flex-col justify-start border-b border-white/[0.06] px-5 pb-20 pt-[12vh] sm:px-8 sm:pt-[16vh] lg:px-12 lg:pt-[20vh]"
      aria-labelledby="home-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.12),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[min(60vh,28rem)] w-[min(90vw,36rem)] translate-x-1/4 rounded-full bg-cyan-500/[0.07] blur-[100px]"
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-[90rem] gap-14 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="flex w-full min-w-0 max-w-xl flex-col items-start space-y-6 text-left">
          <p className="m-0 w-full p-0 text-left indent-0 text-[11px] font-medium uppercase tracking-[0.42em] text-cyan-400/80 sm:text-xs">
            ZENTO Power
          </p>
          <h1
            id="home-hero-title"
            className="m-0 block w-full min-w-0 max-w-[620px] p-0 text-balance text-left indent-0 text-4xl font-semibold leading-[1.2] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[3.5rem]"
          >
            <span className="sr-only">{heroTitleText}</span>
            <div className="group relative block w-full min-w-0 text-left">
              <div
                className="block w-full min-w-0 text-left text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_20px_rgba(34,211,238,0.9)]"
                aria-hidden
              >
                {(() => {
                  let globalIndex = 0;
                  return heroTitleWords.map((word, wi) => (
                    <Fragment key={wi}>
                      <span className="inline-block whitespace-nowrap">
                        {Array.from(word).map((char, ci) => {
                          const delayIndex = globalIndex++;
                          return (
                            <span
                              key={`${wi}-${ci}-${char.charCodeAt(0)}`}
                              className="home-hero-headline-char inline-block whitespace-pre translate-x-10 opacity-0 animate-[slideIn_0.5s_ease-out_forwards]"
                              style={{
                                animationDelay: `${delayIndex * 0.05}s`,
                              }}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </span>
                      {wi < heroTitleWords.length - 1 ? " " : null}
                    </Fragment>
                  ));
                })()}
              </div>
              <span
                className="pointer-events-none absolute inset-0 charge-effect"
                aria-hidden
              />
            </div>
          </h1>
          <p className="m-0 w-full max-w-md p-0 text-left indent-0 text-base leading-relaxed text-zinc-400 sm:text-lg">
            Портативні зарядні станції та powerbank для дому і подорожей
          </p>
          <div className="w-full">
            <Link
              href="#catalog"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-10 py-3.5 text-sm font-semibold text-[#0a0a0a] shadow-[0_0_32px_-4px_rgba(34,211,238,0.45)] transition hover:from-cyan-400 hover:to-sky-400 hover:shadow-[0_0_40px_-2px_rgba(34,211,238,0.55)]"
            >
              Переглянути каталог
            </Link>
          </div>
        </div>

        <div className="relative lg:justify-self-end">
          <div
            className="relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-zinc-900 via-[#0f1419] to-[#0a0a0a] shadow-[0_0_60px_-12px_rgba(34,211,238,0.25)] lg:aspect-square lg:max-w-none"
            aria-label="Візуал продукту або відео"
          >
            <div
              className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.08)_0%,transparent_50%,rgba(16,185,129,0.06)_100%)]"
              aria-hidden
            />
            <div className="relative flex h-full min-h-[14rem] flex-col items-center justify-center gap-4 p-8 text-center sm:min-h-0">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/5 text-cyan-300/90 shadow-[0_0_40px_-8px_rgba(34,211,238,0.35)]"
                aria-hidden
              >
                <svg
                  className="h-12 w-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  aria-hidden
                >
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <p className="max-w-[16rem] text-sm leading-relaxed text-zinc-500">
                Місце для hero-відео або зображення станції / powerbank
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
