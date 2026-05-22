import {
  isMarketRescueAllowed,
  type TopicCategoryBalance,
} from "./topic-fallback-policy";
import type { MiroTopic } from "./types";

const RECOVERABLE_NON_MARKET_FALLBACK_REASONS = [
  "quality gate blocked English title in Russian mode",
  "quality gate blocked English opinion in Russian mode",
  "quality gate blocked English cross-signal in Russian mode",
  "quality gate blocked English hypothesis in Russian mode",
  "quality gate blocked English reasoning in Russian mode",
  "quality gate blocked English observed fact in Russian mode",
  "quality gate blocked English inferred paragraph in Russian mode",
  "quality gate blocked mixed unrelated observed facts",
] as const;

const SPORTS_THIN_ARTICLE_REASON = "quality gate blocked thin article body";

const STRONG_SPORTS_THIN_FALLBACK_SOURCES = new Set([
  "MLB News",
  "NHL Scoreboard API",
]);

const STRONG_SPORTS_THIN_FALLBACK_PATTERNS = [
  /\b(?:shutout|3-hit|three-hit|no-hit|scoreless|walk-off|sweep|clinch|overtime|win over)\b/i,
  /\b(?:сухой матч|сухую победу|овертайм|камбэк|серия|плей-офф|финал)\b/iu,
] as const;

function isMarketTopic(topic: MiroTopic): boolean {
  return topic === "markets_fx" || topic === "markets_crypto";
}

export function isRecoverableNonMarketEditorialFallbackReason(
  reason?: string,
): boolean {
  if (!reason) {
    return false;
  }

  return RECOVERABLE_NON_MARKET_FALLBACK_REASONS.some((recoverableReason) =>
    reason.includes(recoverableReason),
  );
}

function isRecoverableStrongSportsThinArticle(input: {
  topic: MiroTopic;
  reason?: string;
  source?: string;
  facts?: readonly string[];
}): boolean {
  if (
    input.topic !== "sports" ||
    !input.reason?.includes(SPORTS_THIN_ARTICLE_REASON) ||
    !input.source ||
    !STRONG_SPORTS_THIN_FALLBACK_SOURCES.has(input.source)
  ) {
    return false;
  }

  const factText = (input.facts ?? []).join(" ");
  return STRONG_SPORTS_THIN_FALLBACK_PATTERNS.some((pattern) =>
    pattern.test(factText),
  );
}

export function isEditorialFallbackAllowedForTopic(input: {
  topic: MiroTopic;
  reason?: string;
  categoryBalance?: TopicCategoryBalance;
  source?: string;
  facts?: readonly string[];
}): boolean {
  if (isMarketTopic(input.topic)) {
    return isMarketRescueAllowed(input.categoryBalance);
  }

  return (
    isRecoverableNonMarketEditorialFallbackReason(input.reason) ||
    isRecoverableStrongSportsThinArticle(input)
  );
}

export function getEditorialFallbackBlockedReasonForTopic(input: {
  topic: MiroTopic;
  categoryBalance?: TopicCategoryBalance;
}): string {
  if (isMarketTopic(input.topic) && !isMarketRescueAllowed(input.categoryBalance)) {
    return "market editorial fallback blocked because visible feed is already market-heavy";
  }

  return "non-market editorial fallback is limited to localization or fact-focus repair; weak drafts stay skipped";
}
