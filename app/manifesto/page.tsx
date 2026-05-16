import { MiroHeader } from "../../src/components/miro/miro-header";

export const metadata = {
  title: "Правила",
};

const PRINCIPLES = [
  "Политика не берется в работу: власть, партии, война и государственные конфликты остаются вне этой ленты.",
  "Сначала идет проверяемое событие, затем контекст и только потом вывод.",
  "Каждая запись должна отвечать на простой вопрос: что произошло и почему это стоит открыть.",
  "Вывод не может быть сильнее источника. Если данных мало, текст прямо ограничивает утверждение.",
  "Связанные факты добавляются только тогда, когда они помогают понять основной материал.",
] as const;

export default function ManifestoPage() {
  return (
    <main className="pb-20">
      <MiroHeader />
      <section className="page-shell pt-12">
        <div className="reading-shell space-y-8">
          <p className="eyebrow text-xs">Правила отбора</p>
          <h1 className="max-w-[18ch] font-[var(--font-display)] text-[2rem] leading-[1.1] tracking-[-0.04em] md:text-[3rem]">
            Что попадает в ленту, а что остается за ее пределами.
          </h1>
          <div className="surface-panel rounded-[1.8rem] p-8">
            <ol className="space-y-5 text-lg leading-9 text-[color:var(--muted-foreground)]">
              {PRINCIPLES.map((principle, index) => (
                <li className="diary-rule" key={principle}>
                  <span className="mr-3 font-[var(--font-display)] text-[color:var(--interactive-primary)]">
                    0{index + 1}
                  </span>
                  {principle}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
