"use client";

import { useActionState } from "react";

import type { AdminLoginState } from "./actions";
import { adminLogin } from "./actions";

const initialState: AdminLoginState = { ok: true };

type Props = {
  from: string;
  disabled: boolean;
};

export function AdminLoginForm({ from, disabled }: Props) {
  const [state, formAction, pending] = useActionState(adminLogin, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="from" value={from} />
      {!state.ok ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-username" className="text-xs font-medium text-zinc-600">
          Логін
        </label>
        <input
          id="admin-username"
          name="username"
          type="text"
          autoComplete="username"
          required
          disabled={disabled || pending}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-password" className="text-xs font-medium text-zinc-600">
          Пароль
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={disabled || pending}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Вхід…" : "Увійти"}
      </button>
    </form>
  );
}
