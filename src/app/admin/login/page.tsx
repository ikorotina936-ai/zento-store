import Link from "next/link";

import { AdminLoginForm } from "./login-form";

import { isAdminAuthConfigured } from "@/lib/admin/admin-auth-config";

export const metadata = {
  title: "Вхід — адмін",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : "";
  const configured = isAdminAuthConfigured();

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-100 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Адмін
        </p>
        <h1 className="mt-1 text-lg font-semibold text-zinc-950">Вхід</h1>
        {!configured ? (
          <p className="mt-3 text-sm text-amber-800">
            Задайте змінні середовища{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">ADMIN_USERNAME</code>{" "}
            та{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">ADMIN_PASSWORD</code>
            . Опційно:{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">
              ADMIN_SESSION_SECRET
            </code>{" "}
            (мін. 16 символів) для окремого ключа підпису cookie.
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            Увійдіть, щоб переглядати замовлення.
          </p>
        )}
        <div className="mt-6">
          <AdminLoginForm from={from} disabled={!configured} />
        </div>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← На сайт
        </Link>
      </div>
    </div>
  );
}
