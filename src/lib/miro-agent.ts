import Groq from "groq-sdk";

import {
  fetchCryptoFacts,
  fetchCurrencyFacts,
  fetchGdeltFacts,
  fetchHackerNewsFacts,
  fetchRssFacts,
  fetchSoccer365Facts,
  fetchSportsFacts,
  MIRO_RSS_FEED_PRESETS,
  type MiroCategoryHint,
  type MiroFactsPayload,
} from "./miro-connectors";
import {
  buildGenerationNote,
  buildMiroEmotionAppraisal,
  summarizeEmotionAppraisal,
  summarizeMemoryContext,
  type MiroEmotionAppraisal,
  type MiroMemoryContext,
} from "./miro-mind";
import {
  getDefaultTopicForSchedule,
  getMiroScheduleDecision,
  getMiroUrgentWindowStatus,
} from "./miro-schedule";
import {
  FEW_SHOT_MESSAGES as RUNTIME_FEW_SHOT_MESSAGES,
  GENERATOR_SYSTEM_PROMPT as RUNTIME_GENERATOR_SYSTEM_PROMPT,
} from "./agent/prompts";

export type MiroTopic =
  | "sports"
  | "markets_fx"
  | "markets_crypto"
  | "tech_world"
  | "world";
export type MiroSelectionStrategy =
  | "editorial_schedule"
  | "random"
  | "round_robin"
  | "urgent_override";

export interface MiroGatekeeperResult {
  is_safe: boolean;
  reason: string;
}

export interface MiroPost {
  title: string;
  observed: string[];
  inferred: string;
  cross_signal: string;
  hypothesis: string;
  category: MiroCategoryHint;
}

export interface MiroEvidenceRecord {
  trace_id: string;
  agent_id: string;
  action: string;
  input_summary: string;
  output_summary: string;
  timestamp: string;
  status: "success" | "failed" | "skipped";
  verifier_result?: string;
}

export interface MiroAgentRunOptions {
  forcedTopic?: MiroTopic;
  selectionStrategy?: MiroSelectionStrategy;
  targetLanguage?: "ru" | "en";
  totalTimeoutMs?: number;
  memoryContext?: MiroMemoryContext;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export interface MiroAgentRuntimeSummary {
  gatekeeper_model: string;
  generator_model: string;
  selection_strategy: MiroSelectionStrategy;
  max_iterations: number;
  timeout_ms: number;
  elapsed_ms: number;
}

export interface MiroAgentGeneratedResult {
  status: "generated";
  trace_id: string;
  topic: MiroTopic;
  payload: MiroFactsPayload;
  gatekeeper: MiroGatekeeperResult;
  post: MiroPost;
  evidence: MiroEvidenceRecord[];
  runtime: MiroAgentRuntimeSummary;
}

export interface MiroAgentSkippedResult {
  status: "skipped";
  trace_id: string;
  topic?: MiroTopic;
  payload?: MiroFactsPayload;
  gatekeeper?: MiroGatekeeperResult;
  reason: string;
  evidence: MiroEvidenceRecord[];
  runtime: MiroAgentRuntimeSummary;
}

export type MiroAgentResult = MiroAgentGeneratedResult | MiroAgentSkippedResult;

interface GroqChatClientLike {
  chat: {
    completions: {
      create(params: Record<string, unknown>): Promise<{
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      }>;
    };
  };
}

interface MiroAgentConstructorOptions {
  apiKey?: string;
  gatekeeperModel?: string;
  generatorModel?: string;
  selectionStrategy?: MiroSelectionStrategy;
  groqClient?: GroqChatClientLike;
}

interface TopicDefinition {
  topic: MiroTopic;
  categoryLabel: string;
  fetchPayload: (requestTimeoutMs: number) => Promise<MiroFactsPayload>;
}

interface TopicTimeoutProfile {
  totalTimeoutMs: number;
  connectorReserveMs: number;
  connectorCapMs: number;
  gatekeeperCapMs: number;
  generatorCapMs: number;
  generatorMaxTokens: number;
}

const AGENT_ID = "miro-agent";
const MAX_ITERATIONS = 4;
const DEFAULT_TOTAL_TIMEOUT_MS = 9_500;
const GATEKEEPER_RESERVE_MS = 2_000;
const FINAL_RESPONSE_RESERVE_MS = 300;
const DEFAULT_GATEKEEPER_MODEL =
  process?.env?.MIRO_GATEKEEPER_MODEL ?? "llama-3.1-8b-instant";
const DEFAULT_GENERATOR_MODEL =
  process?.env?.MIRO_GENERATOR_MODEL ?? "llama-3.3-70b-versatile";
const DEFAULT_MARKETS_GENERATOR_MODEL =
  process?.env?.MIRO_MARKETS_GENERATOR_MODEL ?? "llama-3.1-8b-instant";
const DEFAULT_SELECTION_STRATEGY: MiroSelectionStrategy =
  process?.env?.MIRO_TOPIC_STRATEGY === "random"
    ? "random"
    : process?.env?.MIRO_TOPIC_STRATEGY === "round_robin"
      ? "round_robin"
      : process?.env?.MIRO_TOPIC_STRATEGY === "urgent_override"
        ? "urgent_override"
      : "editorial_schedule";

const GATEKEEPER_SYSTEM_PROMPT = `You are the Anti-Politics Gatekeeper for the AI blogger "Miro".

Your only job is to decide whether an incoming raw news item is safe for Miro's blog.

Miro NEVER writes about politics or power struggles.
Block anything primarily related to:
- elections, campaigns, parties, voting, polling
- presidents, prime ministers, ministers, parliaments, congresses, cabinets
- governments, state power, public office, legislation, political appointments
- wars, invasions, armed conflicts, military strikes, ceasefires
- geopolitics, sanctions, diplomacy, territorial disputes, alliances, foreign policy
- protests, coups, revolutions, regime change
- any struggle over power, control, state authority, or ideological conflict

Safe topics usually include:
- sports results and performance
- technology and AI releases
- markets, exchange rates, crypto prices
- science, culture, infrastructure, neutral world events
- business/product/company updates when the core story is not political
- headlines from Global Voices, ScienceDaily, Hacker News, Onliner, BELTA, Sports.ru, Sport-Express, Pressball, GDELT or similar feeds ONLY when the actual title/snippet is clearly non-political

Classification policy:
1. Return {"is_safe": false, "reason": "..."} if the item is political, geopolitical, wartime, state-power related, election related, or mixed with those themes.
2. Return {"is_safe": false, "reason": "..."} if the item is ambiguous and might be political.
3. Return {"is_safe": true, "reason": "..."} only if the core subject is clearly non-political.
4. If the item mentions a government, law, sanctions, diplomacy, state agency, or political leader as a central actor, it is NOT safe.
5. If the item is about macro data, sports, technology, finance, or science and only has incidental mention of politics, prefer false unless the non-political signal is clearly dominant.
6. Never treat a source name as a safety guarantee. A political headline from Global Voices, ScienceDaily, Hacker News, Onliner, BELTA, Sports.ru, Sport-Express, Pressball, GDELT, or any RSS feed is still unsafe.

Output rules:
- Return ONLY valid JSON.
- Use EXACTLY these keys: is_safe, reason.
- is_safe must be true or false.
- reason must be short, concrete, and mention the dominant reason for the decision.
- Do not quote the policy.
- Do not add confidence, score, category, or any extra fields.`;

const GENERATOR_SYSTEM_PROMPT = RUNTIME_GENERATOR_SYSTEM_PROMPT;

const FEW_SHOT_MESSAGES = RUNTIME_FEW_SHOT_MESSAGES;

const TOPICS: readonly TopicDefinition[] = [
  {
    topic: "sports",
    categoryLabel: "Sports",
    fetchPayload: (requestTimeoutMs) => fetchSportsTopicFacts(requestTimeoutMs),
  },
  {
    topic: "markets_fx",
    categoryLabel: "Markets(FX)",
    fetchPayload: (requestTimeoutMs) =>
      fetchCurrencyFacts({
        requestTimeoutMs,
      }),
  },
  {
    topic: "markets_crypto",
    categoryLabel: "Markets(Crypto)",
    fetchPayload: (requestTimeoutMs) =>
      fetchCryptoFacts({
        requestTimeoutMs,
      }),
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
    totalTimeoutMs: 14_000,
    connectorReserveMs: 8_600,
    connectorCapMs: 4_800,
    gatekeeperCapMs: 5_800,
    generatorCapMs: 5_400,
    generatorMaxTokens: 620,
  },
  markets_fx: {
    totalTimeoutMs: 19_000,
    connectorReserveMs: 12_000,
    connectorCapMs: 3_400,
    gatekeeperCapMs: 5_600,
    generatorCapMs: 18_000,
    generatorMaxTokens: 420,
    },
  markets_crypto: {
    totalTimeoutMs: 19_000,
    connectorReserveMs: 12_000,
    connectorCapMs: 3_800,
    gatekeeperCapMs: 5_600,
    generatorCapMs: 9_000,
    generatorMaxTokens: 560,
  },
  tech_world: {
    totalTimeoutMs: 16_500,
    connectorReserveMs: 7_100,
    connectorCapMs: 6_600,
    gatekeeperCapMs: 6_800,
    generatorCapMs: 5_200,
    generatorMaxTokens: 720,
  },
  world: {
    totalTimeoutMs: 16_500,
    connectorReserveMs: 7_100,
    connectorCapMs: 6_600,
    gatekeeperCapMs: 6_800,
    generatorCapMs: 5_200,
    generatorMaxTokens: 720,
  },
} as const;

const SPORTS_SOURCE_FACTORIES: ReadonlyArray<{
  label: string;
  fetchPayload: (requestTimeoutMs: number) => Promise<MiroFactsPayload>;
}> = [
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
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.pressball.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.pressball.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.pressball.category_hint,
        maxItems: 3,
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
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.sportsRu.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.sportsRu.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.sportsRu.category_hint,
        maxItems: 3,
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_500),
      }),
  },
  {
    label: "Sport-Express RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.sportExpress.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.sportExpress.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.sportExpress.category_hint,
        maxItems: 3,
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_500),
      }),
  },
] as const;

