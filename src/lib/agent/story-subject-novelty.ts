type StorySubjectPost = {
  title: string;
  observed?: readonly string[];
  source_url?: string | null;
  created_at?: string;
};

export const STORY_SUBJECT_WINDOW_HOURS = 72;

const URL_PATH_STOPWORDS = new Set([
  "news",
  "blog",
  "article",
  "articles",
  "story",
  "stories",
  "post",
  "posts",
  "index",
  "html",
  "htm",
  "php",
  "aspx",
  "en",
  "us",
  "ru",
  "research",
  "science",
  "technology",
  "tech",
  "world",
  "sports",
  "markets",
]);

const TEXT_SUBJECT_STOPWORDS = new Set([
  "amazon",
  "science",
  "microsoft",
  "research",
  "google",
  "apple",
  "openai",
  "meta",
  "nvidia",
  "anthropic",
  "agent",
  "agents",
  "model",
  "models",
  "skill",
  "skills",
  "token",
  "tokens",
  "rust",
  "proxy",
  "learning",
  "training",
  "parameter",
  "parameters",
  "throughput",
  "accuracy",
  "scaling",
  "making",
  "faster",
  "without",
  "sacrificing",
]);

function normalizeStoryText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}/-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addSubjectKey(keys: Set<string>, raw: string): void {
  const normalized = normalizeStoryText(raw);
  if (normalized.length < 5) {
    return;
  }

  if (TEXT_SUBJECT_STOPWORDS.has(normalized)) {
    return;
  }

  keys.add(normalized);
}

function extractTextSubjectKeys(text: string): Set<string> {
  const keys = new Set<string>();

  for (const match of text.matchAll(/\b([A-Z][a-z]+(?:[A-Z][a-zA-Z0-9]*)+)\b/gu)) {
    addSubjectKey(keys, match[1] ?? "");
  }

  for (const match of text.matchAll(/\b([A-Z][a-z]{4,})\b/gu)) {
    addSubjectKey(keys, match[1] ?? "");
  }

  return keys;
}

function extractUrlSubjectKeys(sourceUrl: string | null | undefined): Set<string> {
  const keys = new Set<string>();
  if (!sourceUrl?.trim()) {
    return keys;
  }

  try {
    const pathname = new URL(sourceUrl).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const slug = (segments.at(-1) ?? "").replace(/\.[a-z0-9]+$/iu, "");
    if (!slug) {
      return keys;
    }

    for (const part of slug.split(/[-_]/u)) {
      const normalized = normalizeStoryText(part);
      if (normalized.length < 5 || URL_PATH_STOPWORDS.has(normalized)) {
        continue;
      }

      keys.add(normalized);
    }
  } catch {
    return keys;
  }

  return keys;
}

export function extractStorySubjectKeys(post: StorySubjectPost): Set<string> {
  const text = [post.title, ...(post.observed ?? [])].join(" ");
  const keys = extractTextSubjectKeys(text);

  for (const key of extractUrlSubjectKeys(post.source_url)) {
    keys.add(key);
  }

  return keys;
}

function getHoursSince(value: string | undefined, now: Date): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return (now.getTime() - parsed.getTime()) / 3_600_000;
}

function countSharedSubjects(left: Set<string>, right: Set<string>): number {
  let shared = 0;
  for (const key of left) {
    if (right.has(key)) {
      shared += 1;
    }
  }

  return shared;
}

export function findStorySubjectConflict(
  candidate: StorySubjectPost,
  recentPosts: readonly StorySubjectPost[],
  now: Date = new Date(),
  maxAgeHours = STORY_SUBJECT_WINDOW_HOURS,
): string | null {
  const candidateKeys = extractStorySubjectKeys(candidate);
  if (candidateKeys.size === 0) {
    return null;
  }

  for (const recent of recentPosts) {
    const hoursSince = getHoursSince(recent.created_at, now);
    if (hoursSince === null || hoursSince < 0 || hoursSince > maxAgeHours) {
      continue;
    }

    const recentKeys = extractStorySubjectKeys(recent);
    if (countSharedSubjects(candidateKeys, recentKeys) > 0) {
      return recent.title;
    }
  }

  return null;
}