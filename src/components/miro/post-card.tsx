"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { formatDate, type PostRow } from "../../lib/posts";
import {
  buildOpinionPreview,
  getPostModeLabel,
} from "../../lib/miro-post-insights";
import { CategoryBadge } from "./category-badge";

const CARD_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function clampCopy(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, maxLength).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");

  return `${(lastSpace > 96 ? sliced.slice(0, lastSpace) : sliced).trimEnd()}…`;
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildLead(post: PostRow): string {
  const leadFact = post.observed[0]?.trim();

  if (leadFact) {
    return clampCopy(leadFact, 118);
  }

  const firstSentence = post.inferred.match(/[^.!?]+[.!?]/)?.[0]?.trim();
  return clampCopy(firstSentence || post.inferred, 118);
}

function buildExcerpt(post: PostRow): string {
  const paragraphs = splitParagraphs(post.inferred);
  const candidate = paragraphs[1] ?? paragraphs[0] ?? post.inferred;
  return clampCopy(candidate, 220);
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

export function PostCard({
  post,
  index,
  featured = false,
}: {
  post: PostRow;
  index: number;
  featured?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const lead = buildLead(post);
  const excerpt = buildExcerpt(post);
  const opinion = buildOpinionPreview(post);
  const reason = clampCopy(
    post.reasoning?.trim() || "У материала есть источник, дата и проверяемый факт.",
    136,
  );
  const modeLabel = getPostModeLabel(post);
  const sourceLabel = post.source?.trim()
    ? clampCopy(post.source.trim(), 32)
    : "источник сохранен в записи";
  const sourceUrl = getSafeSourceUrl(post.source_url);
  const sourceDateLabel = formatSourceDate(post.source_published_at);
  const confidenceLabel =
    post.confidence === "high"
      ? "уверенность высокая"
      : post.confidence === "medium"
        ? "уверенность средняя"
        : "уверенность низкая";
  const baseTransition = reduceMotion
    ? { duration: 0.01 }
    : {
        duration: 0.38,
        delay: Math.min(index * 0.07, 0.28),
        ease: CARD_EASE,
      };

  return (
    <motion.article
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={[
        "miro-card surface-panel rounded-[1.75rem] interactive-glow-border group",
        featured ? "miro-card-featured lg:col-span-2" : "",
      ]
        .join(" ")
        .trim()}
      data-category={post.category}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.985 }}
      layout
      transition={baseTransition}
      whileHover={
        reduceMotion
          ? undefined
          : {
              scale: 1.012,
              y: -3,
              opacity: 0.985,
          }
      }
    >
      <Link
        aria-label={`Читать запись: ${post.title}`}
        className="post-card-link absolute inset-0 z-0 block rounded-[1.75rem]"
        href={`/post/${post.id}`}
      />
      <div className="pointer-events-none relative z-10 h-full p-[var(--card-padding)] pl-8">
        <div className="post-card-head">
          <div className="post-card-meta">
            {featured ? (
              <span className="featured-chip">Свежая запись</span>
            ) : null}
            <CategoryBadge active={featured} category={post.category} />
            <span className="text-xs tracking-[0.08em] uppercase text-[color:var(--muted-foreground)]">
              {formatDate(post.created_at)}
            </span>
            <span className="text-xs tracking-[0.08em] uppercase text-[color:var(--muted-foreground)]">
              {modeLabel}
            </span>
          </div>
          <span className="post-card-cta" aria-hidden="true">
            <span>Читать запись</span>
            <span className="post-card-cta-icon">-&gt;</span>
          </span>
        </div>

        <div
          className={[
            "mt-5 grid gap-5",
            featured ? "lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,1.05fr)] lg:items-start" : "",
          ]
            .join(" ")
            .trim()}
        >
          <div className="space-y-5">
            <h2
              className={[
                "font-[var(--font-display)] leading-[1.12] tracking-[-0.035em]",
                featured ? "text-[1.65rem] md:text-[2rem]" : "text-[1.35rem] md:text-[1.65rem]",
              ]
                .join(" ")
                .trim()}
            >
              {post.title}
            </h2>
            <div className="post-card-lead">
              <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                Факт
              </p>
              <p className="text-[0.98rem] leading-7 text-[color:var(--foreground)]">
                {lead}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                Источник:{" "}
                {sourceUrl ? (
                  <a
                    className="pointer-events-auto text-[color:var(--foreground)] underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/70"
                    href={sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {sourceLabel}
                  </a>
                ) : (
                  sourceLabel
                )}
              </span>
              {sourceDateLabel ? (
                <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                  Дата источника:{" "}
                  {sourceUrl ? (
                    <a
                      className="pointer-events-auto text-[color:var(--foreground)] underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/70"
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
              <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                Фактов: {post.observed.length}
              </span>
              <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                {confidenceLabel}
              </span>
            </div>
            <span className="post-card-cta post-card-cta-mobile" aria-hidden="true">
              <span>Читать запись</span>
              <span className="post-card-cta-icon">-&gt;</span>
            </span>
          </div>

          <div className="space-y-5">
            <div
              className={[
                "rounded-[1.1rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/35 px-4 py-3",
                featured ? "" : "hidden sm:block",
              ]
                .join(" ")
                .trim()}
            >
              <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                Почему опубликовано
              </p>
              <p className="text-[0.9rem] leading-6 text-[color:var(--foreground)]">
                {reason}
              </p>
            </div>
            <div className="rounded-[1.1rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/65 px-4 py-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                Редакционная оценка
              </p>
              <p className="text-[0.95rem] leading-7 text-[color:var(--foreground)]">
                {opinion}
              </p>
            </div>
            <p className="hidden max-w-2xl text-[0.98rem] leading-8 text-[color:var(--muted-foreground)] lg:block">
              {excerpt}
            </p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
