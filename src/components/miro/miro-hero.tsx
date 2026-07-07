"use client";

import { motion } from "framer-motion";

import { Button } from "../ui/button";

const READING_NOTES = [
  "В начале каждой записи стоит конкретный источник и дата события.",
  "Дальше идут короткий пересказ, контекст и предел того, что можно утверждать.",
  "Связанные факты добавляются только тогда, когда они помогают понять материал.",
] as const;

type MiroHeroProps = {
  compact?: boolean;
  headingLevel?: "h1" | "h2";
};

export function MiroHero({
  compact = false,
  headingLevel = "h1",
}: MiroHeroProps) {
  const HeadingTag = headingLevel;

  return (
    <section
      className={[
        "page-shell relative",
        compact ? "pt-10 md:pt-12" : "pt-10 md:pt-14",
      ]
        .join(" ")
        .trim()}
    >
      <motion.div
        className={[
          "surface-panel grain-overlay overflow-hidden rounded-[1.65rem]",
          compact ? "p-5 md:p-7 xl:p-8" : "p-6 md:p-8 xl:p-10",
        ]
          .join(" ")
          .trim()}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{
          hidden: { opacity: 0, y: 18 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
        }}
      >
        <div
          className={[
            "hero-orb absolute right-8 top-8 hidden rounded-full border border-white/8 blur-2xl md:block",
            compact ? "h-20 w-20" : "h-28 w-28",
          ]
            .join(" ")
            .trim()}
        />
        {!compact ? (
          <div className="hero-orb hero-orb-secondary absolute bottom-10 left-[34%] hidden h-24 w-24 rounded-full blur-3xl lg:block" />
        ) : null}
        <p className="eyebrow mb-4 text-xs">Редакционный формат</p>
        <div
          className={[
            "grid lg:grid-cols-[minmax(0,0.92fr)_minmax(18rem,1.08fr)]",
            compact ? "gap-5 xl:gap-7" : "gap-7 xl:gap-9",
          ]
            .join(" ")
            .trim()}
        >
          <div className={compact ? "space-y-4" : "space-y-6"}>
            <HeadingTag
              className={[
                "max-w-[13ch] text-balance font-[var(--font-display)] leading-[1.02] tracking-[-0.045em]",
                compact
                  ? "text-[clamp(2rem,4.2vw,3.35rem)]"
                  : "text-[clamp(2.35rem,4.9vw,4.15rem)]",
              ]
                .join(" ")
                .trim()}
            >
              Сначала источник, потом вывод.
            </HeadingTag>
            <p
              className={[
                "max-w-xl text-[color:var(--muted-foreground)]",
                compact
                  ? "text-[0.98rem] leading-7 md:text-base"
                  : "text-base leading-8 md:text-[1.03rem]",
              ]
                .join(" ")
                .trim()}
            >
              Здесь нет общей сводки. В запись попадает только то, что можно
              привязать к источнику, дате и понятной причине публикации.
            </p>
            <div className="flex flex-wrap gap-2.5 text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
              <span className="hero-chip">до 5 записей в день</span>
              <span className="hero-chip">без политики</span>
              <span className="hero-chip">коротко и по делу</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href="/archive">Открыть архив</Button>
              <Button href="/manifesto" variant="secondary">
                Правила отбора
              </Button>
            </div>
          </div>

            <div className={compact ? "space-y-3.5" : "space-y-4"}>
            <p className="eyebrow text-xs">Как устроена запись</p>
            <div className="grid gap-3">
              {READING_NOTES.map((note, index) => (
                <div
                  className={[
                    "rounded-[1.05rem] border border-white/6 bg-black/10 px-4",
                    compact ? "py-3" : "py-3.5",
                  ]
                    .join(" ")
                    .trim()}
                  key={note}
                >
                  <p className="eyebrow mb-2 text-[11px]">0{index + 1}</p>
                  <p className="text-[0.92rem] leading-6 text-[color:var(--muted-foreground)]">
                    {note}
                  </p>
                </div>
              ))}
            </div>
            <p className="diary-rule text-sm leading-7 text-[color:var(--muted-foreground)]">
              Если источники не дают нормальной опоры, новая запись не выходит.
              Пустое место лучше пересказа ради расписания.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
