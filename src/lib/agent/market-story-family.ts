type MarketStoryPost = {
  category: string;
  title: string;
  inferred?: string;
  observed?: readonly string[];
  cross_signal?: string;
  hypothesis?: string;
  created_at?: string;
};

type MarketDirection = "up" | "down" | "mixed" | "unknown";
type MarketLane = "fx" | "crypto" | "other";

type MarketStoryFamily = {
  lane: MarketLane;
  instruments: Set<string>;
  pairs: Set<string>;
  direction: MarketDirection;
  theses: Set<string>;
};

const MARKET_STORY_FAMILY_WINDOW_HOURS = 36;
const FX_CODES = ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "RUB", "BYN"] as const;
const CRYPTO_CODES = ["BTC", "ETH", "SOL", "XRP", "DOGE"] as const;
const MARKET_CODES = [...FX_CODES, ...CRYPTO_CODES] as const;
const STRONG_REPEAT_THESES = new Set([
  "export_pressure",
  "import_demand",
  "rate_inflation",
  "risk_volatility",
  "fx_move",
]);

function normalizeMarketText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}/-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildInstrumentText(post: MarketStoryPost): string {
  return normalizeMarketText([post.title, ...(post.observed ?? [])].join(" "));
}

function buildContextText(post: MarketStoryPost): string {
  return normalizeMarketText(
    [
      post.title,
      post.inferred ?? "",
      ...(post.observed ?? []),
      post.cross_signal ?? "",
      post.hypothesis ?? "",
    ].join(" "),
  );
}

function includesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function extractMarketCodes(instrumentText: string): Set<string> {
  const codes = new Set<string>();
  const codePattern = new RegExp(`\\b(${MARKET_CODES.join("|")})\\b`, "giu");

  for (const match of instrumentText.matchAll(codePattern)) {
    codes.add((match[1] ?? "").toUpperCase());
  }

  if (includesAny(instrumentText, [/доллар\p{L}*/u])) {
    codes.add("USD");
  }

  if (includesAny(instrumentText, [/(^|\s)евро($|\s)/u])) {
    codes.add("EUR");
  }

  if (includesAny(instrumentText, [/рубл\p{L}*/u])) {
    codes.add("RUB");
  }

  if (
    includesAny(instrumentText, [
      /\bbyn\b/u,
      /белорус\p{L}*\s+рубл\p{L}*/u,
      /белрубл\p{L}*/u,
    ])
  ) {
    codes.add("BYN");
  }

  if (includesAny(instrumentText, [/биткоин\p{L}*/u, /\bbitcoin\b/u])) {
    codes.add("BTC");
  }

  if (includesAny(instrumentText, [/эфир\p{L}*/u, /\bethereum\b/u])) {
    codes.add("ETH");
  }

  return codes;
}

function extractExplicitPairs(instrumentText: string): Set<string> {
  const pairs = new Set<string>();
  const pairPattern = new RegExp(
    `\\b(${MARKET_CODES.join("|")})\\s*[/-]\\s*(${MARKET_CODES.join("|")})\\b`,
    "giu",
  );

  for (const match of instrumentText.matchAll(pairPattern)) {
    const left = (match[1] ?? "").toUpperCase();
    const right = (match[2] ?? "").toUpperCase();
    if (left && right && left !== right) {
      pairs.add(`${left}/${right}`);
    }
  }

  return pairs;
}

function inferLane(codes: Set<string>): MarketLane {
  if (CRYPTO_CODES.some((code) => codes.has(code))) {
    return "crypto";
  }

  if (FX_CODES.some((code) => codes.has(code))) {
    return "fx";
  }

  return "other";
}

function inferDirection(text: string): MarketDirection {
  const down = includesAny(text, [
    /сниж\p{L}*/u,
    /сдал\p{L}*/u,
    /слаб\p{L}*/u,
    /(^|\s)ниже($|\s)/u,
    /пада\p{L}*/u,
    /просе\p{L}*/u,
    /\blower\b/u,
    /\bfall\p{L}*/u,
    /\bdeclin\p{L}*/u,
    /\bdrop\p{L}*/u,
    /\bweaken\p{L}*/u,
  ]);
  const up = includesAny(text, [
    /рост\p{L}*/u,
    /раст\p{L}*/u,
    /вырос\p{L}*/u,
    /укреп\p{L}*/u,
    /(^|\s)выше($|\s)/u,
    /подня\p{L}*/u,
    /\brise\p{L}*/u,
    /\bgain\p{L}*/u,
    /\brally\p{L}*/u,
    /\bhigher\b/u,
    /\bstrengthen\p{L}*/u,
  ]);

  if (down && up) {
    return "mixed";
  }

  if (down) {
    return "down";
  }

  if (up) {
    return "up";
  }

  return "unknown";
}

