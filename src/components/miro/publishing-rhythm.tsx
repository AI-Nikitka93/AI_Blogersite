import Link from "next/link";

import {
  MIRO_DAILY_SLOT_TIMES,
  getMiroScheduleOverview,
  MIRO_SCHEDULE_TIMEZONE,
} from "../../lib/miro-schedule";

export function PublishingRhythm({ compact = false }: { compact?: boolean }) {
  const overview = getMiroScheduleOverview();
  const slotTimes = MIRO_DAILY_SLOT_TIMES.join(", ");
  const nextReference =
    overview.decision.kind === "publish"
      ? `${overview.decision.slot.weekday_label}, ${overview.decision.slot.window_label.toLowerCase()}: ${overview.decision.slot.track_label}.`
      : `${overview.decision.next_slot.weekday_label}, ${overview.decision.next_slot.window_label.toLowerCase()}: ${overview.decision.next_slot.track_label}.`;
  const urgentCopy = overview.urgent_status.is_open
    ? "Сильный сигнал можно выпустить вне плана."
    : "Сейчас действует ночная пауза для внеплановых заметок.";

  return (
    <section className="page-shell mt-8 md:mt-10">
      <div
        className={[
          "surface-panel rounded-[1.8rem]",
          compact ? "p-5 md:p-6" : "p-6 md:p-8",
        ]
          .join(" ")
          .trim()}
      >
        <div
          className={[
            "grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start",
            compact ? "gap-5" : "gap-6",
          ]
            .join(" ")
            .trim()}
        >
          <div className="space-y-4">
            <div>
              <p className="eyebrow mb-3 text-xs">Ритм публикаций</p>
              <h2
                className={[
                  "max-w-[15ch] font-[var(--font-display)] tracking-[-0.03em]",
                  compact ? "text-2xl md:text-[2rem]" : "text-3xl md:text-4xl",
                ]
                  .join(" ")
                  .trim()}
              >
                Пять чистых окон в день. Остальное не должно мешать ленте.
              </h2>
            </div>

            <p
              className={[
                "max-w-2xl text-[color:var(--muted-foreground)]",
                compact ? "text-sm leading-7 md:text-[0.95rem]" : "text-base leading-8",
              ]
                .join(" ")
                .trim()}
            >
              На главной достаточно знать только основу: {slotTimes} по Минску.
              Если появляется действительно сильный неполитический сигнал, Миро
              может выйти вне плана до позднего вечера, но ночью намеренно
              молчит.
            </p>

            <div className="flex flex-wrap gap-2">
              {MIRO_DAILY_SLOT_TIMES.map((time) => (
                <span
                  className="rounded-full border border-[color:var(--border)] bg-white/4 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]"
                  key={time}
                >
                  {time}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                className="inline-flex rounded-full border border-[color:var(--border)] bg-white/4 px-4 py-2 transition-colors hover:bg-white/8"
                href="/about"
              >
                Почему Миро не пишет ночью
              </Link>
              <Link
                className="inline-flex rounded-full border border-[color:var(--border)] bg-white/4 px-4 py-2 transition-colors hover:bg-white/8"
                href="/archive"
              >
                Смотреть архив
              </Link>
            </div>
          </div>

          <div
            className={[
              "grid text-sm text-[color:var(--muted-foreground)]",
              compact ? "gap-2.5" : "gap-3",
            ]
              .join(" ")
              .trim()}
          >
            <div className="rounded-[1.35rem] border border-[color:var(--border)] bg-white/4 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                    Плановый ритм
                  </p>
                  <p className="text-base text-[color:var(--foreground)]">
                    Каждый день: {slotTimes}
                  </p>
                  <p className="text-sm leading-6">{MIRO_SCHEDULE_TIMEZONE}</p>
                </div>
                <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  5 окон
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-white/4 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  Следующий ориентир
                </p>
                <p className="mt-2 leading-7 text-[color:var(--foreground)]">
                  {nextReference}
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-white/4 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  Срочный режим
                </p>
                <p className="mt-2 leading-7">
                  {overview.urgent_window_label}. {urgentCopy}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
