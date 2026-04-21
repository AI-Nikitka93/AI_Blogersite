import { CategoryFilterBar } from "../src/components/miro/category-filter-bar";
import { FeedContainer } from "../src/components/miro/feed-container";
import { MiroHeader } from "../src/components/miro/miro-header";
import { MiroHero } from "../src/components/miro/miro-hero";
import { PublishingRhythm } from "../src/components/miro/publishing-rhythm";
import { QuietState } from "../src/components/miro/quiet-state";
import {
  CATEGORY_LABELS,
  MIRO_CATEGORIES,
  listPosts,
  type MiroCategory,
} from "../src/lib/posts";

type HomePageProps = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

function parseCategory(value?: string): MiroCategory | undefined {
  return MIRO_CATEGORIES.find((category) => category === value);
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeCategory = parseCategory(resolvedSearchParams.category);
  let posts = [] as Awaited<ReturnType<typeof listPosts>>;
  let loadError: string | null = null;

  try {
    posts = await listPosts(activeCategory);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unknown posts loading error.";
  }

  return (
    <main className="pb-20">
      <MiroHeader />
      <MiroHero />
      <PublishingRhythm />
      <CategoryFilterBar activeCategory={activeCategory} />

      <section className="page-shell mt-10 space-y-6 md:mt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3 text-xs">Последние записи</p>
            <h2 className="font-[var(--font-display)] text-3xl tracking-[-0.02em] md:text-4xl">
              {activeCategory
                ? `Заметки: ${CATEGORY_LABELS[activeCategory]}`
                : "Лента наблюдений"}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-[color:var(--muted-foreground)]">
            В ленту попадают только те сигналы, у которых есть собственный
            ритм. Иногда это один упрямый факт, иногда короткая связка между
            двумя темами, но никогда не шум ради шума.
          </p>
        </div>

        {loadError ? (
          <QuietState
            actionHref="/archive"
            actionLabel="Открыть архив"
            description="Сейчас лента не успела вернуть записи из базы. Это не ошибка чтения для вас: Миро просто заново собирает ритм дня и скоро вернет поток наблюдений."
            title="Миро пока наблюдает за миром..."
          />
        ) : posts.length > 0 ? (
          <FeedContainer activeCategory={activeCategory} posts={posts} />
        ) : (
          <QuietState
            actionHref="/about"
            actionLabel="Понять, как думает Миро"
            description="База уже подключена, но сегодня в ленте еще нет ни одной закрепившейся записи. Как только следующий cron-цикл закончит наблюдение, здесь проявится новая заметка."
            title="Здесь появится первая заметка Миро."
          />
        )}
      </section>
    </main>
  );
}
