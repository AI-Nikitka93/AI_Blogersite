import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  MiroAgent,
  type MiroEvidenceRecord,
  type MiroAgentResult,
  type MiroAgentSkippedResult,
  type MiroPost,
  type MiroSelectionStrategy,
  type MiroTopic,
} from "../../../src/lib/agent";
import { createMiroChatClient } from "../../../src/lib/agent/clients";
import {
  fetchCryptoFacts,
  fetchCurrencyFacts,
  type MiroFactsPayload,
} from "../../../src/lib/connectors";
import { buildMiroMemoryContext } from "../../../src/lib/miro-mind";
import {
  getMiroActiveSlot,
  getMiroScheduleDecision,
  getMiroScheduleSlotKey,
  getNextMiroScheduleSlot,
  type MiroScheduleSlot,
} from "../../../src/lib/miro-schedule";
import {
  getAdminSupabaseClient,
  mapPostToInsert,
} from "../../../src/lib/supabase";
import type { PostInsert, PostRow } from "../../../src/lib/supabase";
import { POSTS_CACHE_TAG } from "../../../src/lib/posts";
import { publishPostToTelegram } from "../../../src/lib/telegram";
import type { TelegramPublishResult } from "../../../src/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

interface PostsInsertQuery {
  insert(values: PostInsert): {
    select(columns: string): {
      single(): Promise<{
        data: Pick<PostRow, "id" | "created_at"> | null;
        error: { message: string } | null;
      }>;
    };
  };
}

interface RecentPostRow {
  id: string;
  created_at: string;
  title: string;
  inferred: string;
  observed: string[];
  cross_signal: string;
  hypothesis: string;
  category: PostRow["category"];
}

type CooldownComparablePost = {
  category: PostRow["category"];
  title: string;
  observed: string[];
  inferred: string;
};

interface RecentPostsQuery {
  select(columns: string): {
    order(
      column: string,
      options: { ascending: boolean },
    ): {
      limit(limit: number): Promise<{
        data: RecentPostRow[] | null;
        error: { message: string } | null;
      }>;
    };
  };
}

interface AttemptedTopic {
  topic?: MiroTopic;
  status: "generated" | "skipped";
  reason?: string;
}

interface FallbackCandidate {
  topic: MiroTopic;
  payload: MiroFactsPayload;
  reason: string;
}

type PersistedMiroPost = MiroPost & {
  reasoning: string;
  confidence: "high" | "medium" | "low";
};

const FALLBACK_TOPIC_ORDER: readonly MiroTopic[] = [
  "sports",
  "markets_fx",
  "tech_world",
  "markets_crypto",
  "world",
] as const;

const ROUTE_TOTAL_TIMEOUT_MS = 9_500;
const ROUTE_RESPONSE_RESERVE_MS = 600;
const ROUTE_MIN_AGENT_BUDGET_MS = 3_200;
const ROUTE_PREFERRED_AGENT_BUDGET_MS = 7_600;

interface CronDiagnostics {
  budget_exhausted: boolean;
  circuit_open: boolean;
  source_rotation_exhausted: boolean;
}

type CronStatus = "success" | "skipped" | "failed";

type CronJsonResponse = CronDiagnostics & {
  status: CronStatus;
  reason?: string;
  trace_id: string;
  topic?: MiroTopic;
  attempts?: AttemptedTopic[];
  post_id?: string;
  created_at?: string;
  mode?: "editorial_fallback" | "timeout_fallback";
  telegram?: TelegramPublishResult;
};

class CronUnauthorizedError extends Error {
  readonly statusCode = 401;
}

const CATEGORY_COOLDOWN_HOURS: Record<PostRow["category"], number> = {
  World: 3,
  Tech: 3,
  Markets: 3,
  Sports: 3,
};

const CATEGORY_DAILY_LIMIT: Record<PostRow["category"], number> = {
  World: 3,
  Tech: 3,
  Markets: 3,
  Sports: 3,
};

const MINSK_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Minsk",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createObservedSignature(observed: string[]): string {
  return observed
    .slice(0, 2)
    .map((fact) => normalizeForComparison(fact))
    .join(" | ");
}

function createTokenSet(value: string): Set<string> {
  return new Set(
    normalizeForComparison(value)
      .split(" ")
      .filter((token) => token.length >= 4),
  );
}

function calculateJaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function getMinskDayKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return MINSK_DAY_FORMATTER.format(date);
}

function getPersistedPostScheduleSlot(
  createdAt: string,
): MiroScheduleSlot | undefined {
  return getMiroActiveSlot(new Date(createdAt));
}

async function getPendingScheduledSlot(
  query: RecentPostsQuery,
  now: Date = new Date(),
): Promise<{
  pendingSlot?: MiroScheduleSlot;
  nextSlot: MiroScheduleSlot;
  activeSlot?: MiroScheduleSlot;
}> {
  const { data, error } = await query
    .select("id, created_at, title, inferred, observed, cross_signal, hypothesis, category")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(`Failed to load recent posts for schedule check: ${error.message}`);
  }

  const todayKey = getMinskDayKey(now);
  const filledSlotKeys = new Set<string>();

  for (const post of data ?? []) {
    if (getMinskDayKey(post.created_at) !== todayKey) {
      continue;
    }

    const scheduleSlot = getPersistedPostScheduleSlot(post.created_at);
    if (scheduleSlot) {
      filledSlotKeys.add(getMiroScheduleSlotKey(scheduleSlot));
    }
  }

  const activeSlot = getMiroActiveSlot(now);
  const pendingSlot =
    activeSlot && !filledSlotKeys.has(getMiroScheduleSlotKey(activeSlot))
      ? activeSlot
      : undefined;

  return {
    pendingSlot,
    activeSlot,
    nextSlot: getNextMiroScheduleSlot(now),
  };
}

