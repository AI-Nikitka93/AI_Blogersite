import { XMLParser } from "fast-xml-parser";

export type MiroCategoryHint = "Sports" | "Markets" | "Tech" | "World";

export interface MiroFactsPayload {
  category_hint: MiroCategoryHint;
  source: string;
  facts: string[];
}

export interface ConnectorRuntimeOptions {
  requestTimeoutMs?: number;
}

interface TheSportsDbLeague {
  idLeague?: string;
  strLeague?: string;
  strSport?: string;
  strCountry?: string;
}

interface TheSportsDbLeaguesResponse {
  countrys?: TheSportsDbLeague[] | null;
}

interface TheSportsDbEvent {
  strEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  dateEvent?: string | null;
  strLeague?: string | null;
}

interface TheSportsDbEventsResponse {
  events?: TheSportsDbEvent[] | null;
}

interface FrankfurterRateRow {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

type FrankfurterRatesResponse = FrankfurterRateRow[];

type CoinGeckoCoinData = Record<string, number>;
type CoinGeckoSimplePriceResponse = Record<string, CoinGeckoCoinData>;

interface GdeltArticle {
  title?: string;
  seendate?: string;
  domain?: string;
  sourcecountry?: string;
  language?: string;
  url?: string;
}

interface GdeltDocResponse {
  articles?: GdeltArticle[];
}

interface HackerNewsHit {
  title?: string | null;
  url?: string | null;
  story_url?: string | null;
}

interface HackerNewsSearchResponse {
  hits?: HackerNewsHit[] | null;
}

export interface RssFactsOptions extends ConnectorRuntimeOptions {
  sourceName?: string;
  categoryHint?: MiroCategoryHint;
  maxItems?: number;
  excludedKeywords?: string[];
}

export const MIRO_RSS_FEED_PRESETS = {
  globalVoices: {
    url: "https://globalvoices.org/feed/",
    source: "Global Voices",
    category_hint: "World" as const,
  },
  scienceDailyTechnology: {
    url: "https://www.sciencedaily.com/rss/top/technology.xml",
    source: "ScienceDaily",
    category_hint: "Tech" as const,
  },
  onlinerTech: {
    url: "https://tech.onliner.by/feed",
    source: "Onliner Tech",
    category_hint: "Tech" as const,
  },
  onlinerPeople: {
    url: "https://people.onliner.by/feed",
    source: "Onliner People",
    category_hint: "World" as const,
  },
  onlinerMoney: {
    url: "https://money.onliner.by/feed",
    source: "Onliner Money",
    category_hint: "World" as const,
  },
  belta: {
    url: "https://belta.by/rss",
    source: "BELTA",
    category_hint: "World" as const,
  },
  sportsRu: {
    url: "https://www.sports.ru/rss/all_news.xml",
    source: "Sports.ru",
    category_hint: "Sports" as const,
  },
  sportExpress: {
    url: "https://www.sport-express.ru/services/materials/news/se/",
    source: "Sport-Express",
    category_hint: "Sports" as const,
  },
  pressball: {
    url: "https://pressball.by/feed/",
    source: "Pressball",
    category_hint: "Sports" as const,
  },
} as const;

const SOCCER365_BASE = "https://soccer365.ru";

const CURRENT_CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
  "User-Agent": CURRENT_CHROME_USER_AGENT,
  Referer: "https://miro.local/",
};

const THE_SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const FRANKFURTER_BASE = "https://api.frankfurter.dev/v2";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const GDELT_DOC_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";
const HACKER_NEWS_SEARCH_BY_DATE_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=5";

const RSS_XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
  processEntities: true,
});

const SPORTS_TARGETS = [
  { country: "Russia", sport: "Soccer" },
  { country: "Belarus", sport: "Soccer" },
  { country: "Russia", sport: "Ice Hockey" },
  { country: "Belarus", sport: "Ice Hockey" },
] as const;

