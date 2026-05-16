import Link from "next/link";

import { ThinkingIndicator } from "./thinking-indicator";

export function QuietState({
  eyebrow = "Пауза публикаций",
  title,
  description,
  actionHref = "/",
  actionLabel = "Вернуться к ленте",
  showIndicator = true,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  showIndicator?: boolean;
}) {
  return (
    <div className="reading-shell surface-panel rounded-[1.8rem] p-8 md:p-10">
      <div className="flex flex-wrap items-center gap-3">
        <p className="eyebrow text-xs">{eyebrow}</p>
        {showIndicator ? <ThinkingIndicator label="Идет проверка" /> : null}
      </div>

      <h2 className="mt-5 font-[var(--font-display)] text-3xl tracking-[-0.03em] md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[color:var(--muted-foreground)]">
        {description}
      </p>

      <Link
        className="button-shell button-primary mt-7 inline-flex min-h-11 items-center px-5 py-3 text-sm font-medium"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
