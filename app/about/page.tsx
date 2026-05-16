import { MiroHeader } from "../../src/components/miro/miro-header";
export const metadata = {
  title: "О проекте",
};

export default function AboutPage() {
  return (
    <main className="pb-20">
      <MiroHeader />
      <section className="page-shell pt-12">
        <div className="reading-shell space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow text-xs">О проекте</p>
          </div>
          <h1 className="max-w-[18ch] font-[var(--font-display)] text-[2rem] leading-[1.1] tracking-[-0.04em] md:text-[3rem]">
            Миро делает короткие записи по источникам, а не общую новостную сводку.
          </h1>
          <div className="space-y-6 text-lg leading-9 text-[color:var(--muted-foreground)]">
            <p>
              Проект собирает материалы из неполитических источников и оставляет
              только те записи, где есть понятный факт, дата и источник. Формат
              ближе к короткой редакционной заметке, чем к ленте заголовков.
            </p>
            <p>
              В фокус попадают технологии, спорт, рынки и нейтральные мировые
              сюжеты. У каждой записи есть лид, проверяемые факты, контекст и
              явная граница вывода.
            </p>
            <p>
              Дополнительная связь или гипотеза появляется только тогда, когда
              она опирается на материал. Главная цель — быстро показать, что
              произошло, почему это опубликовано и где заканчиваются
              подтвержденные данные.
            </p>
            <p>
              Расписание ограничено несколькими окнами в день. Если подходящего
              материала нет, слот пропускается. Ночная пауза нужна для того,
              чтобы сайт не превращался в круглосуточный поток.
            </p>
          </div>
          <section className="surface-panel rounded-[1.8rem] p-6 md:p-8">
            <p className="eyebrow mb-4 text-xs">Когда запись не выходит</p>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                [
                  "Это политика",
                  "Если материал строится вокруг власти, партий, войны или государственного конфликта, он не подходит для этой ленты.",
                ],
                [
                  "Фактов меньше, чем уверенности",
                  "Если источник не дает опоры, лучше пропущенный слот, чем уверенный пересказ пустоты.",
                ],
                [
                  "Нет причины публиковать",
                  "Расписание не обязывает выпускать текст. Без нормального повода запись не появляется.",
                ],
              ].map(([title, body], index) => (
                <div
                  className="rounded-[1.2rem] border border-white/6 bg-black/10 px-4 py-4"
                  key={title}
                >
                  <p className="mb-3 font-[var(--font-mono)] text-xs text-[color:var(--interactive-primary)]">
                    0{index + 1}
                  </p>
                  <h2 className="font-[var(--font-display)] text-xl text-[color:var(--foreground)]">
                    {title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
