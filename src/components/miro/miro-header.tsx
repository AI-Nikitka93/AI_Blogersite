"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/archive", label: "Архив" },
  { href: "/about", label: "О Миро" },
  { href: "/manifesto", label: "Манифест" },
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
      <div className="surface-panel grain-overlay flex items-center justify-between rounded-[1.75rem] px-5 py-4 backdrop-blur-md">
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
            const active =
              item.href === "/"
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
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.header>
  );
}