function getHoursSince(value: string, nowMs: number): number {
  return (nowMs - new Date(value).getTime()) / 3_600_000;
}

function countRegexMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function getCooldownLane(post: CooldownComparablePost): string {
  if (post.category !== "Markets") {
    return post.category;
  }

  const haystack = normalizeForComparison(
    `${post.title} ${post.inferred} ${post.observed.join(" ")}`,
  );

  const cryptoScore = countRegexMatches(
    haystack,
    /\b(bitcoin|btc|ethereum|eth|solana|sol|xrp|doge|altcoin|token|defi|crypto|крипт|биткоин|эфир|эфириум)\b/giu,
  );
  const fxScore = countRegexMatches(
    haystack,
    /\b(usd|eur|gbp|jpy|cny|chf|rub|cad|aud|nzd|fx|forex|доллар|евро|фунт|иен|юан|франк|рубл)\b/giu,
  );

  if (cryptoScore > fxScore && cryptoScore > 0) {
    return "Markets:crypto";
  }

  if (fxScore > cryptoScore && fxScore > 0) {
    return "Markets:fx";
  }

  return "Markets";
}

function sharesCooldownLane(
  left: CooldownComparablePost,
  right: CooldownComparablePost,
): boolean {
  if (left.category !== right.category) {
    return false;
  }

  if (left.category !== "Markets") {
    return true;
  }

  const leftLane = getCooldownLane(left);
  const rightLane = getCooldownLane(right);

  return (
    leftLane === rightLane ||
    leftLane === "Markets" ||
    rightLane === "Markets"
  );
}

async function findNoveltyConflict(
  query: RecentPostsQuery,
  candidate: PostInsert,
): Promise<string | null> {
  const { data, error } = await query
    .select("id, created_at, title, inferred, observed, cross_signal, hypothesis, category")
    .order("created_at", { ascending: false })
    .limit(18);

  if (error) {
    throw new Error(`Failed to load recent posts for novelty check: ${error.message}`);
  }

  const nowMs = Date.now();
  const todayKey = getMinskDayKey(new Date(nowMs));
  const recentPosts = data ?? [];
  const sameCategoryPosts = recentPosts.filter(
    (post) => post.category === candidate.category,
  );
  const candidateTitle = normalizeForComparison(candidate.title);
  const candidateObserved = createObservedSignature(candidate.observed);
  const candidateTokens = createTokenSet(`${candidate.title} ${candidate.inferred}`);

  const recentSameCategory = sameCategoryPosts.find((post) => {
    const hoursSince = getHoursSince(post.created_at, nowMs);
    return (
      hoursSince >= 0 &&
      hoursSince < CATEGORY_COOLDOWN_HOURS[candidate.category] &&
      sharesCooldownLane(candidate, post)
    );
  });

  if (recentSameCategory) {
    return `category cooldown is still active after "${recentSameCategory.title}"`;
  }

  const sameCategoryTodayCount = sameCategoryPosts.filter(
    (post) =>
      getMinskDayKey(post.created_at) === todayKey &&
      sharesCooldownLane(candidate, post),
  ).length;

  if (sameCategoryTodayCount >= CATEGORY_DAILY_LIMIT[candidate.category]) {
    return `daily category cap reached for ${candidate.category.toLowerCase()}`;
  }

  for (const recent of recentPosts) {
    const recentTitle = normalizeForComparison(recent.title);
    if (candidateTitle && recentTitle && candidateTitle === recentTitle) {
      return `title already used recently: "${recent.title}"`;
    }

    if (
      candidateObserved &&
      candidateObserved === createObservedSignature(recent.observed ?? [])
    ) {
      return `observed facts are too close to recent post "${recent.title}"`;
    }

    const similarity = calculateJaccard(
      candidateTokens,
      createTokenSet(`${recent.title} ${recent.inferred}`),
    );
    if (
      (recent.category === candidate.category && similarity >= 0.78) ||
      (recent.category !== candidate.category && similarity >= 0.86)
    ) {
      return `semantic overlap too high with recent post "${recent.title}"`;
    }
  }

  return null;
}

async function loadMemoryContext(
  query: RecentPostsQuery,
) {
  const { data, error } = await query
    .select("id, created_at, title, inferred, observed, cross_signal, hypothesis, category")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(`Failed to load recent posts for memory context: ${error.message}`);
  }

  return buildMiroMemoryContext(
    (data ?? []).map((post) => ({
      title: post.title,
      inferred: post.inferred,
      cross_signal: post.cross_signal,
      hypothesis: post.hypothesis,
      category: post.category,
    })),
  );
}

function getSecretFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret) {
    return headerSecret.trim();
  }

  const url = new URL(request.url);
  return url.searchParams.get("token");
}

function getForcedTopic(request: Request): MiroTopic | undefined {
  const topic = new URL(request.url).searchParams.get("topic");
  if (
    topic === "sports" ||
    topic === "markets_fx" ||
    topic === "markets_crypto" ||
    topic === "tech_world" ||
    topic === "world"
  ) {
    return topic;
  }

  return undefined;
}

function getSelectionStrategy(request: Request): MiroSelectionStrategy {
  const value = new URL(request.url).searchParams.get("strategy");
  if (
    value === "random" ||
    value === "round_robin" ||
    value === "urgent_override"
  ) {
    return value;
  }

  return "editorial_schedule";
}

function getFallbackTopics(primaryTopic?: MiroTopic): MiroTopic[] {
  return FALLBACK_TOPIC_ORDER.filter((topic) => topic !== primaryTopic);
}

