import { fetchJson, sanitizeNewsText, uniqueFacts } from "./shared";
import type { ConnectorRuntimeOptions, MiroFactsPayload } from "./types";

interface HackerNewsHit {
  title?: string | null;
  url?: string | null;
  story_url?: string | null;
}

interface HackerNewsSearchResponse {
  hits?: HackerNewsHit[] | null;
}

const HACKER_NEWS_SEARCH_BY_DATE_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=5";

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

  const facts = (response.hits ?? [])
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
    facts: normalizedFacts,
  };
}
