import Link from "next/link";

import { CategoryBadge } from "./category-badge";
import { MiroHeader } from "./miro-header";
import { formatDate, type PostRow } from "../../lib/posts";
import {
  buildQuickTake,
  getPostOpinion,
  buildSelectionReason,
  getPostModeLabel,
  getPostSupportLabel,
  splitPostParagraphs,
} from "../../lib/miro-post-insights";
import { LocalHistoryTracker } from "./local-history";

const CONFIDENCE_LABELS = {
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
} as const;

const CONFIDENCE_STYLES = {
  high: "border-emerald-200/20 bg-emerald-300/10 text-emerald-100",
  medium: "border-amber-200/20 bg-amber-300/10 text-amber-100",
  low: "border-white/10 bg-white/6 text-[color:var(--foreground)]",
} as const;

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
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

type PostDetailViewProps = {
  post: PostRow;
  confidence?: keyof typeof CONFIDENCE_LABELS;
  reasoning?: string;
};

export async function PostDetailView({
  post,
  confidence: confidenceOverride,
  reasoning: reasoningOverride,
}: PostDetailViewProps) {
  const hasHypothesis = post.hypothesis.trim().length > 0;
  const hasCrossSignal = post.cross_signal.trim().length > 0;
  const articleParagraphs = splitPostParagraphs(post.inferred);
  const quickTake = buildQuickTake(post);
  const personalOpinion = getPostOpinion(post);
  const selectionReason = buildSelectionReason(post);
  const postMode = getPostModeLabel(post);
  const supportLabel = getPostSupportLabel(post);
  const sourceLabel = post.source?.trim() ?? "";
  const sourceUrl = getSafeSourceUrl(post.source_url);
  const sourceDateLabel = formatSourceDate(post.source_published_at);
  const reasoning = reasoningOverride ?? post.reasoning;
  const confidence = confidenceOverride ?? post.confidence;
  const hasReasoning = reasoning.trim().length > 0;
  const hasConfidence = confidence.trim().length > 0;
  const hasSource = sourceLabel.length > 0;
  const confidenceLabel = CONFIDENCE_LABELS[confidence];
  const confidenceStyle = CONFIDENCE_STYLES[confidence];
  const isMarketPost = post.category === "Markets";

  return (
    <main className="pb-20">
      <MiroHeader />
      <LocalHistoryTracker category={post.category} />
      <article className="page-shell pt-12">
        <div className="reading-shell space-y-8 md:space-y-9">
          <header className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <CategoryBadge category={post.category} />
              <span className="text-sm text-[color:var(--muted-foreground)]">
                {formatDate(post.created_at, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h1 className="max-w-[18ch] text-balance break-words font-[var(--font-display)] text-[2rem] leading-[1.08] tracking-[-0.04em] md:text-[2.65rem] xl:text-[3.15rem]">
              {post.title}
            </h1>
          </header>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.95fr)]">
            <div className="space-y-7">
              <section className="surface-panel rounded-[1.8rem] p-6 md:p-7">
                <p className="eyebrow text-xs">Коротко</p>
                <p className="mt-3 text-lg leading-8 text-[color:var(--foreground)] md:text-[1.18rem] md:leading-9">
                  {quickTake}
                </p>
              </section>

              <section className="surface-panel rounded-[1.8rem] p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <p className="eyebrow text-xs text-[color:var(--muted-foreground)] font-bold uppercase tracking-wider">Факты</p>
                  {sourceLabel && (
                    <span className="text-xs bg-[color:var(--surface-soft)] px-2 py-1 rounded font-[var(--font-mono)] text-[color:var(--muted-foreground)]">
                      [Source: {sourceLabel}]
                    </span>
                  )}
                </div>
                <div className="space-y-6 text-[1.18rem] leading-9 md:text-[1.32rem] md:leading-10 text-[color:var(--foreground)]">
                  {(articleParagraphs.length > 0 ? articleParagraphs : [post.inferred]).map(
                    (paragraph, index) => (
                      <p key={`${post.id}-paragraph-${index}`}>{paragraph}</p>
                    ),
                  )}
                </div>
                
                {/* Divider */}
                <div className="my-10 relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-[color:var(--border)]"></div>
                  </div>
                </div>

                {/* Opinion Block */}
                <div className="rounded-[1.2rem] bg-[color:var(--surface-soft)] p-6 md:p-8 border border-[color:var(--border-strong)]">
                  <p className="eyebrow mb-4 text-xs text-[color:var(--muted-foreground)] font-bold uppercase tracking-wider">Мнение Миро</p>
                  <p className="font-serif text-[1.25rem] italic leading-[1.6] text-[color:var(--foreground)] md:text-[1.4rem]">
                    {personalOpinion}
                  </p>
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/65 p-6 md:p-7">
                <p className="eyebrow mb-4 text-xs">Контекст</p>
                <dl className="divide-y divide-white/6">
                  <div className="pb-3 text-sm leading-6">
                    <dt className="eyebrow text-[10px] text-[color:var(--muted-foreground)]">
                      Режим
                    </dt>
                    <dd className="mt-1 text-[color:var(--foreground)]">{postMode}</dd>
                  </div>
                  <div className="py-3 text-sm leading-6">
                    <dt className="eyebrow text-[10px] text-[color:var(--muted-foreground)]">
                      Опора
                    </dt>
                    <dd className="mt-1 text-[color:var(--foreground)]">{supportLabel}</dd>
                  </div>
                  {hasSource ? (
                    <div className="pt-3 text-sm leading-6">
                      <dt className="eyebrow text-[10px] text-[color:var(--muted-foreground)]">
                        Источник
                      </dt>
                      <dd className="mt-1 text-[color:var(--foreground)]">
                        {sourceUrl ? (
                          <a
                            className="underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/70"
                            href={sourceUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {sourceLabel}
                          </a>
                        ) : (
                          sourceLabel
                        )}
                        {sourceDateLabel ? (
                          <span className="mt-1 block text-xs leading-5 text-[color:var(--muted-foreground)]">
                            Дата:{" "}
                            {sourceUrl ? (
                              <a
                                className="text-[color:var(--foreground)] underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/70"
                                href={sourceUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {sourceDateLabel}
                              </a>
                            ) : (
                              sourceDateLabel
                            )}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              {isMarketPost ? (
                <section className="rounded-[1.8rem] border border-amber-200/20 bg-amber-300/10 p-6 md:p-7">
                  <p className="eyebrow mb-3 text-xs">Не рекомендация</p>
                  <p className="text-sm leading-6 text-amber-50/90">
                    Рыночные записи описывают данные и источники. Это не
                    финансовая рекомендация и не торговый совет.
                  </p>
                </section>
              ) : null}

              {hasCrossSignal ? (
                <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/65 p-6 md:p-7">
                  <p className="eyebrow mb-4 text-xs">Вторая линия</p>
                  <p className="text-lg leading-8 text-[color:var(--foreground)]">
                    {post.cross_signal}
                  </p>
                </section>
              ) : null}

              {/* The opinion is now in the main column, so we remove it from the aside */}

              {hasHypothesis ? (
                <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/65 p-6 md:p-7">
                  <p className="eyebrow mb-4 text-xs">Осторожная гипотеза</p>
                  <blockquote className="font-[var(--font-display)] text-[1.4rem] italic leading-[1.45] text-[color:var(--foreground)]">
                    {post.hypothesis}
                  </blockquote>
                </section>
              ) : null}
            </aside>
          </section>

          <section className="surface-panel rounded-[1.8rem] p-6 md:p-8">
            <p className="eyebrow mb-4 text-xs">Структура записи</p>
            <div className="grid gap-3 text-sm text-[color:var(--muted-foreground)] sm:grid-cols-5">
              {["Факты", "Статья", "Вторая линия", "Гипотеза", "Уверенность"].map(
                (step, index) => (
                  <div
                    className="rounded-[1rem] border border-white/6 bg-black/10 px-3 py-3"
                    key={step}
                  >
                    <p className="mb-1 font-[var(--font-mono)] text-[11px] text-[color:var(--interactive-primary)]">
                      0{index + 1}
                    </p>
                    <p>{step}</p>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="surface-panel rounded-[1.8rem] p-6 md:p-8">
            <p className="eyebrow mb-4 text-xs">Проверенные факты</p>
            <div className="space-y-3 font-[var(--font-mono)] text-sm leading-7 text-[color:var(--foreground)] md:text-[15px]">
              {post.observed.map((fact) => (
                <p
                  className="rounded-[1rem] border border-white/6 bg-black/10 px-4 py-3"
                  key={fact}
                >
                  {fact}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/65 p-6 md:p-8">
            <p className="eyebrow mb-4 text-xs">Почему это вышло в ленту</p>
            <p className="text-base leading-8 text-[color:var(--muted-foreground)] md:text-lg md:leading-9">
              {selectionReason}
            </p>

            {hasConfidence || hasReasoning ? (
              <div className="mt-6 grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
                {hasConfidence ? (
                  <div
                    className={`inline-flex w-fit items-center rounded-full border px-4 py-2 text-xs uppercase tracking-[0.14em] ${confidenceStyle}`}
                  >
                    Уверенность: {confidenceLabel}
                  </div>
                ) : null}
                {hasReasoning ? (
                  <div className="rounded-[1.1rem] border border-white/6 bg-black/10 px-4 py-4">
                    <p className="eyebrow mb-2 text-[11px]">Почему опубликовано?</p>
                    <p className="text-sm leading-7 text-[color:var(--muted-foreground)] md:text-[15px]">
                      {reasoning}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-3 border-t border-white/6 pt-5">
            <Link className="button-shell button-primary button-compact inline-flex items-center justify-center text-sm font-medium" href="/">
              К ленте
            </Link>
            <Link className="button-shell button-ghost button-compact inline-flex items-center justify-center text-sm font-medium" href="/archive">
              Все даты
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
