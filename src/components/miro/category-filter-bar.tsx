"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import {
  CATEGORY_LABELS,
  MIRO_CATEGORIES,
  type MiroCategory,
} from "../../lib/posts";

const FILTER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function CategoryFilterBar({
  activeCategory,
}: {
  activeCategory?: MiroCategory;
}) {
  const reduceMotion = useReducedMotion();

  const pillBase =
    "relative rounded-full border px-4 py-2 text-sm transition-colors";

  return (
    <LayoutGroup id="miro-category-filter">
      <motion.div
        className="page-shell mt-8 flex flex-wrap items-center gap-3"
        layout
        transition={
          reduceMotion
            ? { duration: 0.01 }
            : { duration: 0.32, ease: FILTER_EASE }
        }
      >
        <Link
          className={[
            pillBase,
            activeCategory
              ? "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]"
              : "border-[color:var(--border-strong)] text-[color:var(--foreground)]",
          ]
            .join(" ")
            .trim()}
          href="/"
        >
          {!activeCategory ? (
            <motion.span
              className="absolute inset-0 -z-10 rounded-full bg-white/6"
              layoutId={reduceMotion ? undefined : "miro-active-category"}
              transition={{ duration: 0.34, ease: FILTER_EASE }}
            />
          ) : null}
          <span className="relative z-10">Все заметки</span>
        </Link>
        {MIRO_CATEGORIES.map((category) => {
          const active = activeCategory === category;
          return (
            <Link
              className={[
                pillBase,
                active
                  ? "border-[color:var(--border-strong)] text-[color:var(--foreground)]"
                  : "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]",
              ]
                .join(" ")
                .trim()}
              href={`/?category=${category}`}
              key={category}
            >
              {active ? (
                <motion.span
                  className="absolute inset-0 -z-10 rounded-full bg-white/6"
                  layoutId={reduceMotion ? undefined : "miro-active-category"}
                  transition={{ duration: 0.34, ease: FILTER_EASE }}
                />
              ) : null}
              <span className="relative z-10">{CATEGORY_LABELS[category]}</span>
            </Link>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
}
