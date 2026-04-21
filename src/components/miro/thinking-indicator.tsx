"use client";

import { motion, useReducedMotion } from "framer-motion";

const PULSE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ThinkingIndicator({
  label = "Миро наблюдает",
}: {
  label?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-label={label}
      className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm text-[color:var(--muted-foreground)]"
      role="status"
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[color:var(--interactive-primary)]"
          animate={
            reduceMotion
              ? { opacity: 0.7 }
              : { opacity: [0.28, 0.72, 0.28], scale: [1, 1.9, 1] }
          }
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : {
                  duration: 1.8,
                  ease: PULSE_EASE,
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        />
        <span className="relative h-2.5 w-2.5 rounded-full bg-[color:var(--interactive-primary)] shadow-[0_0_14px_rgba(226,191,111,0.45)]" />
      </span>
      <span>{label}</span>
    </div>
  );
}