function createRouteTraceId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `cron_${Date.now()}_${random}`;
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isBudgetExhaustedReason(reason?: string): boolean {
  return (
    typeof reason === "string" &&
    (reason.includes("Time budget exhausted") ||
      reason.includes("budget exhausted") ||
      reason.includes("deadline"))
  );
}

function isCircuitOpenReason(reason?: string): boolean {
  return typeof reason === "string" && reason.includes("circuit is open");
}

function isSourceRotationExhaustedReason(reason?: string): boolean {
  return (
    typeof reason === "string" &&
    (reason.includes("Unable to collect") ||
      reason.includes("rotation budget exhausted") ||
      reason.includes("too few usable"))
  );
}

function deriveCronDiagnostics(input: {
  reason?: string;
  attempts?: AttemptedTopic[];
  evidence?: MiroEvidenceRecord[];
}): CronDiagnostics {
  const messages = [
    input.reason,
    ...(input.attempts ?? []).map((attempt) => attempt.reason),
    ...(input.evidence ?? []).flatMap((record) => [
      record.input_summary,
      record.output_summary,
      record.verifier_result,
    ]),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return {
    budget_exhausted: messages.some((message) => isBudgetExhaustedReason(message)),
    circuit_open: messages.some((message) => isCircuitOpenReason(message)),
    source_rotation_exhausted: messages.some((message) =>
      isSourceRotationExhaustedReason(message),
    ),
  };
}

function buildCronJsonResponse(input: {
  status: CronStatus;
  traceId: string;
  reason?: string;
  topic?: MiroTopic;
  attempts?: AttemptedTopic[];
  evidence?: MiroEvidenceRecord[];
  postId?: string;
  createdAt?: string;
  mode?: "editorial_fallback" | "timeout_fallback";
  telegram?: TelegramPublishResult;
}): CronJsonResponse {
  return {
    status: input.status,
    trace_id: input.traceId,
    reason: input.reason,
    topic: input.topic,
    attempts: input.attempts,
    post_id: input.postId,
    created_at: input.createdAt,
    mode: input.mode,
    telegram: input.telegram,
    ...deriveCronDiagnostics({
      reason: input.reason,
      attempts: input.attempts,
      evidence: input.evidence,
    }),
  };
}

function ensureCronAuthorized(request: Request): void {
  const expectedSecret = process?.env?.CRON_SECRET;
  if (!expectedSecret) {
    throw new CronUnauthorizedError("CRON_SECRET is not configured.");
  }

  const actualSecret = getSecretFromRequest(request);
  if (actualSecret !== expectedSecret) {
    throw new CronUnauthorizedError("Unauthorized cron request.");
  }
}

function getRemainingRouteBudgetMs(startedAt: number): number {
  return ROUTE_TOTAL_TIMEOUT_MS - (Date.now() - startedAt);
}

function getAgentBudgetForRoute(startedAt: number): number | null {
  const remaining = getRemainingRouteBudgetMs(startedAt) - ROUTE_RESPONSE_RESERVE_MS;
  if (remaining < ROUTE_MIN_AGENT_BUDGET_MS) {
    return null;
  }

  return Math.min(remaining, ROUTE_PREFERRED_AGENT_BUDGET_MS);
}

function shouldTryFallbackTopics(input: {
  forcedTopic?: MiroTopic;
  result: MiroAgentResult;
}): input is {
  forcedTopic?: undefined;
  result: MiroAgentResult & { status: "skipped"; topic: MiroTopic };
} {
  return !input.forcedTopic && input.result.status === "skipped" && Boolean(input.result.topic);
}

function isGeneratorTimeoutReason(reason?: string): boolean {
  return (
    typeof reason === "string" &&
    (reason.includes("Groq generator call exceeded") ||
      reason.includes("generator model call exceeded"))
  );
}

function isGeneratorFormatReason(reason?: string): boolean {
  return (
    typeof reason === "string" &&
    (reason.includes("json_validate_failed") ||
      reason.includes("Failed to generate JSON") ||
      reason.includes("invalid JSON"))
  );
}

function getRecoverableMarketTopic(
  attempts: AttemptedTopic[],
): "markets_fx" | "markets_crypto" | undefined {
  for (const attempt of attempts) {
    if (
      (attempt.topic === "markets_fx" || attempt.topic === "markets_crypto") &&
      (isGeneratorTimeoutReason(attempt.reason) ||
        isGeneratorFormatReason(attempt.reason))
    ) {
      return attempt.topic;
    }
  }

  return undefined;
}

function normalizeFact(fact: string): string {
  return fact.replace(/\s+/g, " ").trim();
}

function hasCyrillic(value: string): boolean {
  return /[А-Яа-яЁёІіЎў]/u.test(value);
}

function hasLatin(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function needsRussianLocalization(value: string): boolean {
  return hasLatin(value) && !hasCyrillic(value);
}

function findRussianLanguageLeak(post: PersistedMiroPost): string | null {
  if (needsRussianLocalization(post.title)) {
    return "fallback title stayed in English";
  }

  if (needsRussianLocalization(post.opinion)) {
    return "fallback opinion stayed in English";
  }

  const leakedObserved = post.observed.find((fact) =>
    needsRussianLocalization(fact),
  );
  if (leakedObserved) {
    return `fallback observed fact stayed in English: "${leakedObserved}"`;
  }

  const inferredParagraph = post.inferred
    .split(/\n\s*\n/u)
    .map((part) => normalizeFact(part))
    .find(Boolean);

  if (inferredParagraph && needsRussianLocalization(inferredParagraph)) {
    return "fallback inferred lead stayed in English";
  }

  return null;
}

function getLocalizerProvider(): "groq" | "nvidia" | "openrouter" {
  const explicit = process?.env?.MIRO_LOCALIZER_PROVIDER;
  if (explicit === "groq" || explicit === "nvidia" || explicit === "openrouter") {
    return explicit;
  }

  const research = process?.env?.MIRO_RESEARCH_PROVIDER;
  if (research === "groq" || research === "nvidia" || research === "openrouter") {
    return research;
  }

  const fallback = process?.env?.MIRO_LLM_PROVIDER;
  return fallback === "nvidia"
    ? "nvidia"
    : fallback === "openrouter"
      ? "openrouter"
      : "groq";
}

function getLocalizerModel(
  provider: "groq" | "nvidia" | "openrouter",
): string {
  if (process?.env?.MIRO_LOCALIZER_MODEL) {
    return process.env.MIRO_LOCALIZER_MODEL;
  }

  if (process?.env?.MIRO_RESEARCH_MODEL) {
    return process.env.MIRO_RESEARCH_MODEL;
  }

  if (provider === "nvidia") {
    return process?.env?.MIRO_NVIDIA_MODEL ?? "z-ai/glm-4.7";
  }

  if (provider === "openrouter") {
    return process?.env?.MIRO_OPENROUTER_MODEL ?? "z-ai/glm-5.1";
  }

  return process?.env?.MIRO_GENERATOR_MODEL ?? "llama-3.3-70b-versatile";
}

async function localizeFactsToRussian(
  facts: string[],
  source: string,
): Promise<string[]> {
  const normalized = facts.map(normalizeFact).filter(Boolean).slice(0, 3);
  if (normalized.length === 0) {
    return [];
  }

  if (!normalized.some(needsRussianLocalization)) {
    return normalized;
  }

  try {
    const provider = getLocalizerProvider();
    const client = createMiroChatClient({ provider });
    const model = getLocalizerModel(provider);
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 220,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "Translate or paraphrase input fact lines into concise Russian factual lines. Preserve numbers, named entities, and tickers. Do not add analysis. Do not keep English sentence structure. Return only valid JSON with key facts.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              target_language: "ru",
              source,
              facts: normalized,
              output_contract: {
                facts: ["string"],
              },
            },
            null,
            2,
          ),
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      return normalized;
    }

    const parsed = JSON.parse(raw) as { facts?: unknown };
    if (!Array.isArray(parsed.facts)) {
      return normalized;
    }

    const localized = parsed.facts
      .map((item) => (typeof item === "string" ? normalizeFact(item) : ""))
      .filter(Boolean)
      .slice(0, normalized.length);

    return localized.length > 0 ? localized : normalized;
  } catch (error) {
    console.warn("[MiroCron] Fact localization skipped", {
      source,
      error: error instanceof Error ? error.message : String(error),
    });
    return normalized;
  }
}

function createFallbackTitleTail(fact: string): string {
  const cleaned = normalizeFact(fact)
    .replace(/^[-–—•]\s*/, "")
    .replace(/[()]/g, "")
    .trim();

  const clause = cleaned
    .split(/[.!?;]/)[0]
    ?.split(/\s[-–—]\s/)[0]
    ?.trim() ?? "";

  const compact = clause
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(" ");

  if (!compact) {
    return "день сбился с ровной линии";
  }

  return compact.length <= 56
    ? compact
    : `${compact.slice(0, 55).trimEnd()}…`;
}

async function buildMarketTimeoutFallbackPost(
  topic: "markets_fx" | "markets_crypto",
  payload: MiroFactsPayload,
): Promise<PersistedMiroPost | null> {
  const observed = await localizeFactsToRussian(payload.facts, payload.source);
  if (observed.length === 0) {
    return null;
  }

  const lead = observed[0];
  const secondary = observed[1] ?? observed[0];
  const title =
    topic === "markets_fx"
      ? `Валюты пошли вразнобой: ${createFallbackTitleTail(lead)}`
      : `Крипта двинулась выборочно: ${createFallbackTitleTail(lead)}`;
  const inferred =
    topic === "markets_fx"
      ? `${lead}\n\nЯ бы пропустил это как еще одну спокойную таблицу, если бы строки шли вместе. Они не идут вместе. В этом и остается заноза.\n\n${secondary}\n\nЭто еще не разворот. Просто у дня появился перекос. Мне его уже достаточно, чтобы задержаться на нем дольше обычного.`
      : `${lead}\n\nМеня здесь держит не ширина движения, а его выборочность. Экран вроде общий, но тянет взгляд только в одну сторону. Так шум перестает быть шумом.\n\n${secondary}\n\nЯ не называю это переломом. Пока рано. Но единый строй уже распался, и дальше рынок обычно становится нервнее, чем хочет казаться.`;

  return {
    title,
    source: payload.source,
    observed,
    inferred,
    opinion:
      topic === "markets_fx"
        ? "Я не верю в спокойный валютный день, когда соседние пары уже идут на разной скорости."
        : "Я бы не называл это общей слабостью рынка: здесь слишком явно наказывают одни монеты сильнее других.",
    cross_signal:
      topic === "markets_fx"
        ? "Для валют сейчас важнее не масштаб, а то, что соседние пары живут на разной скорости."
        : "Для крипты важнее не общий подъем, а то, какая именно линия вырывается из общего строя.",
    hypothesis:
      topic === "markets_fx"
        ? "Если этот разный темп сохранится еще на цикл, рынок начнет выделять отдельные пары раньше общего разворота."
        : "Если выборочный импульс не погаснет, следующая сессия станет тестом уже не для рынка целиком, а для его одиночных лидеров.",
    telegram_text:
      topic === "markets_fx"
        ? "Соседние валютные пары уже идут на разной скорости. Для меня это важнее самой цифры фикса, потому что перекос обычно появляется раньше общего разворота. Полная мысль — на сайте."
        : "Рынок проседает не целиком, а выборочно. Когда давление распределяется так неровно, мне важнее не индекс страха, а то, кого наказывают первым. Полная мысль — на сайте.",
    reasoning:
      "Даже без длинной генерации здесь остался конкретный перекос в ритме, а не сухой рыночный фон.",
    confidence: "medium",
    category: "Markets",
  };
}

async function buildTopicFallbackPost(
  topic: MiroTopic,
  payload: MiroFactsPayload,
): Promise<PersistedMiroPost | null> {
  const observed = await localizeFactsToRussian(payload.facts, payload.source);
  if (observed.length === 0) {
    return null;
  }

  const lead = observed[0];
  const secondary = observed[1] ?? observed[0];

  if (topic === "tech_world") {
    return {
      title: `Техдень сдвинулся: ${createFallbackTitleTail(lead)}`,
      source: payload.source,
      observed,
      inferred:
        `${lead}\n\nМеня здесь держит не общий шум релизов, а конкретный сдвиг, который уже нельзя назвать фоном.\n\n${secondary}\n\nДаже если новость не кричит, у нее есть форма давления: привычка чуть сдвигается, и этого уже достаточно, чтобы задержаться на ней дольше обычного.`,
      opinion:
        "Я не покупаю это как рядовой релиз. Если привычка сдвигается, новость уже важнее анонса.",
      cross_signal:
        "В технологии важнее не громкость анонса, а то, как быстро одна деталь начинает менять рутину.",
      hypothesis:
        "Если этот сдвиг переживет еще один цикл новостей, он станет уже не обновлением, а новой нормой поведения.",
      telegram_text:
        "Меня интересует не сам релиз, а тот момент, когда одна деталь перестает быть фоном. Если привычка уже сдвинулась, новость живет дольше заголовка. Полная запись — на сайте.",
      reasoning:
        "Даже в fallback-режиме здесь остался конкретный технологический сдвиг, а не пустой PR-шум.",
      confidence: "medium",
      category: "Tech",
    };
  }

  if (topic === "sports") {
    return null;
  }

  if (topic === "world") {
    return {
      title: `На мировом фоне сдвиг: ${createFallbackTitleTail(lead)}`,
      source: payload.source,
      observed,
      inferred:
        `${lead}\n\nМеня здесь держит не масштаб заголовка, а то, как одна конкретная деталь меняет обычный дневной фон.\n\n${secondary}\n\nЭто не большая мировая драма. И именно поэтому такой сигнал стоит оставить в ленте: он не давит шумом, а меняет угол зрения.`,
      opinion:
        "Такие тихие мировые детали для меня честнее больших заголовков: они меняют фон без истерики.",
      cross_signal:
        "Самые живые мировые заметки часто начинаются не с громкого события, а с малого сдвига в привычной сцене.",
      hypothesis: "",
      telegram_text:
        "Самые живые мировые сигналы часто выглядят слишком бытовыми для большой новости. Но именно в такой детали обычно впервые меняется общий фон. Полная запись — на сайте.",
      reasoning:
        "Даже без сильной эскалации здесь есть конкретный неполитический мировой сдвиг, а не пустая хроника.",
      confidence: "low",
      category: "World",
    };
  }

  if (topic === "markets_fx" || topic === "markets_crypto") {
    return buildMarketTimeoutFallbackPost(topic, payload);
  }

  return null;
}

function extractFallbackCandidate(result: MiroAgentResult): FallbackCandidate | null {
  if (result.status !== "skipped" || !result.topic || !result.payload) {
    return null;
  }

  if (result.gatekeeper && !result.gatekeeper.is_safe) {
    return null;
  }

  return {
    topic: result.topic,
    payload: result.payload,
    reason: result.reason,
  };
}

async function buildTimedOutMarketFallbackPost(
  topic: "markets_fx" | "markets_crypto",
): Promise<PersistedMiroPost | null> {
  const payload =
    topic === "markets_fx"
      ? await fetchCurrencyFacts({ requestTimeoutMs: 3_500 })
      : await fetchCryptoFacts({ requestTimeoutMs: 3_500 });

  return buildMarketTimeoutFallbackPost(topic, payload);
}

async function persistAndPublishPost(args: {
  postsTable: PostsInsertQuery;
  candidateInsert: PostInsert;
  post: MiroPost;
  request: Request;
  traceId: string;
  topic: MiroTopic;
  attemptedTopics: AttemptedTopic[];
}): Promise<{
  savedPost: Pick<PostRow, "id" | "created_at">;
  telegram: TelegramPublishResult;
}> {
  console.log("Post passed gatekeeper, generating...");
  console.log("[MiroCron] Persisting generated post", {
    trace_id: args.traceId,
    topic: args.topic,
    title: args.post.title,
    category: args.post.category,
  });

  const { data: savedPost, error: insertError } = await args.postsTable
    .insert(args.candidateInsert)
    .select("id, created_at")
    .single();

  if (insertError || !savedPost) {
    throw new Error(
      `Supabase insert failed: ${insertError?.message ?? "No row returned."}`,
    );
  }

  revalidateTag(POSTS_CACHE_TAG, "max");
  revalidatePath("/", "page");
  revalidatePath("/archive", "page");
  revalidatePath(`/post/${savedPost.id}`, "page");

  let telegram: TelegramPublishResult;
  try {
    console.log("Attempting to publish to Telegram...");
    telegram = await publishPostToTelegram({
      post: args.post,
      postId: savedPost.id,
      requestUrl: args.request.url,
    });

    if (telegram.status === "failed") {
      console.error("Telegram publish failed:", telegram.reason);
    }
  } catch (error) {
    console.error("Telegram publish failed:", error);
    telegram = {
      status: "failed",
      reason:
        error instanceof Error
          ? error.message
          : "Unexpected Telegram publish error.",
    };
  }

  console.log("[MiroCron] Generated post", {
    trace_id: args.traceId,
    topic: args.topic,
    title: args.post.title,
    category: args.post.category,
    post_id: savedPost.id,
    attempts: args.attemptedTopics,
    telegram,
    post: args.post,
  });

  return { savedPost, telegram };
}

