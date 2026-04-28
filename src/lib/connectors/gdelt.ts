import { fetchJson, uniqueFacts } from "./shared";
import type { GdeltFactsOptions, MiroFactsPayload } from "./types";

interface GdeltArticle {
  title?: string;
  seendate?: string;
  domain?: string;
}

interface GdeltDocResponse {
  articles?: GdeltArticle[];
}

const GDELT_DOC_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

const GDELT_NEGATIVE_KEYWORDS = [
  "government",
  "election",
  "war",
  "military",
  "sanction",
  "president",
  "\"prime minister\"",
  "parliament",
  "congress",
  "cabinet",
  "diplomacy",
  "geopolitics",
  "protest",
  "minister",
] as const;

function formatGdeltDate(seenDate: string | undefined): string {
  if (!seenDate) {
    return "unknown date";
  }

  const compact = seenDate.replace("T", "").replace("Z", "");
  const year = compact.slice(0, 4);
  const month = compact.slice(4, 6);
  const day = compact.slice(6, 8);

  if (!year || !month || !day) {
    return seenDate;
  }

  return `${year}-${month}-${day}`;
}

export async function fetchGdeltFacts(
  options: GdeltFactsOptions = {},
): Promise<MiroFactsPayload> {
  const keywords = options.keywords ?? [
    "artificial intelligence",
    "large language model",
    "space launch",
  ];
  const categoryHint = options.categoryHint ?? "Tech";
  const maxRecords = String(options.maxRecords ?? 3);
  const timespan = options.timespan ?? "3days";
  const requestTimeoutMs = options.requestTimeoutMs ?? 3_200;
  const retryOn429 = options.retryOn429 ?? false;

  const positiveQuery = keywords.map((keyword) => `"${keyword}"`).join(" OR ");
  const negativeQuery = GDELT_NEGATIVE_KEYWORDS.map((keyword) => `-${keyword}`).join(" ");
  const query = `(${positiveQuery}) ${negativeQuery}`;

  const url =
    `${GDELT_DOC_BASE}?` +
    new URLSearchParams({
      query,
      mode: "ArtList",
      maxrecords: maxRecords,
      sort: "DateDesc",
      format: "json",
      timespan,
    }).toString();

  const response = await fetchJson<GdeltDocResponse>(url, {}, {
    timeoutMs: Math.min(requestTimeoutMs, 3_000),
    budgetMs: Math.min(Math.max(requestTimeoutMs, 3_000), 3_400),
    label: "GDELT DOC API",
    circuitKey: "connector:gdelt-doc",
    retry: retryOn429
      ? {
          maxRetries: 1,
          retryOn: ["status:429", "status:503", "status:504", "timeout"],
          baseDelayMs: 140,
          maxDelayMs: 220,
          jitterMs: 80,
        }
      : false,
  });

  const articles = response.articles ?? [];
  const facts = articles
    .filter((article) => article.title)
    .map((article) => {
      const date = formatGdeltDate(article.seendate);
      const domain = article.domain ? ` via ${article.domain}` : "";
      return `${article.title} was indexed on ${date}${domain}.`;
    });

  const normalizedFacts = uniqueFacts(facts, 4);
  if (normalizedFacts.length < 2) {
    throw new Error("GDELT returned too few usable articles for the requested query.");
  }

  return {
    category_hint: categoryHint,
    source: "GDELT DOC API",
    facts: normalizedFacts,
  };
}
