"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteProduct } from "./actions";

type Props = { id: string; name: string };

export function DeleteProductButton({ id, name }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!confirm(`Видалити товар «${name}»? Дію неможливо скасувати.`)) {
      return;
    }
    setPending(true);
    const res = await deleteProduct(id);
    setPending(false);
    if (!res.ok) {
      alert(res.message);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "…" : "Видалити"}
    </button>
  );
}
