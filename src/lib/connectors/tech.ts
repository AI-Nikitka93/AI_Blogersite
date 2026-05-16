import { fetchJson, sanitizeNewsText, uniqueFacts } from "./shared";
import type { ConnectorRuntimeOptions, MiroFactsPayload } from "./types";

interface HackerNewsHit {
  title?: string | null;
  url?: string | null;
  story_url?: string | null;
  created_at?: string | null;
}

interface HackerNewsSearchResponse {
  hits?: HackerNewsHit[] | null;
}

const HACKER_NEWS_SEARCH_BY_DATE_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=5";

const HACKER_NEWS_BLOCKED_KEYWORDS = [
  "administration",
  "air force one",
  "campaign",
  "china trip",
  "congress",
  "diplomacy",
  "donald",
  "election",
  "federal",
  "foreign policy",
  "government",
  "geopolitics",
  "invasion",
  "lawmakers",
  "military",
  "minister",
  "parliament",
  "president",
  "protest",
  "sanction",
  "national security",
  "tariff",
  "trump",
  "us orders",
  "vote",
  "war",
  "white house",
  "xi jinping",
];

const HACKER_NEWS_TECH_KEYWORDS = [
  "ai",
  "algorithm",
  "api",
  "artificial intelligence",
  "battery",
  "chip",
  "code",
  "compute",
  "cyber",
  "data",
  "database",
  "developer",
  "llm",
  "machine learning",
  "model",
  "nvidia",
  "open source",
  "programming",
  "quantum",
  "research",
  "robot",
  "science",
  "security",
  "semiconductor",
  "software",
  "space",
  "startup",
];

function includesAnyKeyword(value: string, keywords: readonly string[]): boolean {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => {
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (!normalizedKeyword) {
      return false;
    }

    if (normalizedKeyword.includes(" ")) {
      return normalized.includes(normalizedKeyword);
    }

    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(
      normalized,
    );
  });
}

function isUsableHackerNewsHit(hit: HackerNewsHit): boolean {
  const title = sanitizeNewsText(hit.title);
  const url = sanitizeNewsText(hit.url ?? hit.story_url);
  if (!title) {
    return false;
  }

  const searchableText = `${title} ${url}`;
  if (includesAnyKeyword(searchableText, HACKER_NEWS_BLOCKED_KEYWORDS)) {
    return false;
  }

  return includesAnyKeyword(searchableText, HACKER_NEWS_TECH_KEYWORDS);
}

export async function fetchHackerNewsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 3_000;
  const response = await fetchJson<HackerNewsSearchResponse>(
    HACKER_NEWS_SEARCH_BY_DATE_URL,
    {},
    {
      timeoutMs: requestTimeoutMs,
      budgetMs: Math.max(requestTimeoutMs, 3_200),
      label: "HackerNews Algolia",
    },
  );

  const usableHits = (response.hits ?? []).filter(isUsableHackerNewsHit);
  const facts = usableHits
    .map((hit) => {
      const title = sanitizeNewsText(hit?.title);
      const url = sanitizeNewsText(hit?.url ?? hit?.story_url);
      if (!title) {
        return "";
      }

      return url ? `${title} — ${url}` : title;
    })
    .filter(Boolean);

  const normalizedFacts = uniqueFacts(facts, 5);
  if (normalizedFacts.length < 2) {
    throw new Error("HackerNews returned too few usable stories.");
  }

  return {
    category_hint: "Tech",
    source: "HackerNews",
    source_url: sanitizeNewsText(
      usableHits.find((hit) => hit?.url || hit?.story_url)?.url ??
        usableHits.find((hit) => hit?.url || hit?.story_url)?.story_url,
    ),
    source_published_at: sanitizeNewsText(
      usableHits.find((hit) => hit?.created_at)?.created_at,
    ),
    event_date: sanitizeNewsText(
      usableHits.find((hit) => hit?.created_at)?.created_at,
    ),
    corroborating_sources: usableHits
      .map((hit) => ({
        source: "HackerNews",
        url: sanitizeNewsText(hit?.url ?? hit?.story_url),
        title: sanitizeNewsText(hit?.title),
        published_at: sanitizeNewsText(hit?.created_at),
      }))
      .filter((item) => item.url || item.published_at)
      .slice(0, 5),
    facts: normalizedFacts,
  };
}
