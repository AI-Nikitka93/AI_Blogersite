import {
  fetchArsTechnicaFacts,
  fetchBbcSportFacts,
  fetchBbcWorldFacts,
  fetchBloombergMarketsFacts,
  fetchCoinDeskFacts,
  fetchCryptoFacts,
  fetchCurrencyFacts,
  fetchGdeltFacts,
  fetchHabrDevelopFacts,
  fetchIxbtFacts,
  fetchNakedScienceFacts,
  fetchNplus1Facts,
  fetchHackerNewsFacts,
  fetchOnlinerMoneyFacts,
  fetchOnlinerPeopleFacts,
  fetchOnlinerTechFacts,
  fetchPressballFacts,
  fetchScienceDailyTechFacts,
  fetchSoccer365Facts,
  fetchSportExpressFacts,
  fetchSportsFacts,
  fetchSportsRuFacts,
  fetchTechCrunchFacts,
  fetchThreeDNewsFacts,
  type MiroFactsPayload,
} from "../connectors";
import { getDefaultTopicForSchedule } from "../miro-schedule";
import type {
  MiroLlmProvider,
  MiroSelectionStrategy,
  MiroTopic,
  TopicDefinition,
  TopicTimeoutProfile,
} from "./types";

const DEFAULT_MARKETS_GENERATOR_MODEL =
  process?.env?.MIRO_MARKETS_GENERATOR_MODEL ?? "llama-3.1-8b-instant";

const SOURCE_ROTATION_MIN_BUDGET_MS = 450;
const SOURCE_ROTATION_RESERVE_MS = 180;

type TopicSourceFactory = {
  label: string;
  fetchPayload: (requestTimeoutMs: number) => Promise<MiroFactsPayload>;
};

const TOPICS: readonly TopicDefinition[] = [
  {
    topic: "sports",
    categoryLabel: "Sports",
    fetchPayload: (requestTimeoutMs) => fetchSportsTopicFacts(requestTimeoutMs),
  },
  {
    topic: "markets_fx",
    categoryLabel: "Markets(FX)",
    fetchPayload: (requestTimeoutMs) => fetchMarketsFxFacts(requestTimeoutMs),
  },
  {
    topic: "markets_crypto",
    categoryLabel: "Markets(Crypto)",
    fetchPayload: (requestTimeoutMs) => fetchMarketsCryptoFacts(requestTimeoutMs),
  },
  {
    topic: "tech_world",
    categoryLabel: "Tech",
    fetchPayload: (requestTimeoutMs) => fetchTechWorldFacts(requestTimeoutMs),
  },
  {
    topic: "world",
    categoryLabel: "World",
    fetchPayload: (requestTimeoutMs) => fetchWorldFacts(requestTimeoutMs),
  },
] as const;

const TOPIC_TIMEOUT_PROFILES: Record<MiroTopic, TopicTimeoutProfile> = {
  sports: {
    totalTimeoutMs: 9_500,
    connectorReserveMs: 5_300,
    connectorCapMs: 3_200,
    gatekeeperCapMs: 900,
    generatorCapMs: 3_200,
    generatorMaxTokens: 520,
  },
  markets_fx: {
    totalTimeoutMs: 9_500,
    connectorReserveMs: 5_100,
    connectorCapMs: 2_600,
    gatekeeperCapMs: 900,
    generatorCapMs: 3_000,
    generatorMaxTokens: 520,
  },
  markets_crypto: {
    totalTimeoutMs: 9_700,
    connectorReserveMs: 5_200,
    connectorCapMs: 2_800,
    gatekeeperCapMs: 900,
    generatorCapMs: 3_100,
    generatorMaxTokens: 560,
  },
  tech_world: {
    totalTimeoutMs: 9_800,
    connectorReserveMs: 5_400,
    connectorCapMs: 3_600,
    gatekeeperCapMs: 1_000,
    generatorCapMs: 3_200,
    generatorMaxTokens: 620,
  },
  world: {
    totalTimeoutMs: 9_800,
    connectorReserveMs: 5_400,
    connectorCapMs: 3_600,
    gatekeeperCapMs: 1_000,
    generatorCapMs: 3_200,
    generatorMaxTokens: 620,
  },
} as const;

const SPORTS_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "TheSportsDB",
    fetchPayload: (requestTimeoutMs) =>
      fetchSportsFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 1_800),
      }),
  },
  {
    label: "Pressball RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchPressballFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_500),
      }),
  },
  {
    label: "Soccer365 HTML",
    fetchPayload: (requestTimeoutMs) =>
      fetchSoccer365Facts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_200),
      }),
  },
  {
    label: "Sports.ru RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchSportsRuFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_500),
      }),
  },
  {
    label: "Sport-Express RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchSportExpressFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_500),
      }),
  },
  {
    label: "BBC Sport RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchBbcSportFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
] as const;

const TECH_WORLD_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "ScienceDaily Technology RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchScienceDailyTechFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "Habr Develop RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchHabrDevelopFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "iXBT RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchIxbtFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "3DNews RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchThreeDNewsFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "TechCrunch RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchTechCrunchFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "Ars Technica RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchArsTechnicaFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "HackerNews",
    fetchPayload: (requestTimeoutMs) =>
      fetchHackerNewsFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "Onliner Tech RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchOnlinerTechFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "GDELT DOC API",
    fetchPayload: (requestTimeoutMs) =>
      fetchGdeltFacts({
        categoryHint: "Tech",
        keywords: [
          "artificial intelligence",
          "space launch",
          "AI model",
          "chip design",
        ],
        maxRecords: 2,
        timespan: "1day",
        requestTimeoutMs,
        retryOn429: false,
      }),
  },
] as const;

