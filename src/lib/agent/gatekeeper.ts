import { GATEKEEPER_SYSTEM_PROMPT } from "./prompts";
import { ensureGatekeeperResult, parseJsonObject } from "./parsing";
import { withDeadline } from "./runtime";
import type {
  GroqChatClientLike,
  MiroGatekeeperResult,
} from "./types";
import type { MiroFactsPayload } from "../connectors";

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
  "BBC Sport",
]);

const TIMEOUT_FALLBACK_SAFE_SOURCES = new Set([
  "ScienceDaily",
  "HackerNews",
  "Onliner Tech",
  "TechCrunch",
  "Ars Technica",
  "Habr Develop",
  "iXBT",
  "3DNews",
  "N+1",
  "Naked Science",
]);

const WORLD_TIMEOUT_SAFE_PATTERNS: readonly RegExp[] = [
  /\b(снег|ветер|фронт|холод|погода|магнолия|весна|двор|трейлер|премьера|культур)\b/i,
  /\b(snow|wind|cold front|weather|magnolia|spring|trailer|premiere|culture)\b/i,
];

function normalizeGatekeeperText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesKeyword(haystack: string, keywords: readonly string[]): boolean {
  const normalizedHaystack = normalizeGatekeeperText(haystack);
  return keywords.some((keyword) =>
    normalizedHaystack.includes(normalizeGatekeeperText(keyword)),
  );
}

export function evaluateHeuristicGatekeeper(
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

export function evaluateGatekeeperTimeoutFallback(
  payload: MiroFactsPayload,
  errorMessage: string,
): MiroGatekeeperResult | null {
  const normalizedError = normalizeGatekeeperText(errorMessage);
  if (!normalizedError.includes("deadline") && !normalizedError.includes("timeout")) {
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

  if (
    (payload.category_hint === "Markets" || payload.category_hint === "Sports") &&
    FAST_SAFE_SOURCES.has(payload.source)
  ) {
    return {
      is_safe: true,
      reason: "timeout fallback fast-passed structured non-political source",
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

export async function runGatekeeper(
  client: GroqChatClientLike,
  model: string,
  payload: MiroFactsPayload,
  timeoutMs: number,
): Promise<MiroGatekeeperResult> {
  const completion = await withDeadline(
    client.chat.completions.create({
      model,
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
    "gatekeeper model call",
  );

  const raw = completion.choices?.[0]?.message?.content;
  return ensureGatekeeperResult(
    parseJsonObject<MiroGatekeeperResult>(raw, "Gatekeeper model"),
  );
}