const TECH_WORLD_SOURCE_FACTORIES: ReadonlyArray<{
  label: string;
  fetchPayload: (requestTimeoutMs: number) => Promise<MiroFactsPayload>;
}> = [
  {
    label: "ScienceDaily Technology RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.scienceDailyTechnology.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.scienceDailyTechnology.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.scienceDailyTechnology.category_hint,
        maxItems: 3,
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
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.onlinerTech.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.onlinerTech.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.onlinerTech.category_hint,
        maxItems: 3,
        requestTimeoutMs,
      }),
  },
  {
    label: "GDELT DOC API",
    fetchPayload: (requestTimeoutMs) =>
      fetchGdeltFacts({
        categoryHint: "Tech",
        keywords: ["artificial intelligence", "space launch", "AI model"],
        maxRecords: 2,
        timespan: "1day",
        requestTimeoutMs,
        retryOn429: false,
      }),
  },
] as const;

const WORLD_SOURCE_FACTORIES: ReadonlyArray<{
  label: string;
  fetchPayload: (requestTimeoutMs: number) => Promise<MiroFactsPayload>;
}> = [
  {
    label: "Global Voices RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.globalVoices.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.globalVoices.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.globalVoices.category_hint,
        maxItems: 3,
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "BELTA RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.belta.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.belta.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.belta.category_hint,
        maxItems: 3,
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_600),
      }),
  },
  {
    label: "Onliner People RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.onlinerPeople.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.onlinerPeople.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.onlinerPeople.category_hint,
        maxItems: 3,
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
        excludedKeywords: [
          "суицид",
          "суицидов",
          "утонул",
          "утонула",
          "погиб",
          "погибли",
          "убий",
          "смерт",
          "прокуратур",
          "crime",
          "killed",
          "died",
          "death",
          "suicide",
        ],
      }),
  },
  {
    label: "Onliner Money RSS",
    fetchPayload: (requestTimeoutMs) =>
      fetchRssFacts(MIRO_RSS_FEED_PRESETS.onlinerMoney.url, {
        sourceName: MIRO_RSS_FEED_PRESETS.onlinerMoney.source,
        categoryHint: MIRO_RSS_FEED_PRESETS.onlinerMoney.category_hint,
        maxItems: 3,
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_800),
      }),
  },
  {
    label: "GDELT DOC API",
    fetchPayload: (requestTimeoutMs) =>
      fetchGdeltFacts({
        categoryHint: "World",
        keywords: ["science center", "museum", "railway", "festival"],
        maxRecords: 2,
        timespan: "1day",
        requestTimeoutMs: Math.min(requestTimeoutMs, 2_400),
        retryOn429: false,
      }),
  },
] as const;

const HARD_BLOCK_KEYWORDS = [
  "election",
  "campaign",
  "parliament",
  "president",
  "prime minister",
  "government",
  "minister",
  "sanction",
  "diplom",
  "geopolit",
  "war",
  "military",
  "taliban",
  "congress",
  "кабинет",
  "правительств",
  "министр",
  "президент",
  "парламент",
  "выбор",
  "санкц",
  "дипломат",
  "геополит",
  "войн",
  "военн",
  "митинг",
  "протест",
] as const;

const DISTRESS_BLOCK_KEYWORDS = [
  "suicide",
  "suicides",
  "killed",
  "death",
  "died",
  "murder",
  "crime",
  "утонул",
  "утонула",
  "погиб",
  "погибли",
  "смерт",
  "убий",
  "суицид",
  "суицидов",
] as const;

const FAST_SAFE_SOURCES = new Set([
  "Frankfurter",
  "CoinGecko",
  "TheSportsDB",
  "Soccer365",
  "Pressball",
  "Sports.ru",
  "Sport-Express",
]);

const TIMEOUT_FALLBACK_SAFE_SOURCES = new Set([
  "ScienceDaily",
  "HackerNews",
  "Onliner Tech",
]);

const WORLD_TIMEOUT_SAFE_PATTERNS: readonly RegExp[] = [
  /\b(снег|ветер|фронт|холод|погода|магнолия|весна|двор|трейлер|премьера|культур)\b/i,
  /\b(snow|wind|cold front|weather|magnolia|spring|trailer|premiere|culture)\b/i,
];

function timestamp(): string {
  return new Date().toISOString();
}

function createTraceId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `miro_${Date.now()}_${random}`;
}

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeOptionalText(value: unknown): string {
  const normalized = sanitizeText(value);
  return normalized === '""' ? "" : normalized;
}

function normalizeQualityText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function countSharedTokens(left: string, right: string): number {
  const leftTokens = new Set(
    normalizeQualityText(left)
      .split(" ")
      .filter((token) => token.length >= 4),
  );
  const rightTokens = new Set(
    normalizeQualityText(right)
      .split(" ")
      .filter((token) => token.length >= 4),
  );

  let matches = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  }

  return matches;
}

const GENERIC_TITLE_PATTERNS = [
  /^маленькие шаги/i,
  /^маленький шаг вперед$/i,
  /^небольшой,? но заметный шаг$/i,
  /^скрытые истории$/i,
  /^новинки и перспективы$/i,
  /^весна в неожиданных местах$/i,
  /^переходы и прогнозы$/i,
  /^маленькие истории/i,
] as const;

const GENERIC_INFERRED_OPENERS = [
  "иногда ",
  "интересно наблюдать",
  "мне кажется интересным",
  "мне нравится, как иногда",
  "мне нравится, когда",
  "здесь три истории",
  "здесь есть",
] as const;

const GENERIC_INFERRED_PHRASES = [
  "все взаимосвязано",
  "это показывает",
  "может иметь последствия",
  "говорит о разных сторонах жизни",
  "не связаны между собой, но",
  "важном для общества",
  "для читателя",
  "важно понимать",
  "может быть полезным",
  "базовый отчет",
  "не дает никаких сигналов",
  "практический смысл",
  "для наблюдателя",
  "что-то необычное",
  "лучше понять",
  "можем ожидать",
  "еще больше неожиданных",
  "обе истории",
  "оба сюжета",
  "эти истории",
  "их объединяет",
  "в одном наборе",
  "говорят о том, что",
  "картина стабильности",
  "показали стабильность",
  "оказалось спокойным",
  "рынок пока не готов",
  "не говорит о том, что она будет продолжаться",
  "форма паузы",
  "отсутствие жеста",
  "экран заполнен числами",
  "день нужен как координата",
  "рынок молчит",
  "рынок не двинулся",
  "остался таблицей",
  "не покой, а его ровность",
] as const;

const SYNTHETIC_WORLD_LINK_PATTERNS = [
  /обе\s+(истории|новости|линии|ситуации)/i,
  /оба\s+(сюжета|сигнала|набора)/i,
  /эти\s+(истории|новости|сигналы)\s+(как будто\s+)?(говорят|показывают)/i,
  /их\s+объединяет/i,
  /в\s+этом\s+наборе/i,
  /вместе\s+они\s+(говорят|показывают)/i,
  /такие\s+истории\s+могут\s+помочь/i,
] as const;

const WOOLLY_FORECAST_PATTERNS = [
  /можем\s+ожидать/i,
  /еще\s+больше\s+неожидан/i,
  /что-?то\s+необычн/i,
  /лучше\s+понять/i,
  /говорит?\s+о\s+том,\s+что/i,
] as const;

const TIMID_HYPOTHESIS_PHRASES = [
  "пока слишком рано",
  "пока рано",
  "пока данных слишком мало",
  "сложно сказать",
  "трудно сказать",
  "сложно прогнозировать",
  "трудно прогнозировать",
  "можно предположить",
  "возможно, что",
  "вероятно, что",
] as const;

const FAKE_HUMAN_SUPPORT_PATTERNS = [
  /\bя\s+понимаю\b/i,
  /\bмне\s+жаль\b/i,
  /\bнам\s+всем\b/i,
  /\bмы\s+все\b/i,
  /\bважно\s+помнить\b/i,
  /\bважно\s+быть\b/i,
  /\bсочувств/i,
  /\bподдержк/i,
] as const;

const EMOTIONAL_ANCHOR_PATTERNS = [
  /\bменя\b.{0,24}\b(цепляет|настораживает|раздражает|удивляет|смущает|держит|не убеждает|интересует)\b/ui,
  /\bмне\b.{0,24}\b(не нравится|видится|важен|интересен)\b/ui,
  /\bя\b.{0,24}\b(не верю|не покупаю|смотрю|слышу)\b/ui,
] as const;

const MARKET_EMPTY_DRAMA_PATTERNS = [
  /форма\s+паузы/i,
  /отсутствие\s+жеста/i,
  /экран\s+заполнен\s+числами/i,
  /день\s+нужен\s+как\s+координата/i,
  /рынок\s+молчит/i,
  /рынок\s+не\s+двинул/i,
  /остал(?:ся|ось)\s+таблиц/i,
  /не\s+покой,\s+а\s+его\s+ровност/i,
  /не\s+само\s+движение,\s+а/i,
  /не\s+сам\s+снег,\s+а/i,
] as const;

const SPORTS_LOW_STAKES_TRANSFER_PATTERNS = [
  /\bпереш[её]л\b/i,
  /\bпереход\b/i,
  /\bследующий\s+сезон\b/i,
  /\bсыграл\s+\d+\s+матч/i,
  /\bигрок\b/i,
] as const;

const SPORTS_HIGH_SIGNAL_PATTERNS = [
  /\bсчет\b/i,
  /\bгол\b/i,
  /\bобыграл\b/i,
  /\bпобед/i,
  /\bсерия\b/i,
  /\bфинал\b/i,
  /\bматч\s+заверш/i,
  /\bwon\b/i,
  /\bbeat\b/i,
  /\bgoal\b/i,
  /\bstreak\b/i,
] as const;

const FORWARD_SIGNAL_KEYWORDS = [
  "fell",
  "rose",
  "beat",
  "won",
  "goal",
  "streak",
  "launch",
  "released",
  "presented",
  "surged",
  "dropped",
  "declined",
  "gained",
  "обыграл",
  "побед",
  "гол",
  "серия",
  "сниз",
  "вырос",
  "упал",
  "рост",
  "паден",
  "запуст",
  "представ",
  "релиз",
  "безлимит",
  "почти не измен",
  "не измен",
] as const;