function extractTheses(text: string, lane: MarketLane): Set<string> {
  const theses = new Set<string>();

  if (
    includesAny(text, [
      /экспорт\p{L}*/u,
      /выручк\p{L}*/u,
      /\benergy\b/u,
      /\bexport\p{L}*/u,
      /нефт\p{L}*/u,
      /газ\p{L}*/u,
    ])
  ) {
    theses.add("export_pressure");
  }

  if (
    includesAny(text, [
      /импорт\p{L}*/u,
      /спрос\p{L}*/u,
      /\bdemand\b/u,
      /\bconsumer\p{L}*/u,
    ])
  ) {
    theses.add("import_demand");
  }

  if (
    includesAny(text, [
      /ставк\p{L}*/u,
      /инфляц\p{L}*/u,
      /\brate\p{L}*/u,
      /\binflation\b/u,
    ])
  ) {
    theses.add("rate_inflation");
  }

  if (
    includesAny(text, [
      /волатил\p{L}*/u,
      /риск\p{L}*/u,
      /давлен\p{L}*/u,
      /\bpressure\b/u,
      /\brisk\p{L}*/u,
    ])
  ) {
    theses.add("risk_volatility");
  }

  if (includesAny(text, [/\betf\b/u, /приток\p{L}*/u, /\binflow\p{L}*/u])) {
    theses.add("fund_flow");
  }

  if (lane === "fx" && theses.size === 0) {
    theses.add("fx_move");
  }

  if (lane === "crypto" && theses.size === 0) {
    theses.add("crypto_move");
  }

  return theses;
}

function buildMarketStoryFamily(post: MarketStoryPost): MarketStoryFamily {
  const instrumentText = buildInstrumentText(post);
  const contextText = buildContextText(post);
  const instruments = extractMarketCodes(instrumentText);
  const lane = inferLane(instruments);

  return {
    lane,
    instruments,
    pairs: extractExplicitPairs(instrumentText),
    direction: inferDirection(contextText),
    theses: extractTheses(contextText, lane),
  };
}

function countIntersection(left: Set<string>, right: Set<string>): number {
  let shared = 0;
  for (const item of left) {
    if (right.has(item)) {
      shared += 1;
    }
  }

  return shared;
}

function hasStrongSharedThesis(
  left: MarketStoryFamily,
  right: MarketStoryFamily,
): boolean {
  for (const thesis of left.theses) {
    if (right.theses.has(thesis) && STRONG_REPEAT_THESES.has(thesis)) {
      return true;
    }
  }

  return false;
}

function hasCompatibleDirection(
  left: MarketStoryFamily,
  right: MarketStoryFamily,
): boolean {
  if (left.direction === "unknown" || right.direction === "unknown") {
    return false;
  }

  return left.direction === right.direction || left.direction === "mixed" || right.direction === "mixed";
}

function getHoursSince(value: string | undefined, now: Date): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return (now.getTime() - parsed.getTime()) / 3_600_000;
}

function isMarketStoryRepeat(
  candidate: MarketStoryFamily,
  recent: MarketStoryFamily,
): boolean {
  if (candidate.lane !== recent.lane || candidate.lane === "other") {
    return false;
  }

  if (!hasCompatibleDirection(candidate, recent)) {
    return false;
  }

  if (countIntersection(candidate.pairs, recent.pairs) > 0) {
    return true;
  }

  const sharedInstruments = countIntersection(
    candidate.instruments,
    recent.instruments,
  );
  if (sharedInstruments >= 2 && hasStrongSharedThesis(candidate, recent)) {
    return true;
  }

  return (
    candidate.lane === "fx" &&
    sharedInstruments >= 1 &&
    hasStrongSharedThesis(candidate, recent)
  );
}

export function findMarketStoryFamilyConflict(
  candidate: MarketStoryPost,
  recentPosts: readonly MarketStoryPost[],
  now: Date = new Date(),
  maxAgeHours = MARKET_STORY_FAMILY_WINDOW_HOURS,
): string | null {
  if (candidate.category !== "Markets") {
    return null;
  }

  const candidateFamily = buildMarketStoryFamily(candidate);
  for (const recent of recentPosts) {
    if (recent.category !== "Markets") {
      continue;
    }

    const hoursSince = getHoursSince(recent.created_at, now);
    if (hoursSince === null || hoursSince < 0 || hoursSince > maxAgeHours) {
      continue;
    }

    if (isMarketStoryRepeat(candidateFamily, buildMarketStoryFamily(recent))) {
      return recent.title;
    }
  }

  return null;
}
