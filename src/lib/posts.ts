import { unstable_cache } from "next/cache";

import { isPublicLaunchPostContent } from "./public-post-quality";
import { getPublicSupabaseClient, type PostRow } from "./supabase";

export type { PostRow } from "./supabase";

export const MIRO_CATEGORIES = [
  "World",
  "Tech",
  "Sports",
  "Markets",
] as const;

export type MiroCategory = (typeof MIRO_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MiroCategory, string> = {
  World: "Мир",
  Tech: "Технологии",
  Sports: "Спорт",
  Markets: "Рынки",
};

export const POSTS_CACHE_TAG = "posts";
export const MIRO_DISPLAY_TIMEZONE = "Europe/Minsk";
const DEFAULT_PUBLIC_POST_LIMIT = 24;
const PUBLIC_POST_PREFETCH_LIMIT = 40;
const FEED_POST_LIMIT = 20;
const FEED_POST_PREFETCH_LIMIT = 40;
const TOP_FEED_MARKET_WINDOW = 10;
const TOP_FEED_MARKET_LIMIT = 4;
const TOP_FIVE_MARKET_WINDOW = 5;
const TOP_FIVE_MARKET_LIMIT = 2;

export function isPublicLaunchPost(post: PostRow): boolean {
  return isPublicLaunchPostContent(post);
}

function countMarkets(posts: readonly PostRow[]): number {
  return posts.filter((post) => post.category === "Markets").length;
}

function wouldExceedDisplayMarketLimit(
  candidate: PostRow,
  selected: readonly PostRow[],
): boolean {
  if (candidate.category !== "Markets") {
    return false;
  }

  if (
    selected.length < TOP_FIVE_MARKET_WINDOW &&
    countMarkets(selected.slice(0, TOP_FIVE_MARKET_WINDOW)) >=
      TOP_FIVE_MARKET_LIMIT
  ) {
    return true;
  }

  return (
    selected.length < TOP_FEED_MARKET_WINDOW &&
    countMarkets(selected.slice(0, TOP_FEED_MARKET_WINDOW)) >=
      TOP_FEED_MARKET_LIMIT
  );
}

function hasNonMarketCandidate(candidates: readonly PostRow[]): boolean {
  return candidates.some((post) => post.category !== "Markets");
}

function findDiverseCandidateIndex(
  candidates: readonly PostRow[],
  selected: readonly PostRow[],
): number {
  const previous = selected.at(-1);
  const avoidAdjacentMarket =
    previous?.category === "Markets" && hasNonMarketCandidate(candidates);

  const candidateIndex = candidates.findIndex((candidate) => {
    if (wouldExceedDisplayMarketLimit(candidate, selected)) {
      return false;
    }

    if (avoidAdjacentMarket && candidate.category === "Markets") {
      return false;
    }

    return true;
  });

  return candidateIndex >= 0 ? candidateIndex : 0;
}

export function prioritizeDiversePostsForDisplay(
  posts: readonly PostRow[],
): PostRow[] {
  const [latest, ...rest] = posts;
  if (!latest) {
    return [];
  }

  const selected = [latest];
  const candidates = [...rest];

  while (candidates.length > 0) {
    const index = findDiverseCandidateIndex(candidates, selected);
    const [candidate] = candidates.splice(index, 1);
    if (candidate) {
      selected.push(candidate);
    }
  }

  return selected;
}

function getMinskDateKey(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: MIRO_DISPLAY_TIMEZONE,
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

async function fetchPosts(options?: {
  category?: MiroCategory;
  limit?: number;
}): Promise<PostRow[]> {
  const supabase = getPublicSupabaseClient();
  let query = supabase
    .from("posts")
    .select("*")
    .not("source", "is", null)
    .neq("confidence", "low")
    .order("created_at", {
      ascending: false,
    });

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (typeof options?.limit === "number") {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load posts: ${error.message}`);
  }

  return (data ?? []).filter(isPublicLaunchPost);
}

const listPostsCached = unstable_cache(
  async (category?: MiroCategory): Promise<PostRow[]> =>
    category
      ? fetchPosts({ category, limit: DEFAULT_PUBLIC_POST_LIMIT })
      : prioritizeDiversePostsForDisplay(
          await fetchPosts({ limit: PUBLIC_POST_PREFETCH_LIMIT }),
        ).slice(0, DEFAULT_PUBLIC_POST_LIMIT),
  ["miro-posts"],
  {
    tags: [POSTS_CACHE_TAG],
  },
);

const listArchivePostsCached = unstable_cache(
  async (): Promise<PostRow[]> => fetchPosts(),
  ["miro-archive-posts"],
  {
    tags: [POSTS_CACHE_TAG],
  },
);

const listFeedPostsCached = unstable_cache(
  async (): Promise<PostRow[]> =>
    prioritizeDiversePostsForDisplay(
      await fetchPosts({ limit: FEED_POST_PREFETCH_LIMIT }),
    ).slice(0, FEED_POST_LIMIT),
  ["miro-feed-posts"],
  {
    tags: [POSTS_CACHE_TAG],
  },
);

const getPostByIdCached = unstable_cache(
  async (id: string): Promise<PostRow | null> => {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .not("source", "is", null)
      .neq("confidence", "low")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load post: ${error.message}`);
    }

    return data && isPublicLaunchPost(data) ? data : null;
  },
  ["miro-post-by-id"],
  {
    tags: [POSTS_CACHE_TAG],
  },
);

export async function listPosts(category?: MiroCategory): Promise<PostRow[]> {
  return listPostsCached(category);
}

export async function getPostById(id: string): Promise<PostRow | null> {
  return getPostByIdCached(id);
}

export async function listFeedPosts(): Promise<PostRow[]> {
  return listFeedPostsCached();
}

export async function listArchiveDays(): Promise<
  Array<{ date: string; posts: PostRow[] }>
> {
  const posts = await listArchivePostsCached();
  const byDay = new Map<string, PostRow[]>();

  for (const post of posts) {
    const key = getMinskDateKey(post.created_at);
    const bucket = byDay.get(key) ?? [];
    bucket.push(post);
    byDay.set(key, bucket);
  }

  return [...byDay.entries()].map(([date, dayPosts]) => ({
    date,
    posts: dayPosts,
  }));
}

export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
): string {
  return new Intl.DateTimeFormat("ru-RU", {
    ...options,
    timeZone: MIRO_DISPLAY_TIMEZONE,
  }).format(new Date(value));
}