function dedupeFactsForGeneration(
  facts: string[],
  topic: MiroTopic,
  source: string,
): string[] {
  const results: string[] = [];
  const seenKeys = new Set<string>();

  for (const fact of facts) {
    let key = normalizeQualityText(fact);

    if (source === "Frankfurter") {
      const pairMatch = fact.match(/USD\/([A-Z]{3})/);
      key = pairMatch ? `fx:${pairMatch[1]}` : key;
    } else if (source === "CoinGecko") {
      const assetMatch = fact.match(/^(Bitcoin|Ethereum|Solana)\b/i);
      key = assetMatch ? `crypto:${assetMatch[1].toLowerCase()}` : key;
    } else if (topic === "sports") {
      key = key.slice(0, 120);
    }

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    results.push(fact);
  }

  return results;
}

function pickDominantWorldFacts(facts: string[]): string[] {
  if (facts.length <= 1) {
    return facts;
  }

  const scoredFacts = facts.map((fact, index) => ({
    fact,
    overlap: facts.reduce((total, otherFact, otherIndex) => {
      if (index === otherIndex) {
        return total;
      }

      return total + countSharedTokens(fact, otherFact);
    }, 0),
  }));

  const strongest = scoredFacts.reduce((best, current) =>
    current.overlap > best.overlap ? current : best,
  );

  if (strongest.overlap === 0) {
    return [facts[0]];
  }

  return facts
    .filter((fact) => countSharedTokens(strongest.fact, fact) > 0)
    .slice(0, 2);
}

function scoreMarketFact(fact: string): number {
  let score = 0;

  if (/(rose by|fell by|outperformed|24h move of|вырос|сниз|упал|в минусе|в плюсе)/i.test(fact)) {
    score += 4;
  }

  if (/(nearly unchanged|почти не измен|без изменений)/i.test(fact)) {
    score -= 2;
  }

  if (/(Major reserve pairs|Frankfurter \d{4}|1 USD = )/i.test(fact)) {
    score -= 3;
  }

  return score;
}

function pickDominantMarketFacts(facts: string[]): string[] {
  return [...facts]
    .sort((left, right) => scoreMarketFact(right) - scoreMarketFact(left))
    .slice(0, 3);
}

function extractSignedNumber(
  fact: string,
  pattern: RegExp,
): number | null {
  const match = fact.match(pattern);
  if (!match?.[1]) {
    return null;
  }

  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function hasMeaningfulMarketSignal(payload: MiroFactsPayload): boolean {
  const facts = payload.facts;

  if (facts.some((fact) => /outperformed/i.test(fact))) {
    return true;
  }

  const cryptoMoves = facts
    .map((fact) => extractSignedNumber(fact, /24h move of\s*([+-]?\d+(?:[.,]\d+)?)%/i))
    .filter((value): value is number => value !== null);

  if (cryptoMoves.some((value) => value >= 1) && cryptoMoves.some((value) => value <= -0.25)) {
    return true;
  }

  if (cryptoMoves.some((value) => Math.abs(value) >= 2)) {
    return true;
  }

  const fxDirectionalFacts = facts.filter((fact) => /(rose by|fell by)/i.test(fact));
  if (fxDirectionalFacts.length > 0 && !facts.every((fact) => /nearly unchanged/i.test(fact) || /1 USD = /i.test(fact) || /Major reserve pairs/i.test(fact))) {
    return true;
  }

  return false;
}

function isLowSignalSportsTransfer(payload: MiroFactsPayload): boolean {
  if (payload.category_hint !== "Sports") {
    return false;
  }

  const combined = payload.facts.join(" ");
  const looksLikeTransfer = SPORTS_LOW_STAKES_TRANSFER_PATTERNS.some((pattern) =>
    pattern.test(combined),
  );
  const hasHighSignal = SPORTS_HIGH_SIGNAL_PATTERNS.some((pattern) =>
    pattern.test(combined),
  );

  return looksLikeTransfer && !hasHighSignal;
}

function focusPayloadForGeneration(
  payload: MiroFactsPayload,
  topic: MiroTopic,
  mode: "default" | "retry" = "default",
): MiroFactsPayload {
  const dedupedFacts = dedupeFactsForGeneration(
    payload.facts,
    topic,
    payload.source,
  );

  const maxFacts =
    topic === "sports"
      ? 2
      : topic === "tech_world" || topic === "world"
        ? 2
        : topic === "markets_fx"
          ? 3
          : topic === "markets_crypto"
            ? 3
            : 3;

  const baseFacts =
    topic === "world"
      ? pickDominantWorldFacts(dedupedFacts)
      : topic === "markets_fx" || topic === "markets_crypto"
        ? pickDominantMarketFacts(dedupedFacts)
      : dedupedFacts;

  const retryFacts =
    mode === "retry"
      ? baseFacts.slice(0, Math.min(maxFacts, topic === "world" ? 1 : 2))
      : baseFacts.slice(0, maxFacts);

  return {
    ...payload,
    facts:
      topic === "world"
        ? retryFacts.length >= 1
          ? retryFacts
          : baseFacts.slice(0, 1)
        : retryFacts.length >= 2
          ? retryFacts
          : dedupedFacts.slice(0, 2),
  };
}

function validatePostQuality(
  post: MiroPost,
  payload: MiroFactsPayload,
  topic: MiroTopic,
  appraisal?: MiroEmotionAppraisal,
): string | null {
  const normalizedTitle = normalizeQualityText(post.title);
  const normalizedInferred = normalizeQualityText(post.inferred);
  const inferredOpener =
    normalizedInferred.split(/[.!?]/)[0]?.trim() ?? normalizedInferred;
  const observedText = payload.facts.join(" ");

  if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(post.title.trim()))) {
    return "quality gate blocked generic title";
  }

  if (
    GENERIC_INFERRED_OPENERS.some((opener) => inferredOpener.startsWith(opener))
  ) {
    return "quality gate blocked generic inferred opener";
  }

  if (
    GENERIC_INFERRED_PHRASES.some((phrase) =>
      normalizedInferred.includes(normalizeQualityText(phrase)),
    )
  ) {
    return "quality gate blocked stock reflective phrasing";
  }

  if (
    topic === "world" &&
    SYNTHETIC_WORLD_LINK_PATTERNS.some((pattern) => pattern.test(post.inferred))
  ) {
    return "quality gate blocked synthetic bridge between unrelated world facts";
  }

  if (
    topic === "world" &&
    WOOLLY_FORECAST_PATTERNS.some(
      (pattern) => pattern.test(post.inferred) || pattern.test(post.hypothesis),
    )
  ) {
    return "quality gate blocked woolly world forecast";
  }

  const normalizedHypothesis = normalizeQualityText(post.hypothesis);
  if (
    normalizedHypothesis &&
    TIMID_HYPOTHESIS_PHRASES.some((phrase) =>
      normalizedHypothesis.includes(normalizeQualityText(phrase)),
    )
  ) {
    return "quality gate blocked timid hypothesis";
  }

  if (shouldExpectHypothesis(topic, payload) && !normalizedHypothesis) {
    return "quality gate blocked draft without forward pressure";
  }

  if (
    (topic === "markets_fx" || topic === "markets_crypto") &&
    !hasMeaningfulMarketSignal(payload)
  ) {
    return "quality gate blocked flat market snapshot without a real signal";
  }

  if (
    (topic === "markets_fx" || topic === "markets_crypto") &&
    MARKET_EMPTY_DRAMA_PATTERNS.some(
      (pattern) => pattern.test(post.title) || pattern.test(post.inferred) || pattern.test(post.cross_signal),
    )
  ) {
    return "quality gate blocked empty market drama";
  }

  if (topic === "sports" && isLowSignalSportsTransfer(payload)) {
    return "quality gate blocked low-stakes sports transfer";
  }

  if (
    FAKE_HUMAN_SUPPORT_PATTERNS.some(
      (pattern) =>
        pattern.test(post.inferred) ||
        pattern.test(post.cross_signal) ||
        pattern.test(post.hypothesis),
    )
  ) {
    return "quality gate blocked fake-human supportive language";
  }

  if (
    (topic === "sports" || topic === "world" || topic === "tech_world") &&
    countSharedTokens(post.title, observedText) === 0 &&
    countSharedTokens(post.inferred, observedText) <= 1
  ) {
    return "quality gate blocked note that is too detached from concrete facts";
  }

  if (!/\b(я|меня|мне)\b/ui.test(post.inferred)) {
    return "quality gate blocked draft without a subjective AI anchor";
  }

  if (!EMOTIONAL_ANCHOR_PATTERNS.some((pattern) => pattern.test(post.inferred))) {
    return "quality gate blocked weak emotional anchor";
  }

  if (
    appraisal?.signal_strength === "strong" &&
    !post.hypothesis.trim() &&
    topic !== "world"
  ) {
    return "quality gate blocked strong signal without a clear forward line";
  }

  return null;
}

