import type { MiroCategoryHint } from "../connectors";
import type { MiroTopic } from "./types";

export interface TopicCategoryBalance {
  sample_size: number;
  counts: Partial<Record<MiroCategoryHint, number>>;
  missing_categories: MiroCategoryHint[];
  markets_share: number;
  markets_rescue_allowed: boolean;
}

const FALLBACK_TOPIC_ORDER: readonly MiroTopic[] = [
  "world",
  "tech_world",
  "markets_fx",
  "markets_crypto",
  "sports",
] as const;

export function getCategoryForTopic(topic: MiroTopic): MiroCategoryHint {
  if (topic === "sports") {
    return "Sports";
  }

  if (topic === "tech_world") {
    return "Tech";
  }

  if (topic === "world") {
    return "World";
  }

  return "Markets";
}

function getCategoryCount(
  categoryBalance: TopicCategoryBalance | undefined,
  topic: MiroTopic,
): number {
  return categoryBalance?.counts[getCategoryForTopic(topic)] ?? 0;
}

function getFallbackScore(
  categoryBalance: TopicCategoryBalance | undefined,
  topic: MiroTopic,
): number {
  const categoryCount = getCategoryCount(categoryBalance, topic);
  if (topic !== "sports") {
    return categoryCount;
  }

  return categoryCount === 0 ? categoryCount : categoryCount + 2;
}

export function getBalancedFallbackTopics(
  primaryTopic?: MiroTopic,
  categoryBalance?: TopicCategoryBalance,
): MiroTopic[] {
  const topics = FALLBACK_TOPIC_ORDER.filter((topic) => topic !== primaryTopic);
  const marketSafeTopics =
    !categoryBalance || categoryBalance.markets_rescue_allowed
      ? topics
      : topics.filter((topic) => getCategoryForTopic(topic) !== "Markets");
  const sportSafeTopics =
    !categoryBalance || getCategoryCount(categoryBalance, "sports") === 0
      ? marketSafeTopics
      : marketSafeTopics.filter((topic) => topic !== "sports");

  if (!categoryBalance) {
    return sportSafeTopics;
  }

  return [...sportSafeTopics].sort((left, right) => {
    const scoreDelta =
      getFallbackScore(categoryBalance, left) -
      getFallbackScore(categoryBalance, right);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return (
      FALLBACK_TOPIC_ORDER.indexOf(left) - FALLBACK_TOPIC_ORDER.indexOf(right)
    );
  });
}

export function getBalancedPrimaryTopic(
  primaryTopic: MiroTopic,
  categoryBalance?: TopicCategoryBalance,
): MiroTopic {
  if (!categoryBalance || categoryBalance.sample_size < 5) {
    return primaryTopic;
  }

  const primaryCategory = getCategoryForTopic(primaryTopic);
  const primaryCount = categoryBalance.counts[primaryCategory] ?? 0;
  const shouldReroute =
    (primaryCategory === "Markets" && !categoryBalance.markets_rescue_allowed) ||
    (primaryCategory === "Sports" && primaryCount > 0);

  if (!shouldReroute) {
    return primaryTopic;
  }

  return getBalancedFallbackTopics(primaryTopic, categoryBalance)[0] ?? primaryTopic;
}