const WORLD_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "Onliner People RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchOnlinerPeopleFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "N+1 RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchNplus1Facts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_600),
      }),
  },
  {
    label: "Naked Science RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchNakedScienceFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "Onliner Money RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchOnlinerMoneyFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "BBC World RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchBbcWorldFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_600),
      }),
  },
  {
    label: "GDELT DOC API",
    fetchPayload: (requestTimeoutMs) =>
      fetchGdeltFacts({
        categoryHint: "World",
        keywords: [
          "science center",
          "planetarium",
          "museum",
          "observatory",
          "railway station",
          "festival",
          "bridge opening",
        ],
        maxRecords: 2,
        timespan: "1day",
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_400),
        retryOn429: false,
      }),
  },
] as const;

const MARKETS_SIGNAL_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "Bloomberg Markets RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchBloombergMarketsFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "CoinDesk RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchCoinDeskFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
] as const;

async function fetchFirstSuccessful(
  sources: readonly TopicSourceFactory[],
  rotationBudgetMs: number,
  failurePrefix: string,
): Promise<MiroFactsPayload> {
  const errors: string[] = [];
  const startedAt = Date.now();

  for (const source of sources) {
    const remainingBudget = rotationBudgetMs - (Date.now() - startedAt);
    if (remainingBudget < SOURCE_ROTATION_MIN_BUDGET_MS) {
      errors.push(`rotation budget exhausted before ${source.label}`);
      break;
    }

    const sourceBudget = Math.max(
      SOURCE_ROTATION_MIN_BUDGET_MS,
      remainingBudget - SOURCE_ROTATION_RESERVE_MS,
    );

    try {
      return await source.fetchPayload(sourceBudget);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push(`${source.label}: ${reason}`);
    }
  }

  throw new Error(`${failurePrefix}. ${errors.join(" | ")}`);
}

async function fetchTechWorldFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  return fetchFirstSuccessful(
    TECH_WORLD_SOURCE_FACTORIES,
    requestTimeoutMs,
    "Unable to collect tech facts from RSS, HackerNews, or GDELT",
  );
}

async function fetchWorldFacts(requestTimeoutMs: number): Promise<MiroFactsPayload> {
  return fetchFirstSuccessful(
    WORLD_SOURCE_FACTORIES,
    requestTimeoutMs,
    "Unable to collect world facts from RSS or GDELT",
  );
}

async function fetchSportsTopicFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  return fetchFirstSuccessful(
    SPORTS_SOURCE_FACTORIES,
    requestTimeoutMs,
    "Unable to collect sports facts from live or RSS sources",
  );
}

async function fetchSupplementalMarketFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload | null> {
  try {
    return await fetchFirstSuccessful(
      MARKETS_SIGNAL_SOURCE_FACTORIES,
      requestTimeoutMs,
      "Supplemental market RSS sources failed",
    );
  } catch {
    return null;
  }
}

function mergeFacts(
  base: MiroFactsPayload,
  supplemental: MiroFactsPayload | null,
): MiroFactsPayload {
  if (!supplemental) {
    return base;
  }

  const mergedFacts = [...base.facts, ...supplemental.facts].filter(Boolean);
  return {
    ...base,
    source: `${base.source} + ${supplemental.source}`,
    facts: Array.from(new Set(mergedFacts)).slice(0, 4),
  };
}

async function fetchMarketsFxFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  const base = await fetchCurrencyFacts({
    requestTimeoutMs: Math.min(requestTimeoutMs, 2_500),
  });
  const supplemental = await fetchSupplementalMarketFacts(
    Math.min(requestTimeoutMs, 2_400),
  );
  return mergeFacts(base, supplemental);
}

async function fetchMarketsCryptoFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  const base = await fetchCryptoFacts({
    requestTimeoutMs: Math.min(requestTimeoutMs, 2_700),
  });
  const supplemental = await fetchSupplementalMarketFacts(
    Math.min(requestTimeoutMs, 2_400),
  );
  return mergeFacts(base, supplemental);
}

export function getTopicTimeoutProfile(topic: MiroTopic): TopicTimeoutProfile {
  return TOPIC_TIMEOUT_PROFILES[topic];
}

export function getGeneratorModelForTopic(
  topic: MiroTopic,
  fallbackModel: string,
  provider: MiroLlmProvider = "groq",
): string {
  if (
    provider === "groq" &&
    (topic === "markets_fx" || topic === "markets_crypto")
  ) {
    return DEFAULT_MARKETS_GENERATOR_MODEL;
  }

  return fallbackModel;
}

export function pickTopic(
  strategy: MiroSelectionStrategy,
  forcedTopic?: MiroTopic,
): TopicDefinition {
  if (forcedTopic) {
    const forced = TOPICS.find((topic) => topic.topic === forcedTopic);
    if (!forced) {
      throw new Error(`Unknown forced topic "${forcedTopic}".`);
    }

    return forced;
  }

  if (strategy === "random") {
    const index = Math.floor(Math.random() * TOPICS.length);
    return TOPICS[index];
  }

  if (strategy === "editorial_schedule" || strategy === "urgent_override") {
    const scheduled = TOPICS.find(
      (topic) => topic.topic === getDefaultTopicForSchedule(),
    );
    if (scheduled) {
      return scheduled;
    }
  }

  const rotationSeed = Math.floor(Date.now() / 60_000);
  return TOPICS[rotationSeed % TOPICS.length];
}