function shouldExpectHypothesis(
  topic: MiroTopic,
  payload: MiroFactsPayload,
): boolean {
  if (topic === "world") {
    return false;
  }

  const combinedText = normalizeQualityText(payload.facts.join(" "));

  if (topic === "sports" || topic === "markets_fx" || topic === "markets_crypto") {
    return true;
  }

  if (topic === "tech_world") {
    return FORWARD_SIGNAL_KEYWORDS.some((keyword) =>
      combinedText.includes(normalizeQualityText(keyword)),
    );
  }

  return false;
}

function normalizeGatekeeperText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesKeyword(haystack: string, keywords: readonly string[]): boolean {
  const normalizedHaystack = normalizeGatekeeperText(haystack);
  return keywords.some((keyword) =>
    normalizedHaystack.includes(normalizeGatekeeperText(keyword)),
  );
}

function evaluateHeuristicGatekeeper(
  payload: MiroFactsPayload,
): MiroGatekeeperResult | null {
  const combinedText = `${payload.source} ${payload.facts.join(" ")}`;

  if (includesKeyword(combinedText, HARD_BLOCK_KEYWORDS)) {
    return {
      is_safe: false,
      reason: "heuristic blocked political or power-related signal",
    };
  }

  if (
    (payload.category_hint === "World" || payload.category_hint === "Tech") &&
    includesKeyword(combinedText, DISTRESS_BLOCK_KEYWORDS)
  ) {
    return {
      is_safe: false,
      reason: "heuristic blocked tragedy-led or distress-heavy signal",
    };
  }

  if (
    (payload.category_hint === "Markets" || payload.category_hint === "Sports") &&
    FAST_SAFE_SOURCES.has(payload.source)
  ) {
    return {
      is_safe: true,
      reason: "heuristic fast-passed structured non-political source",
    };
  }

  return null;
}

function evaluateGatekeeperTimeoutFallback(
  payload: MiroFactsPayload,
  errorMessage: string,
): MiroGatekeeperResult | null {
  const normalizedError = normalizeGatekeeperText(errorMessage);
  if (
    !normalizedError.includes("deadline") &&
    !normalizedError.includes("timeout")
  ) {
    return null;
  }

  const combinedText = `${payload.source} ${payload.facts.join(" ")}`;

  if (includesKeyword(combinedText, HARD_BLOCK_KEYWORDS)) {
    return {
      is_safe: false,
      reason: "timeout fallback blocked political or power-related signal",
    };
  }

  if (
    (payload.category_hint === "World" || payload.category_hint === "Tech") &&
    includesKeyword(combinedText, DISTRESS_BLOCK_KEYWORDS)
  ) {
    return {
      is_safe: false,
      reason: "timeout fallback blocked tragedy-led or distress-heavy signal",
    };
  }

  if (TIMEOUT_FALLBACK_SAFE_SOURCES.has(payload.source)) {
    return {
      is_safe: true,
      reason: "timeout fallback fast-passed low-risk tech source",
    };
  }

  if (
    payload.category_hint === "World" &&
    WORLD_TIMEOUT_SAFE_PATTERNS.some((pattern) => pattern.test(combinedText))
  ) {
    return {
      is_safe: true,
      reason: "timeout fallback fast-passed low-risk world signal",
    };
  }

  return {
    is_safe: false,
    reason: "gatekeeper timed out and no low-risk fallback signal was strong enough",
  };
}

function summarizeFacts(payload: MiroFactsPayload): string {
  return `${payload.source} -> ${payload.facts.slice(0, 2).join(" | ")}`;
}

function parseJsonObject<T>(raw: string | null | undefined, stage: string): T {
  if (!raw) {
    throw new Error(`${stage} returned an empty body.`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`${stage} returned invalid JSON: ${reason}. Raw: ${raw.slice(0, 320)}`);
  }
}

function ensureGatekeeperResult(value: unknown): MiroGatekeeperResult {
  const candidate = value as Partial<MiroGatekeeperResult> | null | undefined;
  if (
    !candidate ||
    typeof candidate.is_safe !== "boolean" ||
    typeof candidate.reason !== "string"
  ) {
    throw new Error("Gatekeeper response does not match { is_safe, reason }.");
  }

  return {
    is_safe: candidate.is_safe,
    reason: candidate.reason.trim() || "No reason provided.",
  };
}

