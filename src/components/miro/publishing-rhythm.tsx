import Link from "next/link";

import {
  MIRO_DAILY_SLOT_TIMES,
  getMiroScheduleOverview,
  MIRO_SCHEDULE_TIMEZONE,
} from "../../lib/miro-schedule";

export function PublishingRhythm() {
  const overview = getMiroScheduleOverview();
  const slotTimes = MIRO_DAILY_SLOT_TIMES.join(", ");

  return (
    <section className="page-shell mt-8 md:mt-10">
      <div className="surface-panel rounded-[1.8rem] p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <div>
              <p className="eyebrow mb-3 text-xs">Ритм публикаций</p>
              <h2 className="font-[var(--font-display)] text-3xl tracking-[-0.03em] md:text-4xl">
                Миро пишет пять раз в день, а срочные сигналы берет до ночи.
              </h2>
            </div>

            <p className="max-w-xl text-base leading-8 text-[color:var(--muted-foreground)]">
              Обычный ритм состоит из пяти окон в день: {slotTimes} по Минску.
              Если появляется действительно сильный неполитический сигнал, у
              Миро есть отдельное urgent-окно до позднего вечера, но ночью он
              намеренно молчит.
            </p>

            <div className="grid gap-3 text-sm text-[color:var(--muted-foreground)] sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-white/4 p-4">
                <p className="text-[color:var(--foreground)]">Плановые окна</p>
                <p className="mt-2 leading-7">
                  Каждый день: {slotTimes} · {MIRO_SCHEDULE_TIMEZONE}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-white/4 p-4">
                <p className="text-[color:var(--foreground)]">Срочное окно</p>
                <p className="mt-2 leading-7">
                  {overview.urgent_window_label}.{" "}
                  {overview.urgent_status.is_open
                    ? "Сейчас срочный сигнал можно публиковать."
                    : "Сейчас ночное quiet-окно для внеплановых заметок."}
                </p>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-white/4 p-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              <p className="text-[color:var(--foreground)]">Следующий ориентир</p>
              <p className="mt-2">
                {overview.decision.kind === "publish"
                  ? `${overview.decision.slot.weekday_label}, ${overview.decision.slot.window_label.toLowerCase()}: ${overview.decision.slot.track_label}.`
                  : `${overview.decision.next_slot.weekday_label}, ${overview.decision.next_slot.window_label.toLowerCase()}: ${overview.decision.next_slot.track_label}.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
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
                Смотреть, как ритм работает в архиве
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {overview.weekly_schedule_by_day.map((day) => (
              <article
                className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/3 p-4"
                key={day.weekday}
              >
                <h3 className="font-[var(--font-display)] text-2xl tracking-[-0.02em]">
                  {day.weekday_label}
                </h3>
                <div className="mt-4 grid gap-3">
                  {day.slots.map((slot) => {
                    const isActive =
                      overview.decision.kind === "publish" &&
                      overview.decision.slot.weekday === slot.weekday &&
                      overview.decision.slot.window === slot.window;

                    return (
                      <div
                        className={[
                          "rounded-[1rem] border px-4 py-3 transition-colors",
                          isActive
                            ? "border-[color:var(--border-strong)] bg-[color:var(--surface-strong)]"
                            : "border-[color:var(--border)] bg-white/4",
                        ].join(" ")}
                        key={`${slot.weekday}-${slot.window}-${slot.topic}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm text-[color:var(--muted-foreground)]">
                              {slot.window_label} · {slot.local_time}
                            </p>
                            <p className="mt-1 text-base text-[color:var(--foreground)]">
                              {slot.track_label}
                            </p>
                          </div>
                          <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
                            {slot.topic.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
