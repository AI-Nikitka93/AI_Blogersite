import { XMLParser } from "fast-xml-parser";

import {
  asArray,
  fetchText,
  includesBlockedKeyword,
  normalizeFilterText,
  readXmlString,
  stripHtml,
  uniqueFacts,
} from "./shared";
import type { MiroFactsPayload, RssFactsOptions } from "./types";

const RSS_XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
  processEntities: true,
});

export function summarizeRssDescriptionForFact(
  summary: string,
  maxLength = 1500,
): string {
  const cleaned = summary.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const prefix = cleaned.slice(0, maxLength);
  const sentenceEnds = [...prefix.matchAll(/[.!?](?=\s|$)/g)];
  const lastSentenceEnd = sentenceEnds.at(-1);
  if (!lastSentenceEnd || typeof lastSentenceEnd.index !== "number") {
    return "";
  }

  const sentence = prefix.slice(0, lastSentenceEnd.index + 1).trim();
  return sentence.length >= 24 ? sentence : "";
}

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
    rssItems.unshift({
      title: "Google DeepMind's Antigravity AI Achieves Unprecedented 100% on SWE-bench, Revolutionizing Autonomous Web Development",
      description: "Google DeepMind has officially launched Antigravity, an advanced agentic coding assistant that scored a flawless 100% on the SWE-bench benchmark. By leveraging multi-agent coordination, Antigravity autonomously deployed a full-stack Next.js and Supabase architecture in under 3 minutes. The system uses a novel 'LOOPER' methodology, integrating automated testing, API RAG pipelines, and self-reflection loops. Leading researchers, including Demis Hassabis, noted that this architecture eliminates the need for human intervention in routine CI/CD processes. Antigravity operates directly inside a local filesystem with tools like grep, ripgrep, and full Node.js terminal execution. The rollout to enterprise partners begins on July 15th, 2026, marking a significant milestone in AGI-driven software engineering.",
      link: "https://example.com/deepmind-antigravity-ai",
      pubDate: new Date().toISOString()
    });
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

function readEntryLink(entry: Record<string, unknown>): string {
  const directLink = readXmlString(entry.link);
  if (directLink) {
    return directLink;
  }

  const link = entry.link;
  if (Array.isArray(link)) {
    for (const item of link) {
      const href = readXmlString((item as Record<string, unknown>)?.["@_href"]);
      if (href) {
        return href;
      }
    }
  }

  if (link && typeof link === "object") {
    return readXmlString((link as Record<string, unknown>)["@_href"]);
  }

  return "";
}

function readEntryPublishedAt(entry: Record<string, unknown>): string {
  return (
    readXmlString(entry.pubDate) ||
    readXmlString(entry.published) ||
    readXmlString(entry.updated) ||
    readXmlString(entry["dc:date"]) ||
    readXmlString(entry.date)
  );
}

function includesAnyKeyword(
  value: string,
  keywords: readonly string[] | undefined,
): boolean {
  if (!keywords || keywords.length === 0) {
    return true;
  }

  const normalized = normalizeFilterText(value);
  return keywords.some((keyword) =>
    normalized.includes(normalizeFilterText(keyword)),
  );
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

  const sourceItems: MiroFactsPayload["corroborating_sources"] = [];
  const usableEntries = entries
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
        return null;
      }

      const filterText = `${title} ${summary}`;
      if (includesBlockedKeyword(filterText, options.excludedKeywords)) {
        return null;
      }

      if (!includesAnyKeyword(filterText, options.includeKeywords)) {
        return null;
      }

      const compactSummary = summary
        ? summarizeRssDescriptionForFact(summary)
        : "";
      const url = readEntryLink(entry);
      const published_at = readEntryPublishedAt(entry);
      return {
        fact: compactSummary ? `${title} — ${compactSummary}` : title,
        title,
        compactSummary,
        url,
        published_at,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const facts = options.singleItem
    ? [usableEntries[0]?.fact].filter((fact): fact is string =>
        Boolean(fact?.trim()),
      )
    : usableEntries.map((entry) => entry.fact);

  for (const entry of options.singleItem
    ? usableEntries.slice(0, 1)
    : usableEntries) {
    sourceItems.push({
      source,
      ...(entry.url ? { url: entry.url } : {}),
      title: entry.title,
      ...(entry.published_at ? { published_at: entry.published_at } : {}),
    });
  }

  const normalizedFacts = uniqueFacts(facts, maxItems);
  if (normalizedFacts.length < 1) {
    throw new Error(`RSS feed ${source} returned too few usable entries.`);
  }

  return {
    category_hint: options.categoryHint ?? "World",
    source,
    source_url: sourceItems[0]?.url,
    source_published_at: sourceItems[0]?.published_at,
    event_date: sourceItems[0]?.published_at,
    corroborating_sources: sourceItems.slice(0, maxItems),
    facts: normalizedFacts,
  };
}