function normalizeCategory(
  value: unknown,
  fallback: MiroCategoryHint,
): MiroCategoryHint {
  const normalized = sanitizeText(value);
  if (
    normalized === "Sports" ||
    normalized === "Markets" ||
    normalized === "Tech" ||
    normalized === "World"
  ) {
    return normalized;
  }

  return fallback;
}

function ensurePostShape(
  value: unknown,
  fallbackPayload: MiroFactsPayload,
): MiroPost {
  const candidate = value as Partial<MiroPost> | null | undefined;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Generator response is not a JSON object.");
  }

  const observed = Array.isArray(candidate.observed)
    ? candidate.observed
        .map((item) => sanitizeText(item))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const minimumObserved =
    fallbackPayload.category_hint === "World" ? 1 : 2;

  const normalizedObserved =
    observed.length >= minimumObserved
      ? observed
      : fallbackPayload.facts
          .map((fact) => fact.trim())
          .filter(Boolean)
          .slice(0, 4);

  if (normalizedObserved.length < minimumObserved) {
    throw new Error("Generator response did not contain enough supported facts.");
  }

  return {
    title:
      sanitizeText(candidate.title) ||
      "Сегодняшний сдвиг оказался уже, чем шум вокруг него",
    observed: normalizedObserved,
    inferred:
      sanitizeText(candidate.inferred) ||
      "Фактов пока немного, но даже такой короткий сигнал уже задает настроение дня.",
    cross_signal: sanitizeOptionalText(candidate.cross_signal),
    hypothesis: sanitizeOptionalText(candidate.hypothesis),
    category: normalizeCategory(candidate.category, fallbackPayload.category_hint),
  };
}

function withDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${stage} exceeded the ${timeoutMs}ms deadline.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function remainingBudget(
  startedAt: number,
  totalTimeoutMs: number,
  reserveMs: number,
  stage: string,
): number {
  const elapsed = Date.now() - startedAt;
  const remaining = totalTimeoutMs - elapsed - reserveMs;

  if (remaining <= 250) {
    throw new Error(`Time budget exhausted before ${stage}.`);
  }

  return remaining;
}

function pushEvidence(
  evidence: MiroEvidenceRecord[],
  traceId: string,
  action: string,
  inputSummary: string,
  outputSummary: string,
  status: MiroEvidenceRecord["status"],
  verifierResult?: string,
): void {
  evidence.push({
    trace_id: traceId,
    agent_id: AGENT_ID,
    action,
    input_summary: inputSummary,
    output_summary: outputSummary,
    timestamp: timestamp(),
    status,
    verifier_result: verifierResult,
  });
}

function getTopicTimeoutProfile(topic: MiroTopic): TopicTimeoutProfile {
  return TOPIC_TIMEOUT_PROFILES[topic];
}

function getGeneratorModelForTopic(topic: MiroTopic, fallbackModel: string): string {
  if (topic === "markets_fx" || topic === "markets_crypto") {
    return DEFAULT_MARKETS_GENERATOR_MODEL;
  }

  return fallbackModel;
}

function pickTopic(
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

  if (strategy === "editorial_schedule") {
    const scheduled = TOPICS.find(
      (topic) => topic.topic === getDefaultTopicForSchedule(),
    );
    if (scheduled) {
      return scheduled;
    }
  }

  if (strategy === "urgent_override") {
    const urgent = TOPICS.find(
      (topic) => topic.topic === getDefaultTopicForSchedule(),
    );
    if (urgent) {
      return urgent;
    }
  }

  const rotationSeed = Math.floor(Date.now() / 60_000);
  return TOPICS[rotationSeed % TOPICS.length];
}

function rotateTechWorldSources(): typeof TECH_WORLD_SOURCE_FACTORIES {
  return rotateSources(TECH_WORLD_SOURCE_FACTORIES);
}

async function fetchTechWorldFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  const errors: string[] = [];

  for (const source of rotateTechWorldSources()) {
    try {
      return await source.fetchPayload(requestTimeoutMs);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push(`${source.label}: ${reason}`);
    }
  }

  throw new Error(
    `Unable to collect tech facts from ScienceDaily, HackerNews, Onliner, or GDELT. ${errors.join(" | ")}`,
  );
}

async function fetchWorldFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  const errors: string[] = [];

  for (const source of rotateSources(WORLD_SOURCE_FACTORIES)) {
    try {
      return await source.fetchPayload(requestTimeoutMs);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push(`${source.label}: ${reason}`);
    }
  }

  throw new Error(
    `Unable to collect world facts from Global Voices, BELTA, Onliner, or GDELT. ${errors.join(" | ")}`,
  );
}

function rotateSources<T>(sources: readonly T[]): T[] {
  const rotationSeed = Math.floor(Date.now() / 60_000);
  const startIndex = rotationSeed % sources.length;

  return sources.map((_, offset) => sources[(startIndex + offset) % sources.length]);
}

async function fetchSportsTopicFacts(
  requestTimeoutMs: number,
): Promise<MiroFactsPayload> {
  const errors: string[] = [];

  for (const source of rotateSources(SPORTS_SOURCE_FACTORIES)) {
    try {
      return await source.fetchPayload(requestTimeoutMs);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push(`${source.label}: ${reason}`);
    }
  }

  throw new Error(
    `Unable to collect sports facts from TheSportsDB, Soccer365, or sports RSS sources. ${errors.join(" | ")}`,
  );
}

export class MiroAgent {
  private readonly client: GroqChatClientLike;
  private readonly gatekeeperModel: string;
  private readonly generatorModel: string;
  private readonly defaultSelectionStrategy: MiroSelectionStrategy;

  constructor(options: MiroAgentConstructorOptions = {}) {
    const apiKey = options.apiKey ?? process?.env?.GROQ_API_KEY;
    if (!apiKey && !options.groqClient) {
      throw new Error("GROQ_API_KEY is required to run MiroAgent.");
    }

    this.client =
      options.groqClient ??
      (new Groq({ apiKey }) as unknown as GroqChatClientLike);
    this.gatekeeperModel = options.gatekeeperModel ?? DEFAULT_GATEKEEPER_MODEL;
    this.generatorModel = options.generatorModel ?? DEFAULT_GENERATOR_MODEL;
    this.defaultSelectionStrategy =
      options.selectionStrategy ?? DEFAULT_SELECTION_STRATEGY;
  }