async function tryEditorialFallbacks(args: {
  supabase: ReturnType<typeof getAdminSupabaseClient>;
  recentPostsQuery: RecentPostsQuery;
  fallbackCandidates: FallbackCandidate[];
  request: Request;
  result: MiroAgentSkippedResult;
  attemptedTopics: AttemptedTopic[];
}): Promise<Response | null> {
  for (const candidate of args.fallbackCandidates) {
    try {
      const postsTable = args.supabase.from("posts") as unknown as PostsInsertQuery;
      const fallbackPost = await buildTopicFallbackPost(
        candidate.topic,
        candidate.payload,
      );

      if (!fallbackPost) {
        continue;
      }

      const languageLeak = findRussianLanguageLeak(fallbackPost);
      if (languageLeak) {
        args.attemptedTopics.push({
          topic: candidate.topic,
          status: "skipped",
          reason: languageLeak,
        });
        continue;
      }

      const fallbackInsert = mapPostToInsert(fallbackPost);
      const noveltyConflict = await findNoveltyConflict(
        args.recentPostsQuery,
        fallbackInsert,
      );

      if (noveltyConflict) {
        args.attemptedTopics.push({
          topic: candidate.topic,
          status: "skipped",
          reason: noveltyConflict,
        });
        continue;
      }

      args.attemptedTopics.push({
        topic: candidate.topic,
        status: "generated",
      });

      const traceId = `${args.result.trace_id}_editorial_fallback`;
      const { savedPost, telegram } = await persistAndPublishPost({
        postsTable,
        candidateInsert: fallbackInsert,
        post: fallbackPost,
        request: args.request,
        traceId,
        topic: candidate.topic,
        attemptedTopics: args.attemptedTopics,
      });

      return NextResponse.json(
        buildCronJsonResponse({
          status: "success",
          traceId,
          topic: candidate.topic,
          attempts: args.attemptedTopics,
          evidence: args.result.evidence,
          postId: savedPost.id,
          createdAt: savedPost.created_at,
          mode: "editorial_fallback",
          telegram,
        }),
      );
    } catch (error) {
      console.error("[MiroCron] Editorial fallback failed", {
        topic: candidate.topic,
        reason: candidate.reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}

async function safeRunAgent(
  agent: MiroAgent,
  input: {
    forcedTopic?: MiroTopic;
    selectionStrategy: MiroSelectionStrategy;
    memoryContext: ReturnType<typeof buildMiroMemoryContext>;
    totalTimeoutMs: number;
  },
): Promise<MiroAgentResult> {
  try {
    return await agent.run({
      forcedTopic: input.forcedTopic,
      selectionStrategy: input.selectionStrategy,
      targetLanguage: "ru",
      memoryContext: input.memoryContext,
      totalTimeoutMs: input.totalTimeoutMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agent error";
    console.error("[MiroCron] safeRunAgent fallback skip", {
      forced_topic: input.forcedTopic,
      strategy: input.selectionStrategy,
      error: message,
    });
    return {
      status: "skipped",
      trace_id: `route_skip_${Date.now()}`,
      topic: input.forcedTopic,
      reason: message,
      evidence: [],
      runtime: {
        llm_provider:
          process?.env?.MIRO_WRITER_PROVIDER === "nvidia"
            ? "nvidia"
            : process?.env?.MIRO_WRITER_PROVIDER === "openrouter"
              ? "openrouter"
              : process?.env?.MIRO_LLM_PROVIDER === "nvidia"
                ? "nvidia"
                : process?.env?.MIRO_LLM_PROVIDER === "openrouter"
                  ? "openrouter"
                  : "groq",
        research_provider:
          process?.env?.MIRO_RESEARCH_PROVIDER === "nvidia"
            ? "nvidia"
            : process?.env?.MIRO_RESEARCH_PROVIDER === "openrouter"
              ? "openrouter"
              : process?.env?.MIRO_LLM_PROVIDER === "nvidia"
                ? "nvidia"
                : process?.env?.MIRO_LLM_PROVIDER === "openrouter"
                  ? "openrouter"
                  : "groq",
        research_model: "unknown",
        writer_provider:
          process?.env?.MIRO_WRITER_PROVIDER === "nvidia"
            ? "nvidia"
            : process?.env?.MIRO_WRITER_PROVIDER === "openrouter"
              ? "openrouter"
              : process?.env?.MIRO_LLM_PROVIDER === "nvidia"
                ? "nvidia"
                : process?.env?.MIRO_LLM_PROVIDER === "openrouter"
                  ? "openrouter"
                  : "groq",
        writer_model: "unknown",
        review_provider:
          process?.env?.MIRO_REVIEW_PROVIDER === "nvidia"
            ? "nvidia"
            : process?.env?.MIRO_REVIEW_PROVIDER === "openrouter"
              ? "openrouter"
              : process?.env?.MIRO_LLM_PROVIDER === "nvidia"
                ? "nvidia"
                : process?.env?.MIRO_LLM_PROVIDER === "openrouter"
                  ? "openrouter"
                  : "groq",
        review_model: "unknown",
        gatekeeper_model: "unknown",
        generator_model: "unknown",
        selection_strategy: input.selectionStrategy,
        max_iterations: 0,
        timeout_ms: 0,
        elapsed_ms: 0,
      },
    };
  }
}

export async function GET(request: Request): Promise<Response> {
  const routeStartedAt = Date.now();
  const routeTraceId = createRouteTraceId();
  const attemptedTopics: AttemptedTopic[] = [];
  let activeTraceId = routeTraceId;
  let activeTopic: MiroTopic | undefined;
  let activeEvidence: MiroEvidenceRecord[] = [];

  try {
    ensureCronAuthorized(request);

    const forcedTopic = getForcedTopic(request);
    const selectionStrategy = getSelectionStrategy(request);
    const supabase = getAdminSupabaseClient();
    const recentPostsQuery = supabase.from("posts") as unknown as RecentPostsQuery;
    const memoryContext = await loadMemoryContext(recentPostsQuery);
    const agent = new MiroAgent();
    const fallbackCandidates: FallbackCandidate[] = [];
    let scheduledSlot: MiroScheduleSlot | undefined;
    let result;

    if (!forcedTopic && selectionStrategy === "editorial_schedule") {
      const pendingSchedule = await getPendingScheduledSlot(recentPostsQuery);

      if (pendingSchedule.pendingSlot) {
        scheduledSlot = pendingSchedule.pendingSlot;
      } else {
        const scheduleDecision = getMiroScheduleDecision();
        const reason =
          !pendingSchedule.activeSlot
            ? scheduleDecision.kind === "quiet"
              ? scheduleDecision.reason
              : `Активный слот уже определен scheduler-логикой: ${scheduleDecision.slot.weekday_label} ${scheduleDecision.slot.local_time} (${scheduleDecision.slot.topic}).`
            : `Текущий слот уже закрыт сегодняшней публикацией. Следующее окно: ${pendingSchedule.nextSlot.weekday_label} ${pendingSchedule.nextSlot.local_time} (${pendingSchedule.nextSlot.topic}).`;

        return NextResponse.json(
          buildCronJsonResponse({
            status: "skipped",
            traceId: routeTraceId,
            reason,
            attempts: attemptedTopics,
          }),
        );
      }
    }

    const initialAgentBudget = getAgentBudgetForRoute(routeStartedAt);
    if (!initialAgentBudget) {
      return NextResponse.json(
        buildCronJsonResponse({
          status: "skipped",
          traceId: routeTraceId,
          reason: "Route budget exhausted before primary topic execution.",
          attempts: attemptedTopics,
        }),
      );
    }

    result = await safeRunAgent(agent, {
      forcedTopic: forcedTopic ?? scheduledSlot?.topic,
      selectionStrategy,
      memoryContext,
      totalTimeoutMs: initialAgentBudget,
    });
    activeTraceId = result.trace_id;
    activeTopic = result.topic;
    activeEvidence = result.evidence;
    attemptedTopics.push({
      topic: result.topic,
      status: result.status,
      reason: result.status === "skipped" ? result.reason : undefined,
    });
    const initialFallbackCandidate = extractFallbackCandidate(result);
    if (initialFallbackCandidate) {
      fallbackCandidates.push(initialFallbackCandidate);
    }

    if (shouldTryFallbackTopics({ forcedTopic, result })) {
      const primaryTopic = result.topic;
      for (const fallbackTopic of getFallbackTopics(primaryTopic)) {
        const fallbackBudget = getAgentBudgetForRoute(routeStartedAt);
        if (!fallbackBudget) {
          attemptedTopics.push({
            topic: fallbackTopic,
            status: "skipped",
            reason: "route budget exhausted before fallback execution",
          });
          break;
        }

        const fallbackResult = await safeRunAgent(agent, {
          forcedTopic: fallbackTopic,
          selectionStrategy,
          memoryContext,
          totalTimeoutMs: fallbackBudget,
        });
        activeTraceId = fallbackResult.trace_id;
        activeTopic = fallbackResult.topic;
        activeEvidence = fallbackResult.evidence;

        attemptedTopics.push({
          topic: fallbackResult.topic,
          status: fallbackResult.status,
          reason:
            fallbackResult.status === "skipped"
              ? fallbackResult.reason
              : undefined,
        });
        const fallbackCandidate = extractFallbackCandidate(fallbackResult);
        if (fallbackCandidate) {
          fallbackCandidates.push(fallbackCandidate);
        }

        if (fallbackResult.status === "generated") {
          result = fallbackResult;
          break;
        }
      }
    }

    if (result.status === "generated") {
      const postsTable = supabase.from("posts") as unknown as PostsInsertQuery;
      let candidateResult = result;
      let candidateInsert = mapPostToInsert(candidateResult.post);
      let noveltyConflict = await findNoveltyConflict(
        recentPostsQuery,
        candidateInsert,
      );

      if (noveltyConflict && !forcedTopic) {
        attemptedTopics.push({
          topic: candidateResult.topic,
          status: "skipped",
          reason: noveltyConflict,
        });

        for (const fallbackTopic of getFallbackTopics(candidateResult.topic)) {
          const fallbackBudget = getAgentBudgetForRoute(routeStartedAt);
          if (!fallbackBudget) {
            attemptedTopics.push({
              topic: fallbackTopic,
              status: "skipped",
              reason: "route budget exhausted before novelty fallback execution",
            });
            break;
          }

          const fallbackResult = await safeRunAgent(agent, {
            forcedTopic: fallbackTopic,
            selectionStrategy,
            memoryContext,
            totalTimeoutMs: fallbackBudget,
          });
          activeTraceId = fallbackResult.trace_id;
          activeTopic = fallbackResult.topic;
          activeEvidence = fallbackResult.evidence;

          attemptedTopics.push({
            topic: fallbackResult.topic,
            status: fallbackResult.status,
            reason:
              fallbackResult.status === "skipped"
                ? fallbackResult.reason
                : undefined,
          });
          const fallbackCandidate = extractFallbackCandidate(fallbackResult);
          if (fallbackCandidate) {
            fallbackCandidates.push(fallbackCandidate);
          }

          if (fallbackResult.status !== "generated") {
            continue;
          }

          const fallbackInsert = mapPostToInsert(fallbackResult.post);
          const fallbackNoveltyConflict = await findNoveltyConflict(
            recentPostsQuery,
            fallbackInsert,
          );

          if (fallbackNoveltyConflict) {
            attemptedTopics.push({
              topic: fallbackResult.topic,
              status: "skipped",
              reason: fallbackNoveltyConflict,
            });
            continue;
          }

          candidateResult = fallbackResult;
          candidateInsert = fallbackInsert;
          noveltyConflict = null;
          result = fallbackResult;
          break;
        }
      }

      if (noveltyConflict) {
        console.log("[MiroCron] Generation skipped by novelty gate", {
          trace_id: candidateResult.trace_id,
          topic: candidateResult.topic,
          title: candidateResult.post.title,
          reason: noveltyConflict,
          attempts: attemptedTopics,
        });

        return NextResponse.json(
          buildCronJsonResponse({
            status: "skipped",
            traceId: candidateResult.trace_id,
            reason: noveltyConflict,
            topic: candidateResult.topic,
            attempts: attemptedTopics,
            evidence: candidateResult.evidence,
          }),
        );
      }

      const { savedPost, telegram } = await persistAndPublishPost({
        postsTable,
        candidateInsert,
        post: result.post,
        request,
        traceId: result.trace_id,
        topic: result.topic,
        attemptedTopics,
      });

      return NextResponse.json(
        buildCronJsonResponse({
          status: "success",
          traceId: result.trace_id,
          topic: result.topic,
          attempts: attemptedTopics,
          evidence: result.evidence,
          postId: savedPost.id,
          createdAt: savedPost.created_at,
          telegram,
        }),
      );
    }

    const editorialFallbackResponse = await tryEditorialFallbacks({
      supabase,
      recentPostsQuery,
      fallbackCandidates,
      request,
      result,
      attemptedTopics,
    });
    if (editorialFallbackResponse) {
      return editorialFallbackResponse;
    }

    const timedOutMarketTopic = getRecoverableMarketTopic(attemptedTopics);
    if (timedOutMarketTopic) {
      try {
        const postsTable = supabase.from("posts") as unknown as PostsInsertQuery;
        const fallbackPost = await buildTimedOutMarketFallbackPost(
          timedOutMarketTopic,
        );

        if (fallbackPost) {
          const languageLeak = findRussianLanguageLeak(fallbackPost);
          if (languageLeak) {
            attemptedTopics.push({
              topic: timedOutMarketTopic,
              status: "skipped",
              reason: languageLeak,
            });
          } else {
            const fallbackInsert = mapPostToInsert(fallbackPost);
            const noveltyConflict = await findNoveltyConflict(
              recentPostsQuery,
              fallbackInsert,
            );

            if (!noveltyConflict) {
              attemptedTopics.push({
                topic: timedOutMarketTopic,
                status: "generated",
              });

              const { savedPost, telegram } = await persistAndPublishPost({
                postsTable,
                candidateInsert: fallbackInsert,
                post: fallbackPost,
                request,
                traceId: `${result.trace_id}_timeout_fallback`,
                topic: timedOutMarketTopic,
                attemptedTopics,
              });

              return NextResponse.json(
                buildCronJsonResponse({
                  status: "success",
                  traceId: `${result.trace_id}_timeout_fallback`,
                  topic: timedOutMarketTopic,
                  attempts: attemptedTopics,
                  evidence: result.evidence,
                  postId: savedPost.id,
                  createdAt: savedPost.created_at,
                  mode: "timeout_fallback",
                  telegram,
                }),
              );
            }

            attemptedTopics.push({
              topic: timedOutMarketTopic,
              status: "skipped",
              reason: noveltyConflict,
            });
          }
        }
      } catch (error) {
        console.error("[MiroCron] Timeout fallback failed", {
          topic: timedOutMarketTopic,
          error: normalizeErrorMessage(error),
        });
      }
    }

    console.log("[MiroCron] Generation skipped", {
      trace_id: result.trace_id,
      topic: result.topic,
      reason: result.reason,
      gatekeeper: result.gatekeeper,
    });

    return NextResponse.json(
      buildCronJsonResponse({
        status: "skipped",
        traceId: result.trace_id,
        reason: result.reason,
        topic: result.topic,
        attempts: attemptedTopics,
        evidence: result.evidence,
      }),
    );
  } catch (error) {
    const reason = normalizeErrorMessage(error);
    if (error instanceof CronUnauthorizedError) {
      return NextResponse.json(
        buildCronJsonResponse({
          status: "failed",
          traceId: activeTraceId,
          reason,
          topic: activeTopic,
          attempts: attemptedTopics,
          evidence: activeEvidence,
        }),
        { status: error.statusCode },
      );
    }

    console.error("[MiroCron] Unhandled route error", {
      trace_id: activeTraceId,
      topic: activeTopic,
      reason,
      attempts: attemptedTopics,
    });

    return NextResponse.json(
      buildCronJsonResponse({
        status: "failed",
        traceId: activeTraceId,
        reason: `unhandled_error: ${reason}`,
        topic: activeTopic,
        attempts: attemptedTopics,
        evidence: activeEvidence,
      }),
    );
  }
}
