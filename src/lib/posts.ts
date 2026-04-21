import { unstable_cache } from "next/cache";

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

const listPostsCached = unstable_cache(
  async (category?: MiroCategory): Promise<PostRow[]> => {
    const supabase = getPublicSupabaseClient();
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(24);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load posts: ${error.message}`);
    }

    return data ?? [];
  },
  ["miro-posts"],
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
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load post: ${error.message}`);
    }

    return data;
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

export async function listArchiveDays(): Promise<
  Array<{ date: string; posts: PostRow[] }>
> {
  const posts = await listPosts();
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
