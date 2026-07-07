import {
  fetchAmazonScienceFacts,
  fetchArsTechnicaFacts,
  fetchBloombergMarketsFacts,
  fetchCoinDeskFacts,
  fetchCryptoFacts,
  fetchCurrencyFacts,
  fetchEsaSpaceScienceFacts,
  fetchGdeltFacts,
  fetchGoogleAiFacts,
  fetchGoogleDeepMindFacts,
  fetchHabrAiFacts,
  fetchHabrDevelopFacts,
  fetchHuggingFaceBlogFacts,
  fetchIxbtFacts,
  fetchMicrosoftResearchFacts,
  fetchMitMachineLearningFacts,
  fetchNakedScienceFacts,
  fetchNasaNewsReleaseFacts,
  fetchNasaTechnologyFacts,
  fetchNplus1Facts,
  fetchHackerNewsFacts,
  fetchOpenAiNewsFacts,
  fetchOnlinerPeopleFacts,
  fetchOnlinerTechFacts,
  fetchDevByFacts,
  fetchOfficeLifeFacts,
  fetchPhysOrgFacts,
  fetchScienceDailyTechFacts,
  fetchSportsRuFacts,
  fetchTechCrunchFacts,
  fetchThreeDNewsFacts,
  fetchSportsFacts,
  fetchSoccer365Facts,
  fetchSportExpressFacts,
  type MiroFactsPayload,
} from "../connectors";
import { getDefaultTopicForSchedule } from "../miro-schedule";
import {
  fetchRankedSuccessfulSource,
  type RankedFetchSource,
} from "./source-selection";
import type {
  MiroLlmProvider,
  MiroSelectionStrategy,
  MiroTopic,
  TopicDefinition,
  TopicTimeoutProfile,
} from "./types";

const FAST_MARKETS_GENERATOR_MODEL = "llama-3.3-70b-versatile";

function getConfiguredMarketsGeneratorModel(): string {
  return (
    process?.env?.MIRO_MARKETS_GENERATOR_MODEL ??
    process?.env?.MIRO_WRITER_MODEL ??
    process?.env?.MIRO_GENERATOR_MODEL ??
    FAST_MARKETS_GENERATOR_MODEL
  ).trim();
}

function shouldUseFastMarketWriter(model: string): boolean {
  return (
    process?.env?.MIRO_ALLOW_SLOW_MARKETS_WRITER !== "1" &&
    model.trim().toLowerCase() === "openai/gpt-oss-120b"
  );
}

const GDELT_SOURCE_ENABLED = process?.env?.MIRO_ENABLE_GDELT === "1";

type TopicSourceFactory = RankedFetchSource;

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
    totalTimeoutMs: 38_000,
    connectorReserveMs: 6_500,
    connectorCapMs: 3_600,
    gatekeeperCapMs: 2_600,
    generatorCapMs: 30_000,
    generatorMaxTokens: 2_200,
  },
  markets_fx: {
    totalTimeoutMs: 38_000,
    connectorReserveMs: 5_100,
    connectorCapMs: 2_600,
    gatekeeperCapMs: 2_600,
    generatorCapMs: 30_000,
    generatorMaxTokens: 3_000,
  },
  markets_crypto: {
    totalTimeoutMs: 38_000,
    connectorReserveMs: 5_200,
    connectorCapMs: 2_800,
    gatekeeperCapMs: 2_600,
    generatorCapMs: 30_000,
    generatorMaxTokens: 3_000,
  },
  tech_world: {
    totalTimeoutMs: 38_000,
    connectorReserveMs: 6_700,
    connectorCapMs: 3_800,
    gatekeeperCapMs: 2_800,
    generatorCapMs: 30_000,
    generatorMaxTokens: 2_200,
  },
  world: {
    totalTimeoutMs: 38_000,
    connectorReserveMs: 6_700,
    connectorCapMs: 3_800,
    gatekeeperCapMs: 2_800,
    generatorCapMs: 30_000,
    generatorMaxTokens: 2_200,
  },
} as const;

const SPORTS_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "Sports.ru RSS",
    sourceKind: "media",
    priority: 8,
    fetchPayload: (requestTimeoutMs) =>
      fetchSportsRuFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "Sport-Express RSS",
    sourceKind: "media",
    priority: 6,
    fetchPayload: (requestTimeoutMs) =>
      fetchSportExpressFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "Soccer365 RU/BY",
    sourceKind: "media",
    priority: 4,
    fetchPayload: (requestTimeoutMs) =>
      fetchSoccer365Facts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "TheSportsDB RU/BY",
    sourceKind: "api",
    priority: -2,
    fetchPayload: (requestTimeoutMs) =>
      fetchSportsFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
] as const;

