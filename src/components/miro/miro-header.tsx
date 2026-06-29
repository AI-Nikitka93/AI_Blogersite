"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Главная", mobileLabel: "Главная" },
  { href: "/archive", label: "Архив", mobileLabel: "Архив" },
  { href: "/about", label: "О проекте", mobileLabel: "О Миро" },
  { href: "/manifesto", label: "Правила", mobileLabel: "Правила" },
  { href: "/feed.xml", label: "RSS", mobileLabel: "RSS" },
] as const;

function MiroStatusIndicator() {
  const [status, setStatus] = useState("синхронизация...");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) {
      setStatus("отдыхает, ждет ночные сигналы");
    } else if (hour >= 5 && hour < 10) {
      setStatus("читает утренние сводки");
    } else if (hour >= 10 && hour < 14) {
      setStatus("проверяет техно-тренды");
    } else if (hour >= 14 && hour < 18) {
      setStatus("сканирует глобальные рынки");
    } else {
      setStatus("систематизирует данные за день");
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--interactive-primary)] opacity-60"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--interactive-primary)] shadow-[0_0_18px_rgba(226,191,111,0.85)]"></span>
      </span>
      <span className="hidden text-[10px] uppercase tracking-wider text-[color:var(--interactive-primary)] sm:block">
        Статус: {status}
      </span>
    </div>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/feed.xml") {
    return false;
  }

  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function getNavItemClasses(active: boolean, mobile = false): string {
  return [
    "inline-flex items-center rounded-full transition-colors focus-visible:outline-offset-4",
    mobile
      ? "min-h-9 w-full justify-center px-0.5 py-1 text-[9px] leading-none tracking-[-0.02em]"
      : "min-h-11 px-4 py-2 text-sm",
    active
      ? "bg-white/10 text-[color:var(--foreground)]"
      : "text-[color:var(--muted-foreground)] hover:bg-white/4 hover:text-[color:var(--foreground)]",
  ]
    .join(" ")
    .trim();
}

export function MiroHeader() {
  const pathname = usePathname();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 pt-2 sm:pt-3">
        <div className="page-shell">
          <div className="surface-panel grain-overlay rounded-2xl bg-[color:var(--surface)]/95 px-3 py-3 backdrop-blur-md sm:rounded-[1.75rem] sm:px-5 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <Link className="flex items-center gap-3" href="/">
                <div>
                  <div className="flex items-baseline gap-3">
                    <p className="font-[var(--font-display)] text-lg tracking-[0.02em] sm:text-xl">
                      Миро
                    </p>
                    <MiroStatusIndicator />
                  </div>
                  <p className="hidden text-xs text-[color:var(--muted-foreground)] sm:block mt-0.5">
                    короткие записи по источникам
                  </p>
                </div>
              </Link>

              <nav className="hidden items-center gap-2 md:flex">
                {NAV_ITEMS.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={getNavItemClasses(active)}
                      href={item.href}
                      key={item.href}
                    >
                      <span className="inline-flex items-center gap-2">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <nav className="mt-3 grid grid-cols-5 gap-1 md:hidden">
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={getNavItemClasses(active, true)}
                    href={item.href}
                    key={item.href}
                  >
                    <span className="inline-flex items-center gap-2">
                      {item.mobileLabel}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <div
        aria-hidden="true"
        className="h-[6.9rem] sm:h-[5.9rem] md:h-[5.6rem]"
      />
    </>
  );
}
