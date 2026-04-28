import { CategoryBadge } from "./category-badge";
import { MiroHeader } from "./miro-header";
import { QuietState } from "./quiet-state";
import { formatDate, getPostById } from "../../lib/posts";
import {
  buildQuickTake,
  getPostOpinion,
  buildSelectionReason,
  getPostModeLabel,
  getPostSupportLabel,
  splitPostParagraphs,
} from "../../lib/miro-post-insights";

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

type PostDetailViewProps = {
  id: string;
  confidence?: keyof typeof CONFIDENCE_LABELS;
  reasoning?: string;
};

export async function PostDetailView({
  id,
  confidence: confidenceOverride,
  reasoning: reasoningOverride,
}: PostDetailViewProps) {
  try {
    const post = await getPostById(id);

    if (!post) {
      return (
        <main className="pb-20">
          <MiroHeader />
          <section className="page-shell pt-12">
            <QuietState
              actionHref="/archive"
              actionLabel="Открыть архив"
              description="Возможно, запись еще не проявилась в кэше или уже ушла в архивную тишину. Попробуйте открыть архив и поймать соседнюю нить наблюдений."
              title="Эта заметка пока не успела закрепиться."
            />
          </section>
        </main>
      );
    }

    const hasHypothesis = post.hypothesis.trim().length > 0;
    const articleParagraphs = splitPostParagraphs(post.inferred);
    const quickTake = buildQuickTake(post);
    const personalOpinion = getPostOpinion(post);
    const selectionReason = buildSelectionReason(post);
    const postMode = getPostModeLabel(post);
    const supportLabel = getPostSupportLabel(post);
    const reasoning = reasoningOverride ?? post.reasoning;
    const confidence = confidenceOverride ?? post.confidence;
    const hasReasoning = reasoning.trim().length > 0;
    const hasConfidence = confidence.trim().length > 0;
    const confidenceLabel = CONFIDENCE_LABELS[confidence];
    const confidenceStyle = CONFIDENCE_STYLES[confidence];

    return (
      <main className="pb-20">
        <MiroHeader />
        <article className="page-shell pt-12">
          <div className="reading-shell space-y-10">
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
              <h1 className="max-w-[13ch] text-balance break-words font-[var(--font-display)] text-4xl leading-[0.98] tracking-[-0.035em] md:max-w-[14ch] md:text-5xl xl:text-6xl">
                {post.title}
              </h1>
            </header>

            <section className="surface-panel rounded-[1.8rem] p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1.8fr)_minmax(15rem,0.9fr)]">
                <div className="space-y-3">
                  <p className="eyebrow text-xs">Коротко</p>
                  <p className="text-lg leading-9 text-[color:var(--foreground)] md:text-[1.22rem]">
                    {quickTake}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                  <div className="rounded-[1.1rem] border border-white/6 bg-black/10 px-4 py-3">
                    <p className="eyebrow mb-2 text-[11px]">Режим</p>
                    <p className="text-sm leading-6 text-[color:var(--foreground)]">
                      {postMode}
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/6 bg-black/10 px-4 py-3">
                    <p className="eyebrow mb-2 text-[11px]">Опора</p>
                    <p className="text-sm leading-6 text-[color:var(--foreground)]">
                      {supportLabel}
                    </p>
                  </div>
                </div>
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

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.95fr)]">
              <div className="reading-shell">
                <p className="eyebrow mb-4 text-xs">Мысль</p>
                <div className="space-y-6 text-[1.18rem] leading-9 text-[color:var(--foreground)] md:text-[1.32rem] md:leading-10">
                  {(articleParagraphs.length > 0 ? articleParagraphs : [post.inferred]).map(
                    (paragraph, index) => (
                      <p key={`${post.id}-paragraph-${index}`}>{paragraph}</p>
                    ),
                  )}
                </div>
              </div>

              <aside className="space-y-5 xl:pt-10">
                <section className="rounded-[1.8rem] border border-[color:var(--border-strong)] bg-[color:var(--quote)] p-6 md:p-8">
                  <p className="eyebrow mb-4 text-xs">Личное мнение Миро</p>
                  <p className="text-lg leading-9 text-[color:var(--foreground)]">
                    {personalOpinion}
                  </p>
                </section>

                {hasHypothesis ? (
                  <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/65 p-6 md:p-8">
                    <p className="eyebrow mb-4 text-xs">Что дальше</p>
                    <blockquote className="font-[var(--font-display)] text-[1.5rem] italic leading-[1.45] text-[color:var(--foreground)]">
                      {post.hypothesis}
                    </blockquote>
                  </section>
                ) : null}
              </aside>
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
                      <p className="eyebrow mb-2 text-[11px]">Почему этот сигнал?</p>
                      <p className="text-sm leading-7 text-[color:var(--muted-foreground)] md:text-[15px]">
                        {reasoning}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

          </div>
        </article>
      </main>
    );
  } catch {
    return (
      <main className="pb-20">
        <MiroHeader />
        <section className="page-shell pt-12">
          <QuietState
            actionHref="/"
            actionLabel="Вернуться к главной"
            description="Сервер сейчас слишком тих, чтобы отдать эту запись. Попробуйте обновить страницу чуть позже: Миро не исчез, он просто снова всматривается в сигналы."
            title="Миро пока не может показать эту заметку."
          />
        </section>
      </main>
    );
  }
}
