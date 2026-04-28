import { XMLParser } from "fast-xml-parser";

import {
  asArray,
  fetchText,
  includesBlockedKeyword,
  readXmlString,
  stripHtml,
  truncateText,
  uniqueFacts,
} from "./shared";
import type { MiroFactsPayload, RssFactsOptions } from "./types";

const RSS_XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
  processEntities: true,
});

function normalizeFeedEntries(parsedFeed: unknown): Array<Record<string, unknown>> {
  const root = parsedFeed as Record<string, unknown> | null | undefined;
  if (!root || typeof root !== "object") {
    return [];
  }

  const rssChannel = (root.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const rssItems = asArray(rssChannel?.item).filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  if (rssItems.length > 0) {
    return rssItems;
  }

  const atomFeed = root.feed as Record<string, unknown> | undefined;
  return asArray(atomFeed?.entry).filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function inferSourceFromFeedUrl(feedUrl: string): string {
  try {
    const host = new URL(feedUrl).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return feedUrl;
  }
}

function extractFeedTitle(parsedFeed: unknown): string {
  const root = parsedFeed as Record<string, unknown> | null | undefined;
  if (!root || typeof root !== "object") {
    return "";
  }

  const rssTitle = readXmlString(
    ((root.rss as Record<string, unknown> | undefined)?.channel as
      | Record<string, unknown>
      | undefined)?.title,
  );
  if (rssTitle) {
    return rssTitle;
  }

  return readXmlString((root.feed as Record<string, unknown> | undefined)?.title);
}

export async function fetchRssFacts(
  feedUrl: string,
  options: RssFactsOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 3_000;
  const maxItems = Math.min(Math.max(options.maxItems ?? 3, 1), 5);
  const { body, contentType } = await fetchText(
    feedUrl,
    {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    },
    {
      timeoutMs: requestTimeoutMs,
      budgetMs: Math.max(requestTimeoutMs, 3_200),
      label: options.sourceName ?? feedUrl,
      retry: {
        maxRetries: 1,
        retryOn: ["status:429", "status:503", "status:504", "timeout", "network"],
        baseDelayMs: 120,
        maxDelayMs: 220,
        jitterMs: 80,
      },
    },
  );

  if (!contentType.includes("xml") && !body.trimStart().startsWith("<")) {
    throw new Error(
      `Expected XML feed from ${feedUrl}, received content-type "${contentType}".`,
    );
  }

  let parsedFeed: unknown;
  try {
    parsedFeed = RSS_XML_PARSER.parse(body);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Failed to parse RSS/XML from ${feedUrl}: ${reason}`);
  }

  const entries = normalizeFeedEntries(parsedFeed).slice(0, maxItems);
  const source =
    options.sourceName ||
    extractFeedTitle(parsedFeed) ||
    inferSourceFromFeedUrl(feedUrl);

  const facts = entries
    .map((entry) => {
      const title = stripHtml(readXmlString(entry.title));
      const summary = stripHtml(
        readXmlString(
          entry.description ??
            entry.summary ??
            entry["content:encoded"] ??
            entry.content,
        ),
      );

      if (!title) {
        return "";
      }

      if (
        includesBlockedKeyword(
          `${title} ${summary}`,
          options.excludedKeywords,
        )
      ) {
        return "";
      }

      const compactSummary = summary ? truncateText(summary, 200) : "";
      return compactSummary ? `${title} — ${compactSummary}` : title;
    })
    .filter(Boolean);

  const normalizedFacts = uniqueFacts(facts, maxItems);
  if (normalizedFacts.length < 2) {
    throw new Error(`RSS feed ${source} returned too few usable entries.`);
  }

  return {
    category_hint: options.categoryHint ?? "World",
    source,
    facts: normalizedFacts,
  };
}
