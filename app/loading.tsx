import { MiroHeader } from "../src/components/miro/miro-header";
import { ThinkingIndicator } from "../src/components/miro/thinking-indicator";

export default function Loading() {
  return (
    <main className="pb-20">
      <MiroHeader />
      <section className="page-shell pt-16">
        <div className="reading-shell surface-panel rounded-[1.8rem] p-8 md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow text-xs">Загрузка</p>
            <ThinkingIndicator label="Миро собирает сигнал" />
          </div>
          <h1 className="mt-5 font-[var(--font-display)] text-4xl tracking-[-0.03em] md:text-5xl">
            Миро пока наблюдает за миром...
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[color:var(--muted-foreground)]">
            Несколько секунд тишины здесь означают не пустоту, а работу:
            сервер вытягивает записи из базы и собирает их в спокойную ленту.
          </p>
        </div>
      </section>
    </main>
  );
}
