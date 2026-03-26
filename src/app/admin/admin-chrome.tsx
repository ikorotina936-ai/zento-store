"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full">
      <div className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <Link
              href="/admin/orders"
              className="text-zinc-700 hover:text-indigo-700"
            >
              Замовлення
            </Link>
          </nav>
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Вийти
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
