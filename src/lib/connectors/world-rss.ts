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
    maxItems: 3,
    requestTimeoutMs: options.requestTimeoutMs,
  });
}

export function fetchGlobalVoicesFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.globalVoices, options);
}

export function fetchReutersWorldFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.reutersWorld, options);
}

export function fetchBbcWorldFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.bbcWorld, options);
}

export function fetchBeltaFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.belta, options);
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

export function fetchHabrAiFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.habrAi, options);
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

export function fetchBbcSportFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  return fetchPresetFacts(MIRO_RSS_FEED_PRESETS.bbcSport, options);
}
