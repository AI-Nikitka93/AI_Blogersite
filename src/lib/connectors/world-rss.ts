import { MIRO_RSS_FEED_PRESETS } from "./presets";
import { fetchRssFacts } from "./rss";
import type { ConnectorRuntimeOptions, MiroFactsPayload, RssFeedPreset } from "./types";

function fetchPresetFacts(
  preset: RssFeedPreset,
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchRssFacts(preset.url, {
    sourceName: preset.source,
    categoryHint: preset.category_hint,
    excludedKeywords: preset.excludedKeywords
      ? [...preset.excludedKeywords]
      : undefined,
    includeKeywords: preset.includeKeywords ? [...preset.includeKeywords] : undefined,
    singleItem: preset.singleItem,
    maxItems: 5,
    requestTimeoutMs: options.requestTimeoutMs,
  });
}

export function fetchOnlinerPeopleFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.onlinerPeople, options);
}

export function fetchOnlinerMoneyFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.onlinerMoney, options);
}

export function fetchTechCrunchFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.techCrunch, options);
}

export function fetchIxbtFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.ixbtNews, options);
}

export function fetchThreeDNewsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.threeDNews, options);
}

export function fetchArsTechnicaFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.arsTechnica, options);
}

export function fetchOnlinerTechFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.onlinerTech, options);
}

export function fetchScienceDailyTechFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.scienceDailyTechnology, options);
}

export function fetchNasaTechnologyFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.nasaTechnology, options);
}

export function fetchOpenAiNewsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.openAiNews, options);
}

export function fetchOpenAiDevelopersFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.openAiDevelopers, options);
}

export function fetchGoogleDeepMindFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.googleDeepMind, options);
}

export function fetchGoogleAiFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.googleAiBlog, options);
}

export function fetchGoogleResearchFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.googleResearch, options);
}

export function fetchAmazonScienceFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.amazonScience, options);
}

export function fetchMicrosoftResearchFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.microsoftResearch, options);
}

export function fetchMitMachineLearningFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.mitMachineLearning, options);
}

export function fetchHuggingFaceBlogFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.huggingFaceBlog, options);
}

export function fetchMicrosoftAiBlogFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.microsoftAiBlog, options);
}

export function fetchHabrDevelopFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.habrDevelop, options);
}

export function fetchHabrAiFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.habrAi, options);
}

export function fetchNplus1Facts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.nplus1, options);
}

export function fetchNakedScienceFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.nakedScience, options);
}

export function fetchPhysOrgFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.physOrg, options);
}

export function fetchNasaNewsReleaseFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.nasaNewsReleases, options);
}

export function fetchEsaSpaceScienceFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.esaSpaceScience, options);
}

export function fetchBloombergMarketsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.bloombergMarkets, options);
}

export function fetchCoinDeskFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.coinDesk, options);
}

export function fetchPressballFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.pressball, options);
}

export function fetchSportsRuFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.sportsRu, options);
}

export function fetchSportExpressFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.sportExpress, options);
}