const TECH_WORLD_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "OpenAI News RSS",
    sourceKind: "official",
    priority: 12,
    fetchPayload: (requestTimeoutMs) =>
      fetchOpenAiNewsFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_200),
      }),
  },
  {
    label: "Google DeepMind RSS",
    sourceKind: "official",
    priority: 10,
    fetchPayload: (requestTimeoutMs) =>
      fetchGoogleDeepMindFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 4_500),
      }),
  },
  {
    label: "Google AI RSS",
    sourceKind: "official",
    priority: 8,
    fetchPayload: (requestTimeoutMs) =>
      fetchGoogleAiFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_000),
      }),
  },
  {
    label: "Microsoft Research RSS",
    sourceKind: "expert",
    priority: 50,
    fetchPayload: (requestTimeoutMs) =>
      fetchMicrosoftResearchFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_200),
      }),
  },
  {
    label: "Amazon Science RSS",
    sourceKind: "expert",
    priority: 52,
    fetchPayload: (requestTimeoutMs) =>
      fetchAmazonScienceFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_200),
      }),
  },
  {
    label: "MIT Machine Learning RSS",
    sourceKind: "expert",
    priority: 18,
    fetchPayload: (requestTimeoutMs) =>
      fetchMitMachineLearningFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_200),
      }),
  },
  {
    label: "Hugging Face Blog RSS",
    sourceKind: "expert",
    priority: 4,
    fetchPayload: (requestTimeoutMs) =>
      fetchHuggingFaceBlogFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_000),
      }),
  },
  {
    label: "Habr AI RSS",
    sourceKind: "community",
    priority: 2,
    fetchPayload: (requestTimeoutMs) =>
      fetchHabrAiFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_000),
      }),
  },
  {
    label: "ScienceDaily Technology RSS",
    sourceKind: "expert",
    fetchPayload: (requestTimeoutMs) =>
      fetchScienceDailyTechFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "NASA Technology RSS",
    sourceKind: "official",
    fetchPayload: (requestTimeoutMs) =>
      fetchNasaTechnologyFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "Habr Develop RSS",
    sourceKind: "community",
    fetchPayload: (requestTimeoutMs) =>
      fetchHabrDevelopFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "iXBT RSS",
    sourceKind: "media",
    fetchPayload: (requestTimeoutMs) =>
      fetchIxbtFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "3DNews RSS",
    sourceKind: "media",
    fetchPayload: (requestTimeoutMs) =>
      fetchThreeDNewsFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "TechCrunch RSS",
    sourceKind: "media",
    fetchPayload: (requestTimeoutMs) =>
      fetchTechCrunchFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "Ars Technica RSS",
    sourceKind: "media",
    fetchPayload: (requestTimeoutMs) =>
      fetchArsTechnicaFacts({
        requestTimeoutMs,
      }),
  },
  {
    label: "Onliner Tech RSS",
    sourceKind: "media",
    fetchPayload: (requestTimeoutMs) =>
      fetchOnlinerTechFacts({
        requestTimeoutMs,
      }),
  },
  ...(GDELT_SOURCE_ENABLED
    ? [
        {
          label: "GDELT DOC API",
          sourceKind: "api",
          fetchPayload: (requestTimeoutMs) =>
            fetchGdeltFacts({
              categoryHint: "Tech",
              keywords: [
                "artificial intelligence",
                "AI model",
                "robotics",
                "chip design",
              ],
              maxRecords: 2,
              timespan: "1day",
              requestTimeoutMs: Math.min(requestTimeoutMs, 4_800),
              retryOn429: false,
            }),
        } satisfies TopicSourceFactory,
      ]
    : []),
  {
    label: "HackerNews",
    sourceKind: "community",
    fetchPayload: (requestTimeoutMs) =>
      fetchHackerNewsFacts({
        requestTimeoutMs,
      }),
  },
] as const;

const WORLD_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "Naked Science RSS",
    sourceKind: "expert",
    priority: 12,
    fetchPayload: (requestTimeoutMs) =>
      fetchNakedScienceFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "N+1 RSS",
    sourceKind: "expert",
    priority: 14,
    fetchPayload: (requestTimeoutMs) =>
      fetchNplus1Facts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 3_600),
      }),
  },
  {
    label: "Phys.org RSS",
    sourceKind: "expert",
    priority: 18,
    fetchPayload: (requestTimeoutMs) =>
      fetchPhysOrgFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "NASA News Releases RSS",
    sourceKind: "official",
    priority: -10,
    fetchPayload: (requestTimeoutMs) =>
      fetchNasaNewsReleaseFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "ESA Space Science RSS",
    sourceKind: "official",
    priority: -22,
    fetchPayload: (requestTimeoutMs) =>
      fetchEsaSpaceScienceFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  ...(GDELT_SOURCE_ENABLED
    ? [
        {
          label: "GDELT DOC API",
          sourceKind: "api",
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
              requestTimeoutMs: Math.min(requestTimeoutMs, 4_800),
              retryOn429: false,
            }),
        } satisfies TopicSourceFactory,
      ]
    : []),
  {
    label: "Onliner People RSS",
    sourceKind: "media",
    priority: -8,
    fetchPayload: (requestTimeoutMs) =>
      fetchOnlinerPeopleFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "Dev.by Tech RSS",
    sourceKind: "media",
    priority: -2,
    fetchPayload: (requestTimeoutMs) =>
      fetchDevByFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
] as const;

