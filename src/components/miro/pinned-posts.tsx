"use client";

import Link from "next/link";
import { CATEGORY_LABELS, type MiroCategory, type PostRow } from "../../lib/posts";
import { useLocalHistory } from "./local-history";

function selectPinnedPosts(posts: PostRow[], history: MiroCategory[]): PostRow[] {
  let pinned: PostRow[] = [];
  const seenCategories = new Set<MiroCategory>();

  // 1. Try to find posts matching user history first
  for (const category of history) {
    if (pinned.length >= 5) break;
    const post = posts.find(
      (p) => p.category === category && p.confidence !== "low" && !seenCategories.has(p.category)
    );
    if (post) {
      pinned.push(post);
      seenCategories.add(post.category);
    }
  }

  // 2. Fill the rest with any category
  for (const post of posts) {
    if (pinned.length >= 5) break;
    if (post.confidence !== "low" && !seenCategories.has(post.category)) {
      pinned.push(post);
      seenCategories.add(post.category);
    }
  }

  return pinned;
}

export function PinnedPosts({ posts }: { posts: PostRow[] }) {
  const { history } = useLocalHistory();
  const pinnedPosts = selectPinnedPosts(posts, history);
  
  if (pinnedPosts.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-[color:var(--border)] pt-6">
      <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
        <div>
          <p className="eyebrow mb-2 text-xs">Еще записи</p>
          <h2 className="font-[var(--font-display)] text-base leading-snug tracking-[-0.025em] sm:text-lg md:text-xl">
            {history.length > 0 ? "Подобрано по вашим интересам" : "Материалы из соседних рубрик"}
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
              "group rounded-2xl border border-[color:var(--border)] px-4 py-3 transition-colors hover:border-[color:var(--border-strong)] hover:bg-white/4 interactive-glow-border",
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
            <p className="line-clamp-2 text-sm leading-6 text-[color:var(--foreground)] group-hover:text-[color:var(--interactive-primary)] transition-colors">
              {post.title}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)] group-hover:text-[color:var(--interactive-primary)]">
              Читать
              <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">-&gt;</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
