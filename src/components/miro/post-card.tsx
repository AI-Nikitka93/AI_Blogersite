"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { formatDate, type PostRow } from "../../lib/posts";
import {
  getPostModeLabel,
  getPostOpenLabel,
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

export function PostCard({
  post,
  index,
}: {
  post: PostRow;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const lead = buildLead(post);
  const excerpt = buildExcerpt(post);
  const modeLabel = getPostModeLabel(post);
  const openLabel = getPostOpenLabel(post);
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
      className="miro-card surface-panel rounded-[1.75rem] p-[var(--card-padding)] pl-8"
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
      <div className="flex flex-wrap items-center gap-3">
        <CategoryBadge category={post.category} />
        <span className="text-xs tracking-[0.08em] uppercase text-[color:var(--muted-foreground)]">
          {formatDate(post.created_at)}
        </span>
        <span className="text-xs tracking-[0.08em] uppercase text-[color:var(--muted-foreground)]">
          {modeLabel}
        </span>
      </div>

      <Link className="mt-5 block space-y-5" href={`/post/${post.id}`}>
        <h2 className="font-[var(--font-display)] text-2xl leading-tight tracking-[-0.02em] md:text-[2rem]">
          {post.title}
        </h2>
        <div className="post-card-lead">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            Что случилось
          </p>
          <p className="text-[0.98rem] leading-7 text-[color:var(--foreground)]">
            {lead}
          </p>
        </div>
        <p className="max-w-2xl text-[0.98rem] leading-8 text-[color:var(--muted-foreground)]">
          {excerpt}
        </p>
        <p className="text-sm uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
          {openLabel}
        </p>
      </Link>
    </motion.article>
  );
}
