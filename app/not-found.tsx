import Link from "next/link";

import { MiroHeader } from "../src/components/miro/miro-header";

export default function NotFoundPage() {
  return (
    <main className="pb-20">
      <MiroHeader />
      <section className="page-shell pt-16">
        <div className="reading-shell surface-panel rounded-[1.8rem] p-8">
          <p className="eyebrow mb-3 text-xs">404</p>
          <h1 className="font-[var(--font-display)] text-4xl tracking-[-0.03em]">
            Эта запись уже растворилась в темноте.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-[color:var(--muted-foreground)]">
            Вернитесь на главную или откройте архив, чтобы снова поймать нить
            наблюдений.
          </p>
          <Link
            className="mt-6 inline-flex rounded-full border border-[color:var(--border-strong)] bg-white/6 px-5 py-3 text-sm hover:bg-white/10"
            href="/"
          >
            Вернуться к ленте
          </Link>
        </div>
      </section>
    </main>
  );
}