const MARKETS_SIGNAL_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "Bloomberg Markets RSS",
    sourceKind: "media",
    fetchPayload: (requestTimeoutMs) =>
      fetchBloombergMarketsFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "Office Life Markets RSS",
    sourceKind: "media",
    priority: -2,
    fetchPayload: (requestTimeoutMs) =>
      fetchOfficeLifeFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "CoinDesk RSS",
    sourceKind: "media",
    fetchPayload: (requestTimeoutMs) =>
      fetchCoinDeskFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
] as const;

const MARKETS_FX_BASE_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "Frankfurter FX API",
    sourceKind: "api",
    fetchPayload: (requestTimeoutMs) =>
      fetchCurrencyFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_500),
      }),
  },
] as const;

const MARKETS_CRYPTO_BASE_SOURCE_FACTORIES: ReadonlyArray<TopicSourceFactory> = [
  {
    label: "CoinGecko API",
    sourceKind: "api",
    fetchPayload: (requestTimeoutMs) =>
      fetchCryptoFacts({
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_700),
      }),
  },
] as const;

export type TopicSourceRegistryEntry = TopicSourceFactory & {
  topic: MiroTopic;
};

export function getTopicSourceRegistry(): readonly TopicSourceRegistryEntry[] {
  return [
    ...SPORTS_SOURCE_FACTORIES.map((source) => ({
      ...source,
      topic: "sports" as const,
    })),
    ...MARKETS_FX_BASE_SOURCE_FACTORIES.map((source) => ({
      ...source,
      topic: "markets_fx" as const,
    })),
    ...MARKETS_SIGNAL_SOURCE_FACTORIES.map((source) => ({
      ...source,
      topic: "markets_fx" as const,
    })),
    ...MARKETS_CRYPTO_BASE_SOURCE_FACTORIES.map((source) => ({
      ...source,
      topic: "markets_crypto" as const,
    })),
    ...MARKETS_SIGNAL_SOURCE_FACTORIES.map((source) => ({
      ...source,
      topic: "markets_crypto" as const,
    })),
    ...TECH_WORLD_SOURCE_FACTORIES.map((source) => ({
      ...source,
      topic: "tech_world" as const,
    })),
    ...WORLD_SOURCE_FACTORIES.map((source) => ({
      ...source,
      topic: "world" as const,
    })),
  ];
}

async function fetchRankedSuccessful(
  sources: readonly TopicSourceFactory[],
  rotationBudgetMs: number,
  failurePrefix: string,
): Promise<MiroFactsPayload> {
  const result = await fetchRankedSuccessfulSource(sources, {
    failurePrefix,
    rotationBudgetMs,
  });
  return result.payload;
}

async function fetchTechWorldFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  return fetchRankedSuccessful(
    TECH_WORLD_SOURCE_FACTORIES,
    requestTimeoutMs,
    "Unable to collect tech facts from RSS, HackerNews, or GDELT",
  );
}

async function fetchWorldFacts(requestTimeoutMs: number): Promise<MiroFactsPayload> {
  return fetchRankedSuccessful(
    WORLD_SOURCE_FACTORIES,
    requestTimeoutMs,
    "Unable to collect world facts from RSS or GDELT",
  );
}

async function fetchSportsTopicFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  return fetchRankedSuccessful(
    SPORTS_SOURCE_FACTORIES,
    requestTimeoutMs,
    "Unable to collect sports facts from live or RSS sources",
  );
}

async function fetchSupplementalMarketFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload | null> {
  try {
    return await fetchRankedSuccessful(
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
  const base = await MARKETS_FX_BASE_SOURCE_FACTORIES[0].fetchPayload(
    requestTimeoutMs,
  );
  const supplemental = await fetchSupplementalMarketFacts(
    Math.min(requestTimeoutMs, 2_400),
  );
  return mergeFacts(base, supplemental);
}

async function fetchMarketsCryptoFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  const base = await MARKETS_CRYPTO_BASE_SOURCE_FACTORIES[0].fetchPayload(
    requestTimeoutMs,
  );
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
    const configuredModel = getConfiguredMarketsGeneratorModel();
    return shouldUseFastMarketWriter(configuredModel)
      ? FAST_MARKETS_GENERATOR_MODEL
      : configuredModel;
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
