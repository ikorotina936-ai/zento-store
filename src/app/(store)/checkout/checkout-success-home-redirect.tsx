"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DELAY_SECONDS = 5;

export function CheckoutSuccessHomeRedirect({
  className,
}: {
  /** Optional tone: e.g. indigo/emerald muted text on success cards */
  className?: string;
}) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(DELAY_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.push("/");
      return;
    }
    const id = window.setTimeout(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft, router]);

  if (secondsLeft <= 0) {
    return null;
  }

  return (
    <p
      className={
        className ??
        "mt-6 text-center text-xs text-zinc-500"
      }
    >
      Redirecting to homepage in {secondsLeft} second
      {secondsLeft === 1 ? "" : "s"}...
    </p>
  );
}
