import { CategoryFilterBar } from "../src/components/miro/category-filter-bar";
import { FeedContainer } from "../src/components/miro/feed-container";
import { MiroHeader } from "../src/components/miro/miro-header";
import { MiroHero } from "../src/components/miro/miro-hero";
import { PublishingRhythm } from "../src/components/miro/publishing-rhythm";
import { QuietState } from "../src/components/miro/quiet-state";
import Link from "next/link";
import {
  CATEGORY_LABELS,
  MIRO_CATEGORIES,
  listPosts,
  formatDate,
  type MiroCategory,
  type PostRow,
} from "../src/lib/posts";

type HomePageProps = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

function parseCategory(value?: string): MiroCategory | undefined {
  return MIRO_CATEGORIES.find((category) => category === value);
}

function getAgeHours(value: string): number {
  return (Date.now() - new Date(value).getTime()) / 3_600_000;
}

function FreshnessStatus({ posts }: { posts: PostRow[] }) {
  const latestPost = posts[0];
  if (!latestPost) {
    return null;
  }

  const ageHours = getAgeHours(latestPost.created_at);
  const stale = ageHours > 24;
  const ageLabel =
    ageHours < 1
      ? "меньше часа назад"
      : ageHours < 24
        ? `${Math.round(ageHours)} ч назад`
        : `${Math.round(ageHours / 24)} д назад`;

  return (
    <div className="border-l border-[color:var(--border-strong)] pl-4 text-sm">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
        Последняя публикация
      </p>
      <p className="mt-1 leading-6 text-[color:var(--foreground)]">
        {formatDate(latestPost.created_at, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        <span className={stale ? "text-amber-200" : "text-[color:var(--muted-foreground)]"}>
          {stale ? `пауза в публикациях, ${ageLabel}` : ageLabel}
        </span>
      </p>
    </div>
  );
}

function selectPinnedPosts(posts: PostRow[]): PostRow[] {
  const seenCategories = new Set<MiroCategory>();

  return posts
    .filter((post) => post.confidence !== "low")
    .filter((post) => {
      if (seenCategories.has(post.category) && seenCategories.size < 3) {
        return false;
      }

      seenCategories.add(post.category);
      return true;
    })
    .slice(0, 5);
}

function PinnedPosts({ posts }: { posts: PostRow[] }) {
  const pinnedPosts = selectPinnedPosts(posts);
  if (pinnedPosts.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-[color:var(--border)] pt-6">
      <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
        <div>
          <p className="eyebrow mb-2 text-xs">Еще записи</p>
          <h2 className="font-[var(--font-display)] text-base leading-snug tracking-[-0.025em] sm:text-lg md:text-xl">
            Материалы из соседних рубрик
          </h2>
        </div>
        <Link
          className="button-shell button-secondary button-compact hidden items-center text-sm sm:inline-flex"
          href="/archive"
        >
          Архив
        </Link>
      </div>
      <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
        {pinnedPosts.map((post, index) => (
          <Link
            className={[
              "group rounded-2xl border border-[color:var(--border)] px-4 py-3 transition-colors hover:border-[color:var(--border-strong)] hover:bg-white/4",
              index > 0 ? "hidden sm:block" : "",
            ]
              .join(" ")
              .trim()}
            href={`/post/${post.id}`}
            key={post.id}
          >
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)] sm:mb-2">
              {CATEGORY_LABELS[post.category]}
            </p>
            <p className="line-clamp-2 text-sm leading-6 text-[color:var(--foreground)] group-hover:text-white">
              {post.title}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)] group-hover:text-[color:var(--foreground)]">
              Читать
              <span aria-hidden="true">-&gt;</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function buildSpotlightFact(post: PostRow): string {
  return post.observed.find((fact) => fact.trim().length > 0) ?? post.inferred;
}

function getSafeSourceUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatSourceDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return formatDate(value, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function MiroNow({ post }: { post?: PostRow }) {
  if (!post) {
    return null;
  }

  const source = post.source?.trim() || "источник сохранен в записи";
  const sourceUrl = getSafeSourceUrl(post.source_url);
  const sourceDate = formatSourceDate(post.source_published_at);
  const confidence =
    post.confidence === "high"
      ? "высокая уверенность"
      : post.confidence === "medium"
        ? "средняя уверенность"
        : "низкая уверенность";

  return (
    <section className="surface-panel rounded-[1.8rem] p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)] lg:items-start">
        <div>
          <p className="eyebrow mb-3 text-xs">Новая запись</p>
          <h2 className="font-[var(--font-display)] text-[1.45rem] leading-[1.14] tracking-[-0.035em] md:text-[1.85rem]">
            {post.title}
          </h2>
          <p className="mt-4 text-base leading-8 text-[color:var(--foreground)]">
            {buildSpotlightFact(post)}
          </p>
        </div>
        <div className="grid gap-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
          <div className="rounded-[1.15rem] border border-white/6 bg-black/10 px-4 py-3">
            <p className="eyebrow mb-2 text-[11px]">Почему опубликовано</p>
            <p>{post.reasoning || "У материала есть источник, дата и проверяемый факт."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs">
              Источник:{" "}
              {sourceUrl ? (
                <a
                  className="text-[color:var(--foreground)] underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/70"
                  href={sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source}
                </a>
              ) : (
                source
              )}
            </span>
            {sourceDate ? (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs">
                Дата источника:{" "}
                {sourceUrl ? (
                  <a
                    className="text-[color:var(--foreground)] underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/70"
                    href={sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {sourceDate}
                  </a>
                ) : (
                  sourceDate
                )}
              </span>
            ) : null}
            <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs">
              {confidence}
            </span>
          </div>
          <Link
            className="button-shell button-primary button-compact inline-flex w-fit items-center text-sm font-medium"
            href={`/post/${post.id}`}
          >
            Читать статью
          </Link>
        </div>
      </div>
    </section>
  );
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

  const latestPost = posts[0];
  const feedPosts = !activeCategory && latestPost ? posts.slice(1) : posts;
  const pinnedPosts = !activeCategory && latestPost ? posts.slice(1) : posts;

  return (
    <main className="pb-20">
      <MiroHeader />
      <section className="page-shell mt-5 space-y-5 sm:space-y-6 md:mt-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)] lg:items-end">
          <div>
            <p className="eyebrow mb-3 text-xs">Последние записи</p>
            <h1 className="font-[var(--font-display)] text-[1.85rem] leading-[1.12] tracking-[-0.035em] md:text-[2.35rem]">
              {activeCategory
                ? `Заметки: ${CATEGORY_LABELS[activeCategory]}`
                : "Свежие записи"}
            </h1>
          </div>
          <div className="space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
            <p className="max-w-md">
              Короткие материалы по свежим источникам: технологии, спорт,
              рынки и нейтральные мировые сюжеты.
            </p>
            <FreshnessStatus posts={posts} />
            <div className="flex flex-wrap gap-3 pt-1">
              {latestPost ? (
                <Link
                  className="button-shell button-primary button-compact inline-flex items-center text-sm font-medium"
                  href={`/post/${latestPost.id}`}
                >
                  Читать свежую запись
                </Link>
              ) : null}
              <Link
                className="button-shell button-secondary button-compact inline-flex items-center text-sm font-medium"
                href="/feed.xml"
              >
                RSS
              </Link>
            </div>
          </div>
        </div>

        <CategoryFilterBar activeCategory={activeCategory} />
        {!activeCategory ? <MiroNow post={latestPost} /> : null}

        {loadError ? (
          <QuietState
            actionHref="/archive"
            actionLabel="Открыть архив"
            description="Сейчас сервер не смог вернуть записи из базы. Лента не пропала навсегда: можно открыть архив, а затем вернуться чуть позже, когда соединение восстановится."
            title="Лента временно не ответила."
          />
        ) : posts.length > 0 ? (
          <>
            {feedPosts.length > 0 ? (
              <FeedContainer
                activeCategory={activeCategory}
                featureFirst={Boolean(activeCategory)}
                posts={feedPosts}
              />
            ) : !activeCategory && latestPost ? (
              <section className="rounded-[1.4rem] border border-[color:var(--border)] px-5 py-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                Сейчас в ленте только свежая запись выше. Следующий материал
                появится здесь после нового успешного запуска.
              </section>
            ) : null}
            {!activeCategory ? <PinnedPosts posts={pinnedPosts} /> : null}
          </>
        ) : (
          <QuietState
            actionHref="/about"
            actionLabel="О проекте"
            description="База подключена, но сейчас нет опубликованных записей. После следующей удачной проверки источников здесь появится новый материал."
            title="Пока нет опубликованных записей."
          />
        )}
      </section>

      <MiroHero compact headingLevel="h2" />
      <PublishingRhythm compact />
    </main>
  );
}
