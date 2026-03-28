"use client";

import { motion, useReducedMotion } from "framer-motion";

import { heroBrandLobster } from "@/lib/fonts/hero-brand-lobster";

/**
 * Stagger: O → T → N → E → Z (індекс у рядку Z-E-N-T-O: 4,3,2,1,0).
 * delay = (letters.length - 1 - i) * STAGGER
 */
const STAGGER = 0.078;

type Props = {
  id: string;
  className: string;
  /** Напр. ["Z", "E", "N", "T", "O"] — анімація зворотного порядку по часу */
  letters: readonly string[];
};

export function HeroBrandTitle({ id, className, letters }: Props) {
  const reduceMotion = useReducedMotion();

  if (letters.length === 0) {
    return (
      <h1 id={id} className={`${heroBrandLobster.className} ${className}`}>
        {""}
      </h1>
    );
  }

  const label = letters.join("");

  if (reduceMotion) {
    return (
      <h1 id={id} className={`${heroBrandLobster.className} ${className}`}>
        {label}
      </h1>
    );
  }

  return (
    <h1 id={id} className={`${heroBrandLobster.className} ${className}`}>
      <span className="sr-only">{label}</span>
      <span
        className="inline-flex flex-wrap items-baseline [&>span]:-mr-[0.02em] [&>span:last-child]:mr-0"
        aria-hidden
      >
        {letters.map((ch, i) => {
          const staggerIndex = letters.length - 1 - i;
          return (
            <motion.span
              key={`${i}-${ch}`}
              className="inline-block"
              initial={{
                opacity: 0,
                x: "0.78em",
                filter: "blur(6px)",
              }}
              animate={{
                opacity: [0, 1, 1],
                x: ["0.78em", "-0.008em", 0],
                filter: ["blur(6px)", "blur(0px)", "blur(0px)"],
              }}
              transition={{
                duration: 1.05,
                delay: staggerIndex * STAGGER,
                times: [0, 0.91, 1],
                ease: [
                  [0.12, 0.9, 0.2, 1],
                  [0.25, 1, 0.3, 1],
                ],
              }}
            >
              {ch}
            </motion.span>
          );
        })}
      </span>
    </h1>
  );
}
