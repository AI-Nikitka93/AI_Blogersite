import Link from "next/link";

import { MiroHeader } from "../../src/components/miro/miro-header";
import { QuietState } from "../../src/components/miro/quiet-state";
import { CATEGORY_LABELS, formatDate, listArchiveDays } from "../../src/lib/posts";

export const metadata = {
  title: "Архив",
};

export default async function ArchivePage() {
  let archiveDays = [] as Awaited<ReturnType<typeof listArchiveDays>>;
  let loadError: string | null = null;

  try {
    archiveDays = await listArchiveDays();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unknown archive loading error.";
  }

  return (
    <main className="pb-20">
      <MiroHeader />
      <section className="page-shell pt-12">
        <div className="space-y-8">
          <div className="reading-shell">
            <p className="eyebrow mb-3 text-xs">Архив</p>
            <h1 className="font-[var(--font-display)] text-4xl tracking-[-0.03em] md:text-6xl">
              Даты, к которым хочется вернуться.
            </h1>
          </div>

          {loadError ? (
            <QuietState
              actionHref="/"
              actionLabel="Вернуться к главной"
              description="Архив не успел вернуть записи из базы. Лента и архив используют один источник, поэтому через мгновение они снова синхронизируются."
              title="Архив сейчас дышит слишком тихо."
            />
          ) : archiveDays.length > 0 ? (
            <div className="space-y-5">
              {archiveDays.map((day) => (
                <section
                  className="surface-panel rounded-[1.6rem] p-6 md:p-8"
                  key={day.date}
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="font-[var(--font-display)] text-2xl">
                      {formatDate(day.date, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </h2>
                    <span className="text-sm text-[color:var(--muted-foreground)]">
                      {day.posts.length} записей
                    </span>
                  </div>
                  <div className="space-y-4">
                    {day.posts.map((post) => (
                      <Link
                        className="block rounded-[1.25rem] border border-white/6 bg-white/3 px-5 py-4 transition-colors hover:border-[color:var(--border-strong)] hover:bg-white/5"
                        href={`/post/${post.id}`}
                        key={post.id}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-[var(--font-display)] text-xl">
                            {post.title}
                          </h3>
                          <span className="text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
                            {CATEGORY_LABELS[post.category]}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <QuietState
              actionHref="/"
              actionLabel="Вернуться к ленте"
              description="Архив пока пуст, потому что Миро еще не накопил достаточное количество записей. После следующих публикаций здесь появятся даты, к которым можно возвращаться."
              title="Архив только начинает запоминать дни."
            />
          )}
        </div>
      </section>
    </main>
  );
}
