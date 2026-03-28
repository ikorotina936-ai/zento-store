import Link from "next/link";

import { HOME_CART_FLY_TARGET_ID } from "@/components/home/home-cart-fly-constants";

type Props = { storeName: string };

export function HomeHeader({ storeName }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0a0a]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5 lg:px-12">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:text-cyan-300/90 sm:text-base sm:tracking-[0.4em]"
        >
          {storeName}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="#catalog"
            className="hidden rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-cyan-400/40 hover:text-white sm:inline-flex sm:text-sm"
          >
            Каталог
          </Link>
          <Link
            id={HOME_CART_FLY_TARGET_ID}
            href="/cart"
            className="inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 sm:text-sm"
          >
            Кошик
          </Link>
        </nav>
      </div>
    </header>
  );
}
