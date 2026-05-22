import type { MiroFactsPayload } from "../connectors";

type CorroboratingSource = NonNullable<
  MiroFactsPayload["corroborating_sources"]
>[number];

const MIN_SHARED_STORY_TOKENS = 3;
const MIN_SHARED_TOKEN_RATIO = 0.28;

const STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "are",
  "blog",
  "com",
  "for",
  "from",
  "has",
  "index",
  "into",
  "its",
  "new",
  "news",
  "not",
  "on",
  "over",
  "says",
  "the",
  "this",
  "to",
  "www",
  "with",
]);

function normalizeUrl(value: string | undefined): string {
  if (!value?.trim()) {
    return "";
  }

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function tokenizeStoryText(value: string): Set<string> {
  const tokens = value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/gu)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return new Set(tokens);
}

function getUrlStoryText(value: string | undefined): string {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return url.pathname.replace(/[/-]/g, " ");
  } catch {
    return value.replace(/[/-]/g, " ");
  }
}

function getReferenceTokens(payload: MiroFactsPayload): Set<string> {
  const referenceText = [
    payload.facts[0] ?? "",
    payload.source_url ? getUrlStoryText(payload.source_url) : "",
  ].join(" ");

  return tokenizeStoryText(referenceText);
}

function countSharedTokens(left: Set<string>, right: Set<string>): number {
  let shared = 0;
  for (const token of right) {
    if (left.has(token)) {
      shared += 1;
    }
  }

  return shared;
}

export function isSameStoryCorroboratingSource(
  payload: MiroFactsPayload,
  source: CorroboratingSource,
): boolean {
  const payloadUrl = normalizeUrl(payload.source_url);
  const sourceUrl = normalizeUrl(source.url);
  if (payloadUrl && sourceUrl && payloadUrl === sourceUrl) {
    return true;
  }

  const referenceTokens = getReferenceTokens(payload);
  const sourceTokens = tokenizeStoryText(
    [source.title ?? "", getUrlStoryText(source.url)].join(" "),
  );

  if (referenceTokens.size === 0 || sourceTokens.size === 0) {
    return false;
  }

  const shared = countSharedTokens(referenceTokens, sourceTokens);
  const ratio = shared / Math.min(referenceTokens.size, sourceTokens.size);

  return shared >= MIN_SHARED_STORY_TOKENS && ratio >= MIN_SHARED_TOKEN_RATIO;
}

export function getSameStoryCorroboratingSources(
  payload: MiroFactsPayload,
): CorroboratingSource[] {
  return (payload.corroborating_sources ?? []).filter((source) =>
    isSameStoryCorroboratingSource(payload, source),
  );
}
