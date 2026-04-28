export { fetchGdeltFacts } from "./gdelt";
export {
  MIRO_RSS_FEED_PRESETS,
} from "./presets";
export { fetchRssFacts } from "./rss";
export { fetchSportsFacts, fetchSoccer365Facts } from "./sports";
export { fetchHackerNewsFacts } from "./tech";
export { fetchCryptoFacts, fetchCurrencyFacts } from "./markets";
export {
  fetchArsTechnicaFacts,
  fetchBbcSportFacts,
  fetchBbcWorldFacts,
  fetchBeltaFacts,
  fetchBloombergMarketsFacts,
  fetchCoinDeskFacts,
  fetchHabrAiFacts,
  fetchGlobalVoicesFacts,
  fetchOnlinerMoneyFacts,
  fetchOnlinerPeopleFacts,
  fetchOnlinerTechFacts,
  fetchPressballFacts,
  fetchReutersWorldFacts,
      fetchScienceDailyTechFacts,
      fetchSportExpressFacts,
      fetchSportsRuFacts,
      fetchTechCrunchFacts,
} from "./world-rss";
export type {
  ConnectorRuntimeOptions,
  GdeltFactsOptions,
  MiroCategoryHint,
  MiroFactsPayload,
  RssFactsOptions,
  RssFeedPreset,
} from "./types";

import { fetchGdeltFacts } from "./gdelt";
import { MIRO_RSS_FEED_PRESETS } from "./presets";
import { fetchRssFacts } from "./rss";
import { fetchSportsFacts, fetchSoccer365Facts } from "./sports";
import { fetchHackerNewsFacts } from "./tech";
import { fetchCryptoFacts, fetchCurrencyFacts } from "./markets";
import type { MiroFactsPayload } from "./types";

export async function exampleMiroConnectorUsage(): Promise<MiroFactsPayload[]> {
  const [sports, soccer365, fx, crypto, worldOrTech, rssTech, hn] =
    await Promise.all([
      fetchSportsFacts(),
      fetchSoccer365Facts(),
      fetchCurrencyFacts(),
      fetchCryptoFacts(),
      fetchGdeltFacts(),
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.techCrunch.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.techCrunch.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.techCrunch.category_hint,
        excludedKeywords: [
          ...(MIRO_RSS_FEED_PRESETS.techCrunch.excludedKeywords ?? []),
        ],
      }),
      fetchHackerNewsFacts(),
    ]);

  return [sports, soccer365, fx, crypto, worldOrTech, rssTech, hn];
}
