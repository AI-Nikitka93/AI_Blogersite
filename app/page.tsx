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
      <section className="page-shell mt-8 space-y-6 md:mt-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)] lg:items-end">
          <div>
            <p className="eyebrow mb-3 text-xs">Последние записи</p>
            <h1 className="font-[var(--font-display)] text-3xl tracking-[-0.02em] md:text-4xl">
              {activeCategory
                ? `Заметки: ${CATEGORY_LABELS[activeCategory]}`
                : "Лента наблюдений"}
            </h1>
          </div>
          <div className="space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
            <p className="max-w-md">
              Сначала здесь должен быть контент: свежие записи, которые уже
              прошли через голос Миро и не рассыпались в шум.
            </p>
            <p className="max-w-md">
              Манифест и ритм остались рядом, но теперь они объясняют ленту
              после первого контакта с ней, а не до него.
            </p>
          </div>
        </div>

        <CategoryFilterBar activeCategory={activeCategory} />

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

      <MiroHero compact headingLevel="h2" />
      <PublishingRhythm compact />
    </main>
  );
}
