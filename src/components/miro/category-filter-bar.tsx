"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import {
  CATEGORY_LABELS,
  MIRO_CATEGORIES,
  type MiroCategory,
} from "../../lib/posts";

const FILTER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const MOBILE_CATEGORY_LABELS: Record<MiroCategory, string> = {
  World: "Мир",
  Tech: "ИИ",
  Sports: "Спорт",
  Markets: "Рын",
};

export function CategoryFilterBar({
  activeCategory,
}: {
  activeCategory?: MiroCategory;
}) {
  const reduceMotion = useReducedMotion();

  const pillBase =
    "relative inline-flex min-h-9 w-full min-w-0 items-center justify-center rounded-[0.85rem] border px-1 py-1.5 text-[11px] leading-none transition-colors sm:min-h-10 sm:w-auto sm:justify-start sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm sm:leading-normal";

  return (
    <LayoutGroup id="miro-category-filter">
      <motion.div
        className="mt-2 grid grid-cols-5 items-center gap-1 rounded-[1.2rem] border border-[color:var(--border)] bg-[color:var(--surface)]/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:mt-4 sm:flex sm:flex-wrap sm:gap-1.5 sm:rounded-[1.35rem] sm:p-1.5"
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
              ? "border-transparent text-[color:var(--muted-foreground)] hover:border-[color:var(--border)] hover:bg-white/4 hover:text-[color:var(--foreground)]"
              : "border-[color:var(--interactive-primary)]/45 bg-[color:var(--interactive-primary)]/10 text-[color:var(--foreground)]",
          ]
            .join(" ")
            .trim()}
          aria-current={!activeCategory ? "page" : undefined}
          href="/"
        >
          {!activeCategory ? (
            <motion.span
              className="absolute inset-0 -z-10 rounded-[0.85rem] bg-[color:var(--interactive-primary)]/10"
              layoutId={reduceMotion ? undefined : "miro-active-category"}
              transition={{ duration: 0.34, ease: FILTER_EASE }}
            />
          ) : null}
          <span
            aria-hidden="true"
            className={[
              "relative z-10 hidden h-1.5 w-1.5 rounded-full transition-opacity sm:block",
              activeCategory ? "bg-white/25 opacity-0" : "bg-[color:var(--interactive-primary)] opacity-100",
            ]
              .join(" ")
              .trim()}
          />
          <span className="relative z-10 truncate sm:hidden">Все</span>
          <span className="relative z-10 hidden sm:inline">Все заметки</span>
        </Link>
        {MIRO_CATEGORIES.map((category) => {
          const active = activeCategory === category;
          return (
            <Link
              aria-label={CATEGORY_LABELS[category]}
              className={[
                pillBase,
                active
                  ? "border-[color:var(--interactive-primary)]/45 bg-[color:var(--interactive-primary)]/10 text-[color:var(--foreground)]"
                  : "border-transparent text-[color:var(--muted-foreground)] hover:border-[color:var(--border)] hover:bg-white/4 hover:text-[color:var(--foreground)]",
              ]
                .join(" ")
                .trim()}
              aria-current={active ? "page" : undefined}
              href={`/?category=${category}`}
              key={category}
            >
              {active ? (
                <motion.span
                  className="absolute inset-0 -z-10 rounded-[0.85rem] bg-[color:var(--interactive-primary)]/10"
                  layoutId={reduceMotion ? undefined : "miro-active-category"}
                  transition={{ duration: 0.34, ease: FILTER_EASE }}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={[
                  "relative z-10 hidden h-1.5 w-1.5 rounded-full transition-opacity sm:block",
                  active ? "bg-[color:var(--interactive-primary)] opacity-100" : "bg-white/25 opacity-0",
                ]
                  .join(" ")
                  .trim()}
              />
              <span className="relative z-10 truncate sm:hidden">
                {MOBILE_CATEGORY_LABELS[category]}
              </span>
              <span className="relative z-10 hidden sm:inline">
                {CATEGORY_LABELS[category]}
              </span>
            </Link>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
}
