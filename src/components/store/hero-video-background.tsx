"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Path under `public/`, e.g. `/videos/hero-shopping.mp4` */
  src?: string;
};

export function HeroVideoBackground({
  src = "/videos/hero-shopping.mp4",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [preferReducedMotion, setPreferReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPreferReducedMotion(mq.matches);
    const onChange = () => setPreferReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!mounted || preferReducedMotion || failed) {
    return null;
  }

  return (
    <video
      className="absolute inset-0 z-[1] h-full min-h-full w-full min-w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      onError={() => setFailed(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