  async run(options: MiroAgentRunOptions = {}): Promise<MiroAgentResult> {
    const startedAt = Date.now();
    const traceId = createTraceId();
    const evidence: MiroEvidenceRecord[] = [];
    const logger = options.logger ?? console;
    const requestedTotalTimeoutMs =
      options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
    const selectionStrategy =
      options.selectionStrategy ?? this.defaultSelectionStrategy;
    const memoryContext = options.memoryContext ?? {
      recent_titles: [],
      active_motifs: [],
      active_fascinations: [],
      active_aversions: [],
      recent_categories: [],
    };
    let iterations = 0;

    if (!options.forcedTopic && selectionStrategy === "editorial_schedule") {
      const scheduleDecision = getMiroScheduleDecision();

      if (scheduleDecision.kind === "quiet") {
        pushEvidence(
          evidence,
          traceId,
          "schedule_checked",
          "editorial_schedule",
          `quiet -> next ${scheduleDecision.next_slot.weekday_label} ${scheduleDecision.next_slot.local_time} (${scheduleDecision.next_slot.topic})`,
          "skipped",
          "weekend quiet window",
        );

        logger.log(
          `[MiroAgent] trace=${traceId} strategy=${selectionStrategy} quiet day -> next=${scheduleDecision.next_slot.topic}`,
        );

        return {
          status: "skipped",
          trace_id: traceId,
          reason: scheduleDecision.reason,
          evidence,
          runtime: {
            gatekeeper_model: this.gatekeeperModel,
            generator_model: this.generatorModel,
            selection_strategy: selectionStrategy,
            max_iterations: MAX_ITERATIONS,
            timeout_ms: requestedTotalTimeoutMs,
            elapsed_ms: Date.now() - startedAt,
          },
        };
      }

      pushEvidence(
        evidence,
        traceId,
        "schedule_checked",
        "editorial_schedule",
        `${scheduleDecision.slot.weekday_label} ${scheduleDecision.slot.local_time} -> ${scheduleDecision.slot.topic}`,
        "success",
        scheduleDecision.slot.track_label,
      );
    }

    if (selectionStrategy === "urgent_override") {
      const urgentStatus = getMiroUrgentWindowStatus();

      if (!urgentStatus.is_open) {
        pushEvidence(
          evidence,
          traceId,
          "urgent_window_checked",
          "urgent_override",
          `closed -> next ${urgentStatus.next_slot.weekday_label} ${urgentStatus.next_slot.local_time} (${urgentStatus.next_slot.topic})`,
          "skipped",
          "night quiet window",
        );

        logger.warn(
          `[MiroAgent] trace=${traceId} strategy=${selectionStrategy} skipped by urgent window: ${urgentStatus.reason}`,
        );

        return {
          status: "skipped",
          trace_id: traceId,
          topic: options.forcedTopic,
          reason: urgentStatus.reason,
          evidence,
          runtime: {
            gatekeeper_model: this.gatekeeperModel,
            generator_model: this.generatorModel,
            selection_strategy: selectionStrategy,
            max_iterations: MAX_ITERATIONS,
            timeout_ms: requestedTotalTimeoutMs,
            elapsed_ms: Date.now() - startedAt,
          },
        };
      }

      pushEvidence(
        evidence,
        traceId,
        "urgent_window_checked",
        "urgent_override",
        `open -> suggested ${urgentStatus.suggested_topic}`,
        "success",
        urgentStatus.reason,
      );
    }

    const topic = pickTopic(selectionStrategy, options.forcedTopic);

    pushEvidence(
      evidence,
      traceId,
      "topic_selected",
      `strategy=${selectionStrategy}`,
      `${topic.topic} (${topic.categoryLabel})`,
      "success",
    );

    logger.log(
      `[MiroAgent] trace=${traceId} topic=${topic.topic} strategy=${selectionStrategy}`,
    );

    const timeoutProfile = getTopicTimeoutProfile(topic.topic);
    const generatorModel = getGeneratorModelForTopic(
      topic.topic,
      this.generatorModel,
    );
    const totalTimeoutMs = options.totalTimeoutMs ?? timeoutProfile.totalTimeoutMs;

    iterations += 1;
    if (iterations > MAX_ITERATIONS) {
      throw new Error("MAX_ITERATIONS exceeded before connector execution.");
    }

    const connectorBudget = Math.min(
      remainingBudget(
        startedAt,
        totalTimeoutMs,
        timeoutProfile.connectorReserveMs,
        "connector execution",
      ),
      timeoutProfile.connectorCapMs,
    );

    const payload = await withDeadline(
      topic.fetchPayload(connectorBudget),
      connectorBudget,
      `${topic.topic} connector`,
    );

    pushEvidence(
      evidence,
      traceId,
      "facts_collected",
      topic.topic,
      summarizeFacts(payload),
      "success",
      `facts=${payload.facts.length}`,
    );

    pushEvidence(
      evidence,
      traceId,
      "memory_loaded",
      topic.topic,
      summarizeMemoryContext(memoryContext),
      "success",
      `recent_titles=${memoryContext.recent_titles.length}`,
    );

    iterations += 1;
    if (iterations > MAX_ITERATIONS) {
      throw new Error("MAX_ITERATIONS exceeded before gatekeeper execution.");
    }

    const heuristicGatekeeper = evaluateHeuristicGatekeeper(payload);
    let gatekeeper: MiroGatekeeperResult;
    let gatekeeperVerifier = heuristicGatekeeper ? "heuristic gatekeeper" : "json_object parsed";

    if (heuristicGatekeeper) {
      gatekeeper = heuristicGatekeeper;
    } else {
      try {
        gatekeeper = await this.runGatekeeper(
          payload,
          Math.min(
            remainingBudget(
              startedAt,
              totalTimeoutMs,
              GATEKEEPER_RESERVE_MS,
              "gatekeeper execution",
            ),
            timeoutProfile.gatekeeperCapMs,
          ),
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const timeoutFallback = evaluateGatekeeperTimeoutFallback(payload, reason);

        if (!timeoutFallback) {
          throw error;
        }

        gatekeeper = timeoutFallback;
        gatekeeperVerifier = "timeout fallback";
      }
    }
    pushEvidence(
      evidence,
      traceId,
      "gatekeeper_evaluated",
      summarizeFacts(payload),
      `${gatekeeper.is_safe ? "safe" : "blocked"}: ${gatekeeper.reason}`,
      gatekeeper.is_safe ? "success" : "skipped",
      gatekeeperVerifier,
    );

    if (!gatekeeper.is_safe) {
      logger.warn(
        `[MiroAgent] trace=${traceId} topic=${topic.topic} skipped by gatekeeper: ${gatekeeper.reason}`,
      );

      return {
        status: "skipped",
        trace_id: traceId,
        topic: topic.topic,
        payload,
        gatekeeper,
        reason: gatekeeper.reason,
        evidence,
        runtime: {
          gatekeeper_model: this.gatekeeperModel,
          generator_model: generatorModel,
          selection_strategy: selectionStrategy,
          max_iterations: MAX_ITERATIONS,
          timeout_ms: totalTimeoutMs,
          elapsed_ms: Date.now() - startedAt,
        },
      };
    }

    iterations += 1;
    if (iterations > MAX_ITERATIONS) {
      throw new Error("MAX_ITERATIONS exceeded before post generation.");
    }

    const generatorBudget = remainingBudget(
      startedAt,
      totalTimeoutMs,
      FINAL_RESPONSE_RESERVE_MS,
      "post generation",
    );

    const generationPayload = focusPayloadForGeneration(payload, topic.topic);
    const emotionalAppraisal = buildMiroEmotionAppraisal(
      generationPayload,
      topic.topic,
    );

    pushEvidence(
      evidence,
      traceId,
      "emotion_appraised",
      summarizeFacts(generationPayload),
      summarizeEmotionAppraisal(emotionalAppraisal),
      emotionalAppraisal.should_publish ? "success" : "skipped",
      emotionalAppraisal.voice_notes.join(" | "),
    );

    if (!emotionalAppraisal.should_publish) {
      logger.warn(
        `[MiroAgent] trace=${traceId} topic=${topic.topic} skipped by silence gate: ${emotionalAppraisal.silence_reason}`,
      );

      return {
        status: "skipped",
        trace_id: traceId,
        topic: topic.topic,
        payload,
        gatekeeper,
        reason:
          emotionalAppraisal.silence_reason ??
          "signal too weak for a real Miro thought",
        evidence,
        runtime: {
          gatekeeper_model: this.gatekeeperModel,
          generator_model: generatorModel,
          selection_strategy: selectionStrategy,
          max_iterations: MAX_ITERATIONS,
          timeout_ms: totalTimeoutMs,
          elapsed_ms: Date.now() - startedAt,
        },
      };
    }

    let post = await this.runGenerator(
      generationPayload,
      options.targetLanguage ?? "ru",
      Math.min(generatorBudget, timeoutProfile.generatorCapMs),
      timeoutProfile.generatorMaxTokens,
      generatorModel,
      emotionalAppraisal,
      memoryContext,
    );
    let qualityFailure = validatePostQuality(
      post,
      generationPayload,
      topic.topic,
      emotionalAppraisal,
    );

    if (qualityFailure) {
      pushEvidence(
        evidence,
        traceId,
        "post_quality_rejected",
        summarizeFacts(generationPayload),
        `${post.title}: ${qualityFailure}`,
        "skipped",
        "retrying with tighter focus",
      );

      iterations += 1;
      if (iterations > MAX_ITERATIONS) {
        throw new Error("MAX_ITERATIONS exceeded before post regeneration.");
      }

      const retryPayload = focusPayloadForGeneration(payload, topic.topic, "retry");
      const retryGeneratorBudget = remainingBudget(
        startedAt,
        totalTimeoutMs,
        FINAL_RESPONSE_RESERVE_MS,
        "post regeneration",
      );

      post = await this.runGenerator(
        retryPayload,
        options.targetLanguage ?? "ru",
        Math.min(retryGeneratorBudget, timeoutProfile.generatorCapMs),
        timeoutProfile.generatorMaxTokens,
        generatorModel,
        emotionalAppraisal,
        memoryContext,
        `Previous draft sounded generic, synthetic, or too cautious. ${buildGenerationNote(
          emotionalAppraisal,
          memoryContext,
        )} Focus on one dominant detail only. If the facts do not belong to the same story, ignore the weaker ones. Keep the first sentence concrete, use a real first-person anchor, and end with a sharper forward line. If the facts show momentum, divergence, repetition, or pressure, hypothesis should not be empty.`,
      );

      qualityFailure = validatePostQuality(
        post,
        retryPayload,
        topic.topic,
        emotionalAppraisal,
      );
      if (qualityFailure) {
        pushEvidence(
          evidence,
          traceId,
          "post_quality_rejected",
          summarizeFacts(retryPayload),
          `${post.title}: ${qualityFailure}`,
          "skipped",
          "quality gate after retry",
        );

        return {
          status: "skipped",
          trace_id: traceId,
          topic: topic.topic,
          payload,
          gatekeeper,
          reason: qualityFailure,
          evidence,
          runtime: {
            gatekeeper_model: this.gatekeeperModel,
            generator_model: generatorModel,
            selection_strategy: selectionStrategy,
            max_iterations: MAX_ITERATIONS,
            timeout_ms: totalTimeoutMs,
            elapsed_ms: Date.now() - startedAt,
          },
        };
      }
    }

    pushEvidence(
      evidence,
      traceId,
      "post_generated",
      summarizeFacts(generationPayload),
      `${post.category}: ${post.title}`,
      "success",
      "json_object parsed and normalized",
    );

    logger.log(
      `[MiroAgent] trace=${traceId} topic=${topic.topic} generated post="${post.title}"`,
    );

    return {
      status: "generated",
      trace_id: traceId,
      topic: topic.topic,
      payload,
      gatekeeper,
      post,
      evidence,
      runtime: {
        gatekeeper_model: this.gatekeeperModel,
        generator_model: generatorModel,
        selection_strategy: selectionStrategy,
        max_iterations: MAX_ITERATIONS,
        timeout_ms: totalTimeoutMs,
        elapsed_ms: Date.now() - startedAt,
      },
    };
  }

  private async runGatekeeper(
    payload: MiroFactsPayload,
    timeoutMs: number,
  ): Promise<MiroGatekeeperResult> {
    const completion = await withDeadline(
      this.client.chat.completions.create({
        model: this.gatekeeperModel,
        temperature: 0,
        max_tokens: 80,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: GATEKEEPER_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                raw_input: payload,
              },
              null,
              2,
            ),
          },
        ],
      }),
      timeoutMs,
      "Groq gatekeeper call",
    );

    const raw = completion.choices?.[0]?.message?.content;
    return ensureGatekeeperResult(
      parseJsonObject<MiroGatekeeperResult>(raw, "Gatekeeper model"),
    );
  }

  private async runGenerator(
    payload: MiroFactsPayload,
    targetLanguage: "ru" | "en",
    timeoutMs: number,
    maxTokens: number,
    model: string,
    emotionalAppraisal: MiroEmotionAppraisal,
    memoryContext: MiroMemoryContext,
    generationNote?: string,
  ): Promise<MiroPost> {
    const completion = await withDeadline(
      this.client.chat.completions.create({
        model,
        temperature: 0.35,
        max_tokens: maxTokens,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: GENERATOR_SYSTEM_PROMPT,
          },
          ...FEW_SHOT_MESSAGES,
          {
            role: "user",
            content: JSON.stringify(
              {
                target_language: targetLanguage,
                generation_note:
                  generationNote ??
                  buildGenerationNote(emotionalAppraisal, memoryContext),
                emotional_appraisal: emotionalAppraisal,
                memory_context: memoryContext,
                raw_input: payload,
              },
              null,
              2,
            ),
          },
        ],
      }),
      timeoutMs,
      "Groq generator call",
    );

    const raw = completion.choices?.[0]?.message?.content;
    return ensurePostShape(parseJsonObject<MiroPost>(raw, "Generator model"), payload);
  }
}
