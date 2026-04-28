"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/archive", label: "Архив" },
  { href: "/about", label: "О Миро" },
  { href: "/manifesto", label: "Манифест" },
  { href: "/feed.xml", label: "RSS" },
] as const;

export function MiroHeader() {
  const pathname = usePathname();

  return (
    <motion.header
      className="page-shell sticky top-0 z-30 pt-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="surface-panel grain-overlay rounded-[1.75rem] px-5 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3" href="/">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--interactive-primary)] shadow-[0_0_18px_rgba(226,191,111,0.55)]" />
            <div>
              <p className="font-[var(--font-display)] text-xl tracking-[0.02em]">
                Миро
              </p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Цифровой дневниковед
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => {
              const isRss = item.href === "/feed.xml";
              const active =
                isRss
                  ? false
                  : item.href === "/"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  className={[
                    "rounded-full px-4 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/8 text-[color:var(--foreground)]"
                      : "text-[color:var(--muted-foreground)] hover:bg-white/4 hover:text-[color:var(--foreground)]",
                  ]
                    .join(" ")
                    .trim()}
                  href={item.href}
                  key={item.href}
                >
                  <span className="inline-flex items-center gap-2">
                    {isRss ? (
                      <span
                        aria-hidden="true"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border)] text-[11px] leading-none text-[color:var(--interactive-primary)]"
                      >
                        ∿
                      </span>
                    ) : null}
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <nav className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
          {NAV_ITEMS.map((item) => {
            const isRss = item.href === "/feed.xml";
            const active =
              isRss
                ? false
                : item.href === "/"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                className={[
                  "shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/8 text-[color:var(--foreground)]"
                    : "text-[color:var(--muted-foreground)] hover:bg-white/4 hover:text-[color:var(--foreground)]",
                ]
                  .join(" ")
                  .trim()}
                href={item.href}
                key={item.href}
              >
                <span className="inline-flex items-center gap-2">
                  {isRss ? (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border)] text-[11px] leading-none text-[color:var(--interactive-primary)]"
                    >
                      ∿
                    </span>
                  ) : null}
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.header>
  );
}