const GDELT_NEGATIVE_KEYWORDS = [
  "government",
  "election",
  "war",
  "military",
  "sanction",
  "president",
  "\"prime minister\"",
  "parliament",
  "congress",
  "cabinet",
  "diplomacy",
  "geopolitics",
  "protest",
  "minister",
];

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener("abort", () => clearTimeout(timeout), {
    once: true,
  });
  return controller.signal;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? createTimeoutSignal(timeoutMs),
    cache: "no-store",
  });

  const rawText = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const looksLikeCloudflare =
    rawText.includes("Cloudflare Ray ID") ||
    rawText.includes("Attention Required!") ||
    rawText.includes("Please enable cookies");

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} from ${url}: ${rawText.slice(0, 240)}`,
    );
  }

  if (looksLikeCloudflare) {
    throw new Error(
      `Cloudflare or bot protection blocked ${url}. Try a different network or a browser-backed fetch.`,
    );
  }

  if (!contentType.includes("json")) {
    throw new Error(
      `Expected JSON from ${url}, received content-type "${contentType}" with body: ${rawText.slice(0, 240)}`,
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Failed to parse JSON from ${url}: ${reason}`);
  }
}

async function fetchText(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<{ body: string; contentType: string }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? createTimeoutSignal(timeoutMs),
    cache: "no-store",
  });

  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${body.slice(0, 240)}`);
  }

  return { body, contentType };
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function formatSignedPercent(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function formatSignedDelta(value: number, digits = 4): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function isNearlyZero(value: number, threshold = 0.005): boolean {
  return Math.abs(value) < threshold;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueFacts(facts: string[], maxFacts = 4): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const fact of facts) {
    const normalized = fact.trim();
    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(normalized);

    if (deduped.length >= maxFacts) {
      break;
    }
  }

  return deduped;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === null || value === undefined ? [] : [value];
}

function readXmlString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => readXmlString(item)).find(Boolean) ?? "";
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const prioritizedKeys = [
      "#text",
      "__cdata",
      "title",
      "description",
      "summary",
      "content",
      "content:encoded",
      "link",
      "href",
    ];

    for (const key of prioritizedKeys) {
      const nested = readXmlString(record[key]);
      if (nested) {
        return nested;
      }
    }
  }

  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLength = 220): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFilterText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesBlockedKeyword(
  value: string,
  keywords: readonly string[] | undefined,
): boolean {
  if (!keywords || keywords.length === 0) {
    return false;
  }

  const normalized = normalizeFilterText(value);
  return keywords.some((keyword) =>
    normalized.includes(normalizeFilterText(keyword)),
  );
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
    return rssItems;
  }

  const atomFeed = root.feed as Record<string, unknown> | undefined;
  return asArray(atomFeed?.entry).filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function normalizeSoccer365Text(value: string): string {
  return stripHtml(decodeHtmlEntities(value)).replace(/\s+/g, " ").trim();
}

function parseSoccer365OnlineFacts(html: string): string[] {
  const facts: string[] = [];
  const blocks = html
    .split(/<div id="gm\d+" class="game_block"[^>]*>/g)
    .slice(1, 12);

  for (const block of blocks) {
    const status = normalizeSoccer365Text(
      block.match(/<div class="status"><span class="size10">([\s\S]*?)<\/span><\/div>/i)?.[1] ??
        "",
    );
    const homeTeam = normalizeSoccer365Text(
      block.match(/<div class="ht">[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ?? "",
    );
    const awayTeam = normalizeSoccer365Text(
      block.match(/<div class="at">[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ?? "",
    );
    const competition = normalizeSoccer365Text(
      block.match(/<div class="cmp">[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ?? "",
    );
    const stage = normalizeSoccer365Text(
      block.match(/<div class="stage">([\s\S]*?)<\/div>/i)?.[1] ?? "",
    );
    const scoreMatches = [...block.matchAll(/<div class="gls">([^<]*)<\/div>/gi)]
      .map((match) => normalizeSoccer365Text(match[1] ?? ""))
      .filter(Boolean);
    const [homeScore, awayScore] = scoreMatches;
    const competitionLabel = competition || stage || "Soccer365";

    if (!status || !homeTeam || !awayTeam) {
      continue;
    }

    if (!homeScore || !awayScore) {
      continue;
    }

    if (status === "Завершен") {
      facts.push(
        `${competitionLabel}: ${homeTeam} сыграл с ${awayTeam}, матч завершился со счетом ${homeScore}:${awayScore}.`,
      );
    } else {
      facts.push(
        `${competitionLabel}: в матче ${homeTeam} — ${awayTeam} счет ${homeScore}:${awayScore}, статус — ${status}.`,
      );
    }

    if (facts.length >= 3) {
      break;
    }
  }

  return facts;
}

function parseSoccer365PreviewFacts(html: string): string[] {
  const facts: string[] = [];
  const previewRegex = /<a[^>]+href="\/news\/\d+\/"[^>]*>([\s\S]*?превью[\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(previewRegex)) {
    const title = normalizeSoccer365Text(match[1] ?? "");
    if (!title || !/превью/i.test(title)) {
      continue;
    }

    facts.push(`Soccer365 вынес в превью матч: ${title}.`);
    if (facts.length >= 2) {
      break;
    }
  }

  return facts;
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

function parseNumericScore(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function determineWinner(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
): string {
  if (homeScore > awayScore) {
    return `${homeTeam} won`;
  }

  if (awayScore > homeScore) {
    return `${awayTeam} won`;
  }

  return "The match ended in a draw";
}

function formatGdeltDate(seenDate: string | undefined): string {
  if (!seenDate) {
    return "unknown date";
  }

  const compact = seenDate.replace("T", "").replace("Z", "");
  const year = compact.slice(0, 4);
  const month = compact.slice(4, 6);
  const day = compact.slice(6, 8);

  if (!year || !month || !day) {
    return seenDate;
  }

  return `${year}-${month}-${day}`;
}

function pickLatestAndPreviousByQuote(
  rows: FrankfurterRateRow[],
): Map<string, { latest: FrankfurterRateRow; previous: FrankfurterRateRow | null }> {
  const grouped = new Map<string, FrankfurterRateRow[]>();

  for (const row of rows) {
    const list = grouped.get(row.quote) ?? [];
    list.push(row);
    grouped.set(row.quote, list);
  }

  const result = new Map<
    string,
    { latest: FrankfurterRateRow; previous: FrankfurterRateRow | null }
  >();

  for (const [quote, quoteRows] of grouped.entries()) {
    quoteRows.sort((a, b) => a.date.localeCompare(b.date));
    const latest = quoteRows[quoteRows.length - 1];
    const previous =
      quoteRows.length > 1 ? quoteRows[quoteRows.length - 2] : null;
    result.set(quote, { latest, previous });
  }

  return result;
}

export async function fetchSportsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const facts: string[] = [];
  const errors: string[] = [];

  for (const target of SPORTS_TARGETS) {
    try {
      const leaguesUrl =
        `${THE_SPORTS_DB_BASE}/search_all_leagues.php?` +
        new URLSearchParams({
          c: target.country,
          s: target.sport,
        }).toString();

      const leaguesResponse = await fetchJson<TheSportsDbLeaguesResponse>(
        leaguesUrl,
        {},
        requestTimeoutMs,
      );

      const league = leaguesResponse.countrys?.find((item) => item.idLeague);
      if (!league?.idLeague) {
        continue;
      }

      const eventsUrl =
        `${THE_SPORTS_DB_BASE}/eventspastleague.php?` +
        new URLSearchParams({ id: league.idLeague }).toString();

      const eventsResponse = await fetchJson<TheSportsDbEventsResponse>(
        eventsUrl,
        {},
        requestTimeoutMs,
      );
      const event = eventsResponse.events?.find((item) => {
        const homeScore = parseNumericScore(item.intHomeScore);
        const awayScore = parseNumericScore(item.intAwayScore);
        return (
          Boolean(item.strHomeTeam) &&
          Boolean(item.strAwayTeam) &&
          homeScore !== null &&
          awayScore !== null
        );
      });

      if (!event?.strHomeTeam || !event.strAwayTeam) {
        continue;
      }

      const homeScore = parseNumericScore(event.intHomeScore);
      const awayScore = parseNumericScore(event.intAwayScore);
      if (homeScore === null || awayScore === null) {
        continue;
      }

      const winner = determineWinner(
        event.strHomeTeam,
        event.strAwayTeam,
        homeScore,
        awayScore,
      );

      facts.push(
        `${target.country} ${target.sport}: ${event.strHomeTeam} played ${event.strAwayTeam} and the score was ${homeScore}-${awayScore}.`,
      );
      facts.push(
        `${event.strLeague ?? league.strLeague ?? `${target.country} ${target.sport}`} on ${event.dateEvent ?? "unknown date"}: ${winner}.`,
      );

      if (facts.length >= 4) {
        break;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      errors.push(`${target.country} ${target.sport}: ${reason}`);
    }
  }

  const normalizedFacts = uniqueFacts(facts, 4);
  if (normalizedFacts.length < 2) {
    const details = errors.length
      ? ` TheSportsDB errors: ${errors.join(" | ")}`
      : "";
    throw new Error(
      `Unable to collect enough sports facts from TheSportsDB.${details}`,
    );
  }

  return {
    category_hint: "Sports",
    source: "TheSportsDB",
    facts: normalizedFacts,
  };
}

export async function fetchSoccer365Facts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const facts: string[] = [];

  const onlinePage = await fetchText(
    `${SOCCER365_BASE}/online/`,
    {},
    requestTimeoutMs,
  );
  facts.push(...parseSoccer365OnlineFacts(onlinePage.body));

  if (facts.length < 2) {
    const homePage = await fetchText(
      `${SOCCER365_BASE}/`,
      {},
      requestTimeoutMs,
    );
    facts.push(...parseSoccer365PreviewFacts(homePage.body));
  }

  const normalizedFacts = uniqueFacts(facts, 4);
  if (normalizedFacts.length < 2) {
    throw new Error("Soccer365 returned too few usable sports facts.");
  }

  return {
    category_hint: "Sports",
    source: "Soccer365",
    facts: normalizedFacts,
  };
}

export async function fetchCurrencyFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 7);

  const responseUrl =
    `${FRANKFURTER_BASE}/rates?` +
    new URLSearchParams({
      base: "USD",
      quotes: "EUR,GBP,JPY,RUB,BYN",
      from: startDate.toISOString().slice(0, 10),
      to: endDate.toISOString().slice(0, 10),
    }).toString();

  const rows = await fetchJson<FrankfurterRatesResponse>(
    responseUrl,
    {},
    requestTimeoutMs,
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Frankfurter returned no rate rows.");
  }

  const byQuote = pickLatestAndPreviousByQuote(rows);
  const latestByDate = Array.from(byQuote.values()).map((entry) => entry.latest);
  const latestDate = latestByDate
    .map((entry) => entry.date)
    .sort((a, b) => b.localeCompare(a))[0];

  const facts: string[] = [];
  const directPairs = ["BYN", "RUB", "JPY"] as const;
  const reservePairs = ["EUR", "GBP"] as const;

  const directFactParts = directPairs
    .map((quote) => byQuote.get(quote)?.latest)
    .filter((entry): entry is FrankfurterRateRow => Boolean(entry))
    .map((entry) => `1 USD = ${round(entry.rate, entry.quote === "JPY" ? 2 : 4)} ${entry.quote}`);

  if (directFactParts.length > 0) {
    facts.push(`Frankfurter ${latestDate}: ${directFactParts.join(", ")}.`);
  }

  const reserveFactParts = reservePairs
    .map((quote) => byQuote.get(quote)?.latest)
    .filter((entry): entry is FrankfurterRateRow => Boolean(entry))
    .map((entry) => `1 USD = ${round(entry.rate, 4)} ${entry.quote}`);

  if (reserveFactParts.length > 0) {
    facts.push(`Major reserve pairs on ${latestDate}: ${reserveFactParts.join(", ")}.`);
  }

  for (const quote of ["RUB", "BYN", "EUR", "GBP"] as const) {
    const pair = byQuote.get(quote);
    if (!pair?.previous) {
      continue;
    }

    const delta = pair.latest.rate - pair.previous.rate;
    if (isNearlyZero(delta, quote === "RUB" || quote === "BYN" ? 0.01 : 0.0005)) {
      facts.push(
        `USD/${quote} was nearly unchanged versus the previous fixing, ending at ${round(pair.latest.rate, quote === "RUB" || quote === "BYN" ? 2 : 4)} on ${pair.latest.date}.`,
      );
    } else {
      const verb = delta >= 0 ? "rose" : "fell";
      facts.push(
        `USD/${quote} ${verb} by ${formatSignedDelta(delta, quote === "RUB" || quote === "BYN" ? 2 : 4)} versus the previous fixing, ending at ${round(pair.latest.rate, quote === "RUB" || quote === "BYN" ? 2 : 4)} on ${pair.latest.date}.`,
      );
    }
  }

  return {
    category_hint: "Markets",
    source: "Frankfurter",
    facts: uniqueFacts(facts, 4),
  };
}

export async function fetchCryptoFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const url =
    `${COINGECKO_BASE}/simple/price?` +
    new URLSearchParams({
      ids: "bitcoin,ethereum,solana",
      vs_currencies: "usd,eur,rub",
      include_24hr_change: "true",
    }).toString();

  const response = await fetchJson<CoinGeckoSimplePriceResponse>(url, {
    headers: {
      ...(process.env.COINGECKO_DEMO_API_KEY
        ? { "x-cg-demo-api-key": process.env.COINGECKO_DEMO_API_KEY }
        : {}),
    },
  }, requestTimeoutMs);

  const facts: string[] = [];
  const assets: Array<{ id: string; label: string }> = [
    { id: "bitcoin", label: "Bitcoin" },
    { id: "ethereum", label: "Ethereum" },
    { id: "solana", label: "Solana" },
  ];

  for (const asset of assets) {
    const item = response[asset.id];
    if (!item) {
      continue;
    }

    const usdPrice = item.usd;
    const eurPrice = item.eur;
    const rubPrice = item.rub;
    const change = item.usd_24h_change;

    if (
      typeof usdPrice !== "number" ||
      typeof eurPrice !== "number" ||
      typeof rubPrice !== "number" ||
      typeof change !== "number"
    ) {
      continue;
    }

    facts.push(
      `${asset.label} traded near $${round(usdPrice, 2)} / €${round(eurPrice, 2)} / ₽${round(rubPrice, 2)} with a 24h move of ${formatSignedPercent(change)}.`,
    );
  }

  const btcChange = response.bitcoin?.usd_24h_change;
  const ethChange = response.ethereum?.usd_24h_change;
  if (typeof btcChange === "number" && typeof ethChange === "number") {
    const leader = btcChange >= ethChange ? "Bitcoin" : "Ethereum";
    const gap = Math.abs(btcChange - ethChange);
    facts.push(
      `${leader} outperformed the other major coin by about ${gap.toFixed(2)} percentage points over the last 24 hours.`,
    );
  }

  const normalizedFacts = uniqueFacts(facts, 4);
  if (normalizedFacts.length < 2) {
    throw new Error("CoinGecko returned too little usable crypto data.");
  }

  return {
    category_hint: "Markets",
    source: "CoinGecko",
    facts: normalizedFacts,
  };
}

export async function fetchRssFacts(
  feedUrl: string,
  options: RssFactsOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const maxItems = Math.min(Math.max(options.maxItems ?? 3, 1), 5);
  const { body, contentType } = await fetchText(
    feedUrl,
    {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    },
    requestTimeoutMs,
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
    const reason = error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Failed to parse RSS/XML from ${feedUrl}: ${reason}`);
  }

  const entries = normalizeFeedEntries(parsedFeed).slice(0, maxItems);
  const source =
    options.sourceName ||
    extractFeedTitle(parsedFeed) ||
    inferSourceFromFeedUrl(feedUrl);

  const facts = entries
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
        return "";
      }

      if (
        includesBlockedKeyword(
          `${title} ${summary}`,
          options.excludedKeywords,
        )
      ) {
        return "";
      }

      const compactSummary = summary ? truncateText(summary, 200) : "";
      return compactSummary ? `${title} — ${compactSummary}` : title;
    })
    .filter(Boolean);

  const normalizedFacts = uniqueFacts(facts, maxItems);
  if (normalizedFacts.length < 2) {
    throw new Error(`RSS feed ${source} returned too few usable entries.`);
  }

  return {
    category_hint: options.categoryHint ?? "World",
    source,
    facts: normalizedFacts,
  };
}

export async function fetchHackerNewsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const response = await fetchJson<HackerNewsSearchResponse>(
    HACKER_NEWS_SEARCH_BY_DATE_URL,
    {},
    requestTimeoutMs,
  );

  const facts = asArray(response.hits)
    .map((hit) => {
      const title = sanitizeNewsText(hit?.title);
      const url = sanitizeNewsText(hit?.url ?? hit?.story_url);
      if (!title) {
        return "";
      }

      return url ? `${title} — ${url}` : title;
    })
    .filter(Boolean);

  const normalizedFacts = uniqueFacts(facts, 5);
  if (normalizedFacts.length < 2) {
    throw new Error("HackerNews returned too few usable stories.");
  }

  return {
    category_hint: "Tech",
    source: "HackerNews",
    facts: normalizedFacts,
  };
}

function sanitizeNewsText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export interface GdeltFactsOptions {
  keywords?: string[];
  categoryHint?: Extract<MiroCategoryHint, "Tech" | "World">;
  maxRecords?: number;
  timespan?: string;
  requestTimeoutMs?: number;
  retryOn429?: boolean;
}

export async function fetchGdeltFacts(
  options: GdeltFactsOptions = {},
): Promise<MiroFactsPayload> {
  const keywords = options.keywords ?? [
    "artificial intelligence",
    "large language model",
    "space launch",
  ];
  const categoryHint = options.categoryHint ?? "Tech";
  const maxRecords = String(options.maxRecords ?? 3);
  const timespan = options.timespan ?? "3days";
  const requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
  const retryOn429 = options.retryOn429 ?? true;

  const positiveQuery = keywords.map((keyword) => `"${keyword}"`).join(" OR ");
  const negativeQuery = GDELT_NEGATIVE_KEYWORDS.map((keyword) => `-${keyword}`).join(" ");
  const query = `(${positiveQuery}) ${negativeQuery}`;

  const url =
    `${GDELT_DOC_BASE}?` +
    new URLSearchParams({
      query,
      mode: "ArtList",
      maxrecords: maxRecords,
      sort: "DateDesc",
      format: "json",
      timespan,
    }).toString();

  let response: GdeltDocResponse;
  try {
    response = await fetchJson<GdeltDocResponse>(url, {}, requestTimeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (retryOn429 && message.includes("HTTP 429")) {
      await sleep(5_500);
      response = await fetchJson<GdeltDocResponse>(
        url,
        {},
        requestTimeoutMs,
      );
    } else {
      throw error;
    }
  }
  const articles = response.articles ?? [];

  const facts = articles
    .filter((article) => article.title)
    .map((article) => {
      const date = formatGdeltDate(article.seendate);
      const domain = article.domain ? ` via ${article.domain}` : "";
      return `${article.title} was indexed on ${date}${domain}.`;
    });

  const normalizedFacts = uniqueFacts(facts, 4);
  if (normalizedFacts.length < 2) {
    throw new Error("GDELT returned too few usable articles for the requested query.");
  }

  return {
    category_hint: categoryHint,
    source: "GDELT DOC API",
    facts: normalizedFacts,
  };
}

export async function exampleMiroConnectorUsage(): Promise<MiroFactsPayload[]> {
  const [sports, soccer365, fx, crypto, worldOrTech, rssTech, hn] = await Promise.all([
    fetchSportsFacts(),
    fetchSoccer365Facts(),
    fetchCurrencyFacts(),
    fetchCryptoFacts(),
    fetchGdeltFacts(),
    fetchRssFacts(MIRO_RSS_FEED_PRESETS.scienceDailyTechnology.url, {
      sourceName: MIRO_RSS_FEED_PRESETS.scienceDailyTechnology.source,
      categoryHint: MIRO_RSS_FEED_PRESETS.scienceDailyTechnology.category_hint,
    }),
    fetchHackerNewsFacts(),
  ]);

  return [sports, soccer365, fx, crypto, worldOrTech, rssTech, hn];
}
