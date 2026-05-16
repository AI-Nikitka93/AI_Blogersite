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
    ? "Важный материал можно выпустить вне плана."
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
              <p className="eyebrow mb-3 text-xs">Расписание</p>
              <h2
                className={[
                  "max-w-[20ch] font-[var(--font-display)] leading-[1.12] tracking-[-0.035em]",
                  compact ? "text-[1.45rem] md:text-[1.75rem]" : "text-2xl md:text-[2.25rem]",
                ]
                  .join(" ")
                  .trim()}
              >
                До пяти проверок в день. Публикация выходит только при нормальном источнике.
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
              Базовое расписание: {slotTimes} по Минску. Если появляется важный
              неполитический материал, запись может выйти вне плана до позднего
              вечера. Ночью внеплановые публикации закрыты.
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
                Почему есть пауза ночью
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
                    Плановое окно
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
