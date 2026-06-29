import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

if (typeof process !== "undefined" && process.env) {
  for (const key of Object.keys(process.env)) {
    const val = process.env[key];
    if (typeof val === "string") {
      process.env[key] = val.trim();
    }
  }
}

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
  detectAssistantTone,
  focusPayloadForGeneration,
  validatePostQuality,
} from "../../../src/lib/agent/quality";
import {
  fetchCryptoFacts,
  fetchCurrencyFacts,
  type MiroFactsPayload,
} from "../../../src/lib/connectors";
import { coerceEnglishFactToRussianFallback } from "../../../src/lib/fact-localization";
import { buildMiroMemoryContext } from "../../../src/lib/miro-mind";
import {
  getMiroActiveSlot,
  getMiroDueScheduleSlots,
  getMiroScheduleDecision,
  getMiroScheduleSlotKey,
  getMiroUrgentWindowStatus,
  getNextMiroScheduleSlot,
  getMinskParts,
  MIRO_WEEKLY_SCHEDULE,
  type MiroScheduleSlot,
} from "../../../src/lib/miro-schedule";
import {
  getAdminSupabaseClient,
  getPublicSupabaseClient,
  mapPostToInsert,
} from "../../../src/lib/supabase";
import type {
  PostInsert,
  PostRow,
  QualityEventInsert,
  RunHistoryInsert,
  Json,
} from "../../../src/lib/supabase";
import {
  getPrePublishSourceBlockReason,
  getPublicPostBlockReason,
  isLikelyTruncatedTitlePrefix,
} from "../../../src/lib/public-post-quality";
import {
  getAutonomousTopicOrder,
  getBalancedFallbackTopics,
  getBalancedPrimaryTopic,
  getCategoryForTopic,
  isMarketRescueAllowed,
} from "../../../src/lib/agent/topic-fallback-policy";
import { buildRouteAttemptsQualityEvent } from "../../../src/lib/agent/cron-quality-flags";
import {
  getEditorialFallbackBlockedReasonForTopic,
  isEditorialFallbackAllowedForTopic,
} from "../../../src/lib/agent/editorial-fallback-policy";
import { findMarketStoryFamilyConflict } from "../../../src/lib/agent/market-story-family";
import { POSTS_CACHE_TAG } from "../../../src/lib/posts";
import { publishPostToTelegram } from "../../../src/lib/telegram";
import type { TelegramPublishResult } from "../../../src/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

interface RunHistoryInsertQuery {
  insert(values: RunHistoryInsert): Promise<{
    error: { message: string } | null;
  }>;
}

interface QualityEventInsertQuery {
  insert(values: QualityEventInsert): Promise<{
    error: { message: string } | null;
  }>;
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
  source: PostRow["source"];
}

type CooldownComparablePost = {
  category: PostRow["category"];
  title: string;
  observed: string[];
  inferred: string;
  source?: PostRow["source"];
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

function withPayloadSourceMetadata<T extends PersistedMiroPost>(
  post: T,
  payload: MiroFactsPayload,
): T {
  return {
    ...post,
    source_url: post.source_url ?? payload.source_url,
    source_published_at:
      post.source_published_at ?? payload.source_published_at,
    event_date: post.event_date ?? payload.event_date,
    corroborating_sources:
      post.corroborating_sources ?? payload.corroborating_sources,
  };
}

const ROUTE_TOTAL_TIMEOUT_MS = 295_000;
const ROUTE_RESPONSE_RESERVE_MS = 2_500;
const ROUTE_MIN_AGENT_BUDGET_MS = 8_000;
const ROUTE_PREFERRED_AGENT_BUDGET_MS = 245_000;
const SILENCE_RESCUE_THRESHOLD_HOURS = 12;
const RUN_HISTORY_INSERT_TIMEOUT_MS = 400;

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
  category_balance?: CronCategoryBalance;
  quality_events?: CronQualityEvent[];
  post_id?: string;
  created_at?: string;
  mode?: "editorial_fallback" | "timeout_fallback";
  telegram?: TelegramPublishResult;
  preview?: boolean;
  simulated_at?: string;
  scheduled_slot?: {
    weekday_label: string;
    local_time: string;
    topic: MiroTopic;
    window_label: string;
  };
  preview_post?: MiroPost;
};

type CronCategoryBalance = {
  sample_size: number;
  counts: Partial<Record<PostRow["category"], number>>;
  missing_categories: PostRow["category"][];
  markets_share: number;
  markets_rescue_allowed: boolean;
  top_sample_size: number;
  top_markets_share: number;
};

type CronQualityEvent = {
  code: string;
  severity: "info" | "warn" | "fail";
  message: string;
  details?: Json;
};

class CronUnauthorizedError extends Error {
  readonly statusCode = 401;
}

const CATEGORY_COOLDOWN_HOURS: Record<PostRow["category"], number> = {
  World: 3,
  Tech: 3,
  Markets: 3,
  Sports: 8,
};

const CATEGORY_DAILY_LIMIT: Record<PostRow["category"], number> = {
  World: 3,
  Tech: 3,
  Markets: 3,
  Sports: 1,
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

async function getPendingScheduledSlot(
  query: RecentPostsQuery,
  now: Date = new Date(),
): Promise<{
  pendingSlot?: MiroScheduleSlot;
  nextSlot: MiroScheduleSlot;
  activeSlot?: MiroScheduleSlot;
}> {
  const { data, error } = await query
    .select("id, created_at, title, inferred, observed, cross_signal, hypothesis, category, source")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(`Failed to load recent posts for schedule check: ${error.message}`);
  }

  const todayKey = getMinskDayKey(now);
  const filledSlotKeys = new Set<string>();

  // Filter and sort today's posts chronologically (oldest first)
  const todayPosts = (data ?? [])
    .filter((post) => getMinskDayKey(post.created_at) === todayKey)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const { weekday } = getMinskParts(now);
  // Get and sort schedule slots for today
  const slots = [...MIRO_WEEKLY_SCHEDULE]
    .filter((slot) => slot.weekday === weekday)
    .sort((a, b) => {
      const getSlotMinutes = (s: MiroScheduleSlot) => {
        const [hours, minutes] = s.local_time.split(":").map(Number);
        return hours * 60 + minutes;
      };
      return getSlotMinutes(a) - getSlotMinutes(b);
    });

  // Map each post of today to the corresponding schedule slot of today chronologically
  for (let i = 0; i < todayPosts.length; i++) {
    const slot = slots[i];
    if (slot) {
      filledSlotKeys.add(getMiroScheduleSlotKey(slot));
    }
  }

  const activeSlot = getMiroActiveSlot(now);
  const dueSlots = getMiroDueScheduleSlots(now);
  const pendingSlot = [...dueSlots]
    .reverse()
    .find((slot) => !filledSlotKeys.has(getMiroScheduleSlotKey(slot)));

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

function isLegacySourceDebtConflict(
  candidate: CooldownComparablePost,
  recent: CooldownComparablePost,
): boolean {
  return Boolean(candidate.source) && !recent.source;
}

async function findNoveltyConflict(
  query: RecentPostsQuery,
  candidate: PostInsert,
  now: Date = new Date(),
  supabase?: ReturnType<typeof getAdminSupabaseClient>,
): Promise<string | null> {
  const { data, error } = await query
    .select("id, created_at, title, inferred, observed, cross_signal, hypothesis, category, source")
    .order("created_at", { ascending: false })
    .limit(18);

  if (error) {
    throw new Error(`Failed to load recent posts for novelty check: ${error.message}`);
  }

  const nowMs = now.getTime();
  const todayKey = getMinskDayKey(new Date(nowMs));
  const recentPosts = (data ?? []).filter(
    (post) => new Date(post.created_at).getTime() <= nowMs,
  );
  const comparableRecentPosts = recentPosts.filter(
    (post) => !isLegacySourceDebtConflict(candidate, post),
  );
  const sameCategoryPosts = comparableRecentPosts.filter(
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

  const marketStoryFamilyConflict = findMarketStoryFamilyConflict(
    candidate,
    comparableRecentPosts,
    now,
  );
  if (marketStoryFamilyConflict) {
    return `market story family already covered recently: "${marketStoryFamilyConflict}"`;
  }

  for (const recent of comparableRecentPosts) {
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

    if (!supabase) {
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
  }

  if (supabase) {
    const { data: isNovel, error: rpcError } = await (supabase.rpc as any)("check_novelty", {
      new_title: candidate.title,
      target_category: candidate.category,
      similarity_threshold: 0.78,
      days_lookback: 7,
    });

    if (!rpcError && isNovel === false) {
      return `semantic overlap too high (RPC blocked)`;
    }
  }

  return null;
}

async function loadMemoryContext(
  query: RecentPostsQuery,
) {
  const { data, error } = await query
    .select("id, created_at, title, inferred, observed, cross_signal, hypothesis, category, source")
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

async function tryLoadMemoryContext(
  query: RecentPostsQuery,
  traceId: string,
): Promise<ReturnType<typeof buildMiroMemoryContext>> {
  try {
    return await loadMemoryContext(query);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[cron:${traceId}] memory context unavailable; continuing with empty memory: ${reason}`,
    );
    return buildMiroMemoryContext([]);
  }
}

async function getLatestPostAgeHours(
  query: RecentPostsQuery,
  now: Date = new Date(),
): Promise<number> {
  const { data, error } = await query
    .select("id, created_at, title, inferred, observed, cross_signal, hypothesis, category")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load latest post age: ${error.message}`);
  }

  const latestPost = data?.[0];
  if (!latestPost) {
    return Number.POSITIVE_INFINITY;
  }

  return getHoursSince(latestPost.created_at, now.getTime());
}

async function tryGetLatestPostAgeHours(
  query: RecentPostsQuery,
  traceId: string,
  now: Date = new Date(),
): Promise<number | undefined> {
  try {
    return await getLatestPostAgeHours(query, now);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[cron:${traceId}] latest post age unavailable; disabling silence rescue: ${reason}`,
    );
    return undefined;
  }
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
    value === "autonomous" ||
    value === "editorial_schedule" ||
    value === "random" ||
    value === "round_robin" ||
    value === "urgent_override"
  ) {
    return value;
  }

  const envValue = process?.env?.MIRO_TOPIC_STRATEGY;
  if (
    envValue === "autonomous" ||
    envValue === "editorial_schedule" ||
    envValue === "random" ||
    envValue === "round_robin" ||
    envValue === "urgent_override"
  ) {
    return envValue;
  }

  return "editorial_schedule";
}

function isPreviewRequest(request: Request): boolean {
  const value = new URL(request.url).searchParams.get("preview")?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function getSimulatedDate(request: Request): Date | undefined {
  const raw = new URL(request.url).searchParams.get("at")?.trim();
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid simulated date passed via at=: ${raw}`);
  }

  return parsed;
}

function serializeScheduleSlot(
  slot?: MiroScheduleSlot,
): CronJsonResponse["scheduled_slot"] | undefined {
  if (!slot) {
    return undefined;
  }

  return {
    weekday_label: slot.weekday_label,
    local_time: slot.local_time,
    topic: slot.topic,
    window_label: slot.window_label,
  };
}

async function loadCategoryBalance(
  query: RecentPostsQuery,
): Promise<CronCategoryBalance> {
  const { data, error } = await query
    .select("category")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to load category balance: ${error.message}`);
  }

  const counts: Partial<Record<PostRow["category"], number>> = {};
  for (const row of data ?? []) {
    const category = row.category as PostRow["category"];
    counts[category] = (counts[category] ?? 0) + 1;
  }

  const sampleSize = data?.length ?? 0;
  const missingCategories = (Object.keys(CATEGORY_COOLDOWN_HOURS) as PostRow["category"][])
    .filter((category) => (counts[category] ?? 0) === 0);
  const marketsShare =
    sampleSize === 0 ? 0 : Number(((counts.Markets ?? 0) / sampleSize).toFixed(2));
  const topFeedRows = (data ?? []).slice(0, 5);
  const topSampleSize = topFeedRows.length;
  const topMarketsShare =
    topSampleSize === 0
      ? 0
      : Number(
          (
            topFeedRows.filter((row) => row.category === "Markets").length /
            topSampleSize
          ).toFixed(2),
        );
  const rollingMarketRescueAllowed = sampleSize < 5 || marketsShare <= 0.5;
  const topFeedMarketRescueAllowed =
    topSampleSize < 5 || topMarketsShare <= 0.4;

  return {
    sample_size: sampleSize,
    counts,
    missing_categories: missingCategories,
    markets_share: marketsShare,
    markets_rescue_allowed:
      rollingMarketRescueAllowed && topFeedMarketRescueAllowed,
    top_sample_size: topSampleSize,
    top_markets_share: topMarketsShare,
  };
}

function getFallbackTopics(
  primaryTopic?: MiroTopic,
  categoryBalance?: CronCategoryBalance,
): MiroTopic[] {
  return getBalancedFallbackTopics(primaryTopic, categoryBalance);
}

function createRouteTraceId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `cron_${Date.now()}_${random}`;
}

async function tryLoadCategoryBalance(
  query: RecentPostsQuery,
  traceId: string,
): Promise<CronCategoryBalance | undefined> {
  try {
    return await loadCategoryBalance(query);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[cron:${traceId}] category balance unavailable; continuing without balance: ${reason}`,
    );
    return undefined;
  }
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

function buildQualityEvents(input: {
  status: CronStatus;
  reason?: string;
  attempts?: AttemptedTopic[];
  categoryBalance?: CronCategoryBalance;
  mode?: "editorial_fallback" | "timeout_fallback";
  telegram?: TelegramPublishResult;
}): CronQualityEvent[] {
  const qualityEvents: CronQualityEvent[] = [];

  if (input.categoryBalance && !isMarketRescueAllowed(input.categoryBalance)) {
    qualityEvents.push({
      code: "category_balance",
      severity: "warn",
      message: `Markets rescue blocked: rolling share ${input.categoryBalance.markets_share}, top-feed share ${input.categoryBalance.top_markets_share}.`,
    });
  }

  if (input.mode) {
    qualityEvents.push({
      code: "fallback_mode",
      severity: "warn",
      message: `Run completed through ${input.mode}.`,
    });
  }

  if (input.status === "skipped") {
    qualityEvents.push({
      code: "route_skipped",
      severity: "warn",
      message: input.reason ?? "Cron route skipped without a specific reason.",
    });
  }

  if (input.telegram?.status === "failed") {
    qualityEvents.push({
      code: "telegram_delivery_failed",
      severity: "warn",
      message: input.telegram.reason ?? "Telegram delivery failed.",
    });
  }

  const rejectedReasons = (input.attempts ?? [])
    .map((attempt) => attempt.reason)
    .filter((reason): reason is string => Boolean(reason));

  if (rejectedReasons.length > 0) {
    qualityEvents.push({
      code: "rejected_reasons",
      severity: "info",
      message: rejectedReasons.slice(0, 3).join(" | "),
    });
  }

  const routeAttemptsEvent = buildRouteAttemptsQualityEvent(input.attempts);
  if (routeAttemptsEvent) {
    qualityEvents.push(routeAttemptsEvent);
  }

  return qualityEvents;
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
  categoryBalance?: CronCategoryBalance;
  preview?: boolean;
  simulatedAt?: string;
  scheduledSlot?: MiroScheduleSlot;
  previewPost?: MiroPost;
}): CronJsonResponse {
  const qualityEvents = buildQualityEvents({
    status: input.status,
    reason: input.reason,
    attempts: input.attempts,
    categoryBalance: input.categoryBalance,
    mode: input.mode,
    telegram: input.telegram,
  });

  return {
    status: input.status,
    trace_id: input.traceId,
    reason: input.reason,
    topic: input.topic,
    attempts: input.attempts,
    category_balance: input.categoryBalance,
    quality_events: qualityEvents,
    post_id: input.postId,
    created_at: input.createdAt,
    mode: input.mode,
    telegram: input.telegram,
    preview: input.preview,
    simulated_at: input.simulatedAt,
    scheduled_slot: serializeScheduleSlot(input.scheduledSlot),
    preview_post: input.previewPost,
    ...deriveCronDiagnostics({
      reason: input.reason,
      attempts: input.attempts,
      evidence: input.evidence,
    }),
  };
}

async function persistRunHistoryBestEffort(args: {
  supabase: ReturnType<typeof getAdminSupabaseClient> | null;
  previewMode: boolean;
  routeStartedAt: number;
  body: CronJsonResponse;
}): Promise<void> {
  if (!args.supabase || args.previewMode) {
    return;
  }

  const runHistoryInsert: RunHistoryInsert = {
    trace_id: args.body.trace_id,
    topic: args.body.topic ?? null,
    status: args.body.status,
    reason: args.body.reason ?? null,
    post_id: args.body.post_id ?? null,
    duration_ms: Math.max(0, Date.now() - args.routeStartedAt),
  };

  try {
    const runHistoryTable = args.supabase.from(
      "run_history",
    ) as unknown as RunHistoryInsertQuery;
    const response = (await Promise.race([
      runHistoryTable.insert(runHistoryInsert),
      new Promise<{ error: { message: string } }>((resolve) => {
        setTimeout(() => {
          resolve({
            error: {
              message: "run_history insert timed out.",
            },
          });
        }, RUN_HISTORY_INSERT_TIMEOUT_MS);
      }),
    ])) as { error: { message: string } | null };

    if (response.error) {
      throw new Error(response.error.message);
    }
  } catch (error) {
    console.error("[MiroCron] run_history insert failed", {
      trace_id: args.body.trace_id,
      error: normalizeErrorMessage(error),
    });
  }
}

async function persistQualityEventsBestEffort(args: {
  supabase: ReturnType<typeof getAdminSupabaseClient> | null;
  previewMode: boolean;
  body: CronJsonResponse;
}): Promise<void> {
  if (!args.supabase || args.previewMode || !args.body.quality_events?.length) {
    return;
  }

  const hasFailure = args.body.quality_events.some(
    (event) => event.severity === "fail",
  );
  const hasWarning =
    args.body.status !== "success" ||
    args.body.quality_events.some((event) => event.severity === "warn");

  const qualityEventInsert: QualityEventInsert = {
    trace_id: args.body.trace_id,
    topic: args.body.topic ?? null,
    status: args.body.status,
    reason: args.body.reason ?? null,
    post_id: args.body.post_id ?? null,
    prompt_version: process.env.MIRO_PROMPT_VERSION?.trim() || null,
    fallback_mode: args.body.mode ?? null,
    risk_level: hasFailure ? "high" : hasWarning ? "medium" : "low",
    quality_flags: args.body.quality_events,
    category_balance: args.body.category_balance ?? null,
  };

  try {
    const qualityEventsTable = args.supabase.from(
      "quality_events",
    ) as unknown as QualityEventInsertQuery;
    const response = await qualityEventsTable.insert(qualityEventInsert);

    if (response.error) {
      throw new Error(response.error.message);
    }
  } catch (error) {
    console.error("[MiroCron] quality_events insert failed", {
      trace_id: args.body.trace_id,
      error: normalizeErrorMessage(error),
    });
  }
}

async function jsonWithRunHistory(args: {
  supabase: ReturnType<typeof getAdminSupabaseClient> | null;
  previewMode: boolean;
  routeStartedAt: number;
  body: CronJsonResponse;
  status?: number;
}): Promise<Response> {
  await persistRunHistoryBestEffort({
    supabase: args.supabase,
    previewMode: args.previewMode,
    routeStartedAt: args.routeStartedAt,
    body: args.body,
  });
  await persistQualityEventsBestEffort({
    supabase: args.supabase,
    previewMode: args.previewMode,
    body: args.body,
  });

  return NextResponse.json(
    args.body,
    typeof args.status === "number" ? { status: args.status } : undefined,
  );
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

function isEditorialFallbackAllowed(
  candidate: FallbackCandidate,
  categoryBalance?: CronCategoryBalance,
): boolean {
  return isEditorialFallbackAllowedForTopic({
    topic: candidate.topic,
    reason: candidate.reason,
    categoryBalance,
    source: candidate.payload.source,
    facts: candidate.payload.facts,
  });
}

function getEditorialFallbackBlockedReason(
  candidate: FallbackCandidate,
  categoryBalance?: CronCategoryBalance,
): string {
  return getEditorialFallbackBlockedReasonForTopic({
    topic: candidate.topic,
    categoryBalance,
  });
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

function isMarketRescueReason(reason?: string): boolean {
  return (
    typeof reason === "string" &&
    (isGeneratorTimeoutReason(reason) ||
      isGeneratorFormatReason(reason) ||
      reason.includes("connector exceeded") ||
      reason.includes("Time budget exhausted") ||
      reason.includes("route budget exhausted") ||
      reason.includes("flat market snapshot") ||
      reason.includes("flat snapshot without enough divergence") ||
      reason.includes("quality gate blocked English observed fact in Russian mode"))
  );
}

function getRecoverableMarketTopic(
  attempts: AttemptedTopic[],
  options?: {
    allowSilenceRescue?: boolean;
  },
): "markets_fx" | "markets_crypto" | undefined {
  for (const attempt of attempts) {
    if (
      (attempt.topic === "markets_fx" || attempt.topic === "markets_crypto") &&
      (isMarketRescueReason(attempt.reason) ||
        (options?.allowSilenceRescue === true &&
          typeof attempt.reason === "string" &&
          attempt.reason.length > 0))
    ) {
      return attempt.topic;
    }
  }

  return undefined;
}

function normalizeFact(fact: string): string {
  return fact
    .replace(/[A-Za-zА-Яа-яЁёІіЎў]+/gu, (token) => {
      if (!/[A-Za-z]/.test(token) || !/[А-Яа-яЁёІіЎў]/u.test(token)) {
        return token;
      }

      return token.replace(
        /[ABCEHKMOPTXYaceopxy]/g,
        (char) =>
          ({
            A: "А",
            B: "В",
            C: "С",
            E: "Е",
            H: "Н",
            K: "К",
            M: "М",
            O: "О",
            P: "Р",
            T: "Т",
            X: "Х",
            Y: "У",
            a: "а",
            c: "с",
            e: "е",
            o: "о",
            p: "р",
            x: "х",
            y: "у",
          })[char] ?? char,
      );
    })
    .replace(/\s+/g, " ")
    .trim();
}

function hasCyrillic(value: string): boolean {
  return /[А-Яа-яЁёІіЎў]/u.test(value);
}

function hasLatin(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function countLatinWordLikeTokens(value: string): number {
  return value.match(/[A-Za-z][A-Za-z'-]{2,}/g)?.length ?? 0;
}

function countCyrillicWordLikeTokens(value: string): number {
  return value.match(/[А-Яа-яЁёІіЎў][А-Яа-яЁёІіЎў'-]{2,}/gu)?.length ?? 0;
}

function stripRussianFactPrefix(value: string): string {
  return value
    .replace(/^(?:Источник фиксирует|Еще одна деталь источника):\s*/iu, "")
    .trim();
}

const ENGLISH_SENTENCE_MARKER_PATTERN =
  /\b(?:the|a|an|and|or|to|of|for|with|without|from|after|before|over|under|against|amid|as|by|said|says|reported|announced|described|launched|released|making|faster|sacrificing|accuracy|throughput|model|models)\b/iu;

function needsRussianLocalization(value: string): boolean {
  const normalized = stripRussianFactPrefix(value);

  if (!hasLatin(normalized)) {
    return false;
  }

  if (!hasCyrillic(normalized)) {
    return true;
  }

  const latinWords = countLatinWordLikeTokens(normalized);
  const cyrillicWords = countCyrillicWordLikeTokens(normalized);

  return (
    latinWords >= 4 &&
    latinWords >= cyrillicWords * 2 &&
    ENGLISH_SENTENCE_MARKER_PATTERN.test(normalized)
  );
}

function coerceFactsForRussianFallback(facts: string[], source?: string): string[] {
  return facts.flatMap((fact) => {
    const normalized = normalizeFact(fact);
    if (!needsRussianLocalization(normalized)) {
      return normalized ? [normalized] : [];
    }

    const deterministicFallback =
      coerceEnglishFactToRussianFallback(normalized, source);
    if (deterministicFallback) {
      return [deterministicFallback];
    }

    return [];
  });
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

  const gatekeeper = process?.env?.MIRO_GATEKEEPER_PROVIDER;
  if (gatekeeper === "groq" || gatekeeper === "nvidia" || gatekeeper === "openrouter") {
    return gatekeeper;
  }

  const research = process?.env?.MIRO_RESEARCH_PROVIDER;
  if (research === "groq" || research === "nvidia" || research === "openrouter") {
    return research;
  }

  const writer = process?.env?.MIRO_WRITER_PROVIDER;
  if (writer === "groq" || writer === "nvidia" || writer === "openrouter") {
    return writer;
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

  if (provider === "nvidia") {
    return (
      process?.env?.MIRO_WRITER_MODEL ??
      process?.env?.MIRO_NVIDIA_MODEL ??
      "openai/gpt-oss-20b"
    );
  }

  if (provider === "openrouter") {
    return (
      process?.env?.MIRO_OPENROUTER_MODEL ??
      "qwen/qwen3-next-80b-a3b-instruct:free"
    );
  }

  return (
    process?.env?.MIRO_RESEARCH_MODEL ??
    process?.env?.MIRO_GATEKEEPER_MODEL ??
    "llama-3.1-8b-instant"
  );
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
    return coerceFactsForRussianFallback(normalized, source);
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
      return coerceFactsForRussianFallback(normalized, source);
    }

    const parsed = JSON.parse(raw) as { facts?: unknown };
    if (!Array.isArray(parsed.facts)) {
      return coerceFactsForRussianFallback(normalized, source);
    }

    const localized = parsed.facts
      .map((item) => (typeof item === "string" ? normalizeFact(item) : ""))
      .filter(Boolean)
      .slice(0, normalized.length);

    return coerceFactsForRussianFallback(
      localized.length > 0 ? localized : normalized,
      source,
    );
  } catch (error) {
    console.warn("[MiroCron] Fact localization skipped", {
      source,
      error: error instanceof Error ? error.message : String(error),
    });
    return coerceFactsForRussianFallback(normalized, source);
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

  const words = clause.split(/\s+/).filter(Boolean);
  let compact = "";
  for (const word of words) {
    const candidate = compact ? `${compact} ${word}` : word;
    if (candidate.length > 64 && compact) {
      break;
    }

    compact = candidate;
    if (compact.length >= 64) {
      break;
    }
  }

  if (!compact) {
    return "день сбился с ровной линии";
  }

  if (isLikelyTruncatedTitlePrefix(compact, [clause])) {
    const nextWord = words[compact.split(/\s+/).filter(Boolean).length];
    const expanded = nextWord ? `${compact} ${nextWord}`.trim() : compact;
    if (expanded.length <= 72) {
      compact = expanded;
    } else {
      compact = compact.replace(/\s+\S+$/u, "").trim() || compact;
    }
  }

  const clipped =
    compact.length <= 72
      ? compact
      : compact
          .slice(0, 72)
          .replace(/\s+\S*$/u, "")
          .trimEnd();

  return (clipped || compact)
    .replace(/[,:;.!?–—-]+$/u, "")
    .trim();
}

function isCoercedFallbackFact(value: string): boolean {
  return /^Источник фиксирует:|^Еще одна деталь источника:/u.test(value);
}

function createTopicFallbackTitle(
  topic: MiroTopic,
  lead: string,
  source: string,
): string {
  if (
    topic === "world" &&
    /атлас/u.test(lead) &&
    /редкоземельн/u.test(lead)
  ) {
    return "Атлас подсветил редкоземельные месторождения";
  }

  const tail = createFallbackTitleTail(lead);
  if (tail && hasCyrillic(tail) && !isCoercedFallbackFact(lead)) {
    return tail;
  }

  const sourceLabel = normalizeFact(source).split(/[|/]/u)[0]?.trim();
  const sourceSuffix = sourceLabel ? `: ${sourceLabel.slice(0, 36).trim()}` : "";

  if (topic === "tech_world") {
    return `Технологический сигнал${sourceSuffix}`;
  }

  if (topic === "sports") {
    return `Спортивный сигнал${sourceSuffix}`;
  }

  if (topic === "world") {
    return `Неполитический сигнал${sourceSuffix}`;
  }

  return tail || "День сбился с ровной линии";
}

function sentence(value: string): string {
  const trimmed = normalizeFact(value).trim();
  if (!trimmed) {
    return "";
  }

  return /[.!?…]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}

function clampTelegramHook(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const clipped = value.slice(0, maxLength).trimEnd();
  const wordSafe = clipped
    .replace(/\s+\S*$/u, "")
    .replace(/[,:;.!?–—-]+$/u, "")
    .trim();

  return `${(wordSafe || clipped).trimEnd()}…`;
}

function createTelegramFactHook(fact: string): string {
  const hook = sentence(fact)
    .replace(/^Источник фиксирует:\s*/u, "")
    .replace(/^Еще одна деталь источника:\s*/u, "")
    .replace(/\s+—\s+.+$/u, ".")
    .replace(/\s+/g, " ")
    .trim();

  if (!hook) {
    return "";
  }

  if (needsRussianLocalization(hook)) {
    return "";
  }

  return clampTelegramHook(hook, 150);
}

function buildFallbackTelegramText(input: {
  topic: MiroTopic;
  hook: string;
  source: string;
}): string {
  const hook = sentence(input.hook);
  const source = input.source.trim();

  if (input.topic === "tech_world") {
    return hook
      ? `${hook} Смысл не в громкости анонса, а в проверке, которую можно повторить.`
      : `${source || "Источник"} дал технический материал с узкой проверяемой опорой. Дальше важно, повторят ли ее за пределами анонса.`;
  }

  if (input.topic === "sports") {
    return hook
      ? `${hook} Дальше важен ближайший матч: подтвердит ли он эту форму или быстро отменит ее.`
      : `${source || "Источник"} дал спортивный факт с ближайшей проверкой. Дальше важен не шум вокруг результата, а следующая игра.`;
  }

  if (input.topic === "world") {
    return hook
      ? `${hook} Здесь важна конкретная неполитическая перемена, а не масштаб заголовка.`
      : `${source || "Источник"} дал неполитический факт с проверяемым изменением среды. Если он повторится, это уже будет не одиночная заметка.`;
  }

  return hook || "Материал держится на конкретном факте и следующей проверке.";
}

function buildFallbackLongformArticle(input: {
  topic: MiroTopic;
  lead: string;
  secondary: string;
  source: string;
}): string {
  const lead = sentence(input.lead);
  const secondary = sentence(input.secondary);
  const hasSecondFact = secondary && secondary !== lead;
  const source = input.source.trim();
  const sourceLine = source
    ? `Источник: ${source}. Вывод привязан только к деталям из этой публикации.`
    : "Вывод привязан только к деталям из исходной записи.";

  const opening = hasSecondFact
    ? `${lead} ${secondary}`
    : lead;

  const paragraphs =
    input.topic === "tech_world"
      ? [
          opening,
          "Технологический материал становится заметным там, где меняется способ проверки: измерить, сравнить, воспроизвести или встроить результат становится проще, чем раньше.",
          "Главный вопрос не в громкости анонса, а в том, появляется ли у других команд и исследователей новая проверяемая процедура. Если событие не дает такого шага, оно остается обычным релизом.",
          sourceLine,
          "Дальше эту линию проверяет повтор. Если похожая деталь появится в новых материалах или продуктах, это будет уже не отдельная новость, а рабочий ориентир для всей темы.",
        ]
      : input.topic === "sports"
        ? [
            opening,
            "Спортивный факт важен не календарной строкой, а тем, как результат меняет форму, роль, серию, давление вокруг следующей игры или ожидание от конкретного игрока.",
            "Когда результат держится не на одном эпизоде, а на распределении нагрузки между несколькими исполнителями, он становится проверкой глубины состава. Такая победа показывает не только счет, но и то, есть ли у команды рабочая схема на ближайшую серию.",
            "Значение появляется не в табло как таковом, а в ближайшем продолжении. Один результат быстро забывается, но если он меняет расклад перед следующей встречей, у него появляется настоящая редакционная причина.",
            sourceLine,
            "Эта история читается как проверка формы, а не как короткая сводка. Следующий матч или старт покажет, был ли результат единичным, или команда уже меняет устойчивость.",
          ]
        : input.topic === "world"
          ? [
              opening,
              "Здесь важна неполитическая перемена среды: науки, инфраструктуры, поведения, культуры или повседневной реальности. Такая история держится не на масштабе заголовка, а на том, что источник показывает конкретный сдвиг, который можно проверить по месту, дате и действию.",
              "Значение появляется в изменении, которое можно объяснить без паники, лозунгов и расширения за пределы источника. Если факт остается узким, вывод тоже должен оставаться узким: что именно стало иначе, почему это заметно сейчас и где проходит граница уверенности.",
              "Полезная связка простая: что изменилось, где это зафиксировано и какой повтор подтвердит, что перед нами не одиночный шум. Для мировой ленты этого достаточно только тогда, когда факт не растворяется в бытовой случайности и не требует политической рамки, чтобы звучать важным.",
              sourceLine,
              "Дальше важна повторяемость похожих признаков. Если эта линия вернется в новых фактах, ее можно будет читать как устойчивое изменение среды; если нет, запись останется аккуратной отметкой о разовом событии без лишнего усиления.",
          ]
        : input.topic === "markets_fx"
          ? [
              opening,
                "В валютной заметке важен не сам доллар и не тревога вокруг курса. Важен момент, когда близкие пары начинают идти на разной скорости: одна уже реагирует, другая еще держит паузу. Именно такая асимметрия превращает таблицу в рабочий факт.",
                "Такая разница не говорит сама по себе, что будет дальше. Но она показывает, где рынок перестает быть ровной строкой и превращается в набор локальных напряжений, которые нельзя читать одним общим словом. Если одна пара уже двинулась, а другая осталась почти на месте, следующий вопрос становится конкретным: схлопнется ли разрыв.",
                sourceLine,
                "Следующий фиксинг станет простой проверкой этой линии. Если зазор сохранится, смотреть придется не на общий фон валют, а на конкретную пару, где давление проявилось раньше остальных. Если зазор исчезнет, это останется коротким дневным перекосом, а не началом устойчивого движения.",
              ]
            : [
                opening,
                "В крипте короткая цена почти никогда не объясняет всю историю. Важен момент, когда рынок перестает двигать крупные имена одинаково: один актив держится, другой проседает. Такая разница полезнее общей фразы про рост или падение, потому что она показывает внутренний отбор.",
                "Это не повод додумывать скрытых игроков или большие потоки, которых нет в фактах. Но это повод зафиксировать асимметрию: рынок уже не наказывает всех одинаково, а значит, внутри движения появилась иерархия. Для дневной записи этого достаточно, если рядом есть точная дата, цена и изменение.",
                sourceLine,
                "Следующая сессия покажет, была ли это случайная разница или начало более устойчивого отбора. Если разрыв не схлопнется, читать придется не рынок целиком, а тех, кто первым выходит из общего строя. Если схлопнется, факт останется коротким замером, но не превратится в лишний прогноз.",
              ];

  return [
    ...paragraphs,
    "Следующая проверка простая: появятся ли похожие признаки в новых источниках, датах или повторных замерах.",
    "Граница вывода остается узкой: подтвержденный факт отдельно, следующая гипотеза отдельно.",
    "Если масштаба не будет, сюжет останется короткой отметкой; если повтор появится, его можно будет читать как устойчивую линию.",
  ].join("\n\n");
}

type FxFallbackSignal = {
  quote: string;
  direction: "rose" | "fell" | "flat";
  delta?: string;
  rate: string;
  date: string;
};

type CryptoFallbackSignal = {
  asset: string;
  prices: string;
  change: string;
};

function parseFxFallbackSignals(facts: string[]): FxFallbackSignal[] {
  const results: FxFallbackSignal[] = [];

  for (const fact of facts) {
    const unchangedPair = fact.match(
      /^USD\/([A-Z]{3}) was nearly unchanged versus the previous fixing, ending at ([0-9.]+) on (\d{4}-\d{2}-\d{2})\.$/u,
    );
    if (unchangedPair) {
      results.push({
        quote: unchangedPair[1],
        direction: "flat",
        rate: unchangedPair[2],
        date: unchangedPair[3],
      });
      continue;
    }

    const movedPair = fact.match(
      /^USD\/([A-Z]{3}) (rose|fell) by ([^ ]+) versus the previous fixing, ending at ([0-9.]+) on (\d{4}-\d{2}-\d{2})\.$/u,
    );
    if (movedPair) {
      results.push({
        quote: movedPair[1],
        direction: movedPair[2] === "rose" ? "rose" : "fell",
        delta: movedPair[3],
        rate: movedPair[4],
        date: movedPair[5],
      });
    }
  }

  return results;
}

function parseCryptoFallbackSignals(facts: string[]): CryptoFallbackSignal[] {
  const results: CryptoFallbackSignal[] = [];

  for (const fact of facts) {
    const tradedNear = fact.match(
      /^([A-Za-z0-9 .+-]+) traded near (.+) with a 24h move of ([^ ]+)\.$/u,
    );
    if (!tradedNear) {
      continue;
    }

    results.push({
      asset: tradedNear[1].trim(),
      prices: tradedNear[2].trim(),
      change: tradedNear[3].trim(),
    });
  }

  return results;
}

function mapFxDirectionToTitleVerb(direction: FxFallbackSignal["direction"]): string {
  if (direction === "rose") {
    return "подрос";
  }

  if (direction === "fell") {
    return "сдал";
  }

  return "застыл";
}

function mapFxDirectionToSentenceVerb(direction: FxFallbackSignal["direction"]): string {
  if (direction === "rose") {
    return "подрос";
  }

  if (direction === "fell") {
    return "снизился";
  }

  return "почти не сдвинулся";
}

function mapCryptoChangeToBias(change: string): "up" | "down" | "flat" {
  const parsed = Number(change.replace("%", "").replace(",", ".").replace("+", ""));
  if (!Number.isFinite(parsed)) {
    return "flat";
  }

  if (parsed >= 0.75) {
    return "up";
  }

  if (parsed <= -0.75) {
    return "down";
  }

  return "flat";
}

function buildFxFallbackTitle(signals: FxFallbackSignal[]): string {
  const rub = signals.find((signal) => signal.quote === "RUB");
  const byn = signals.find((signal) => signal.quote === "BYN");

  if (rub && byn) {
    return `USD/RUB ${mapFxDirectionToTitleVerb(rub.direction)}, USD/BYN ${mapFxDirectionToTitleVerb(byn.direction)}`;
  }

  const first = signals[0];
  if (first) {
    return `USD/${first.quote} ${mapFxDirectionToTitleVerb(first.direction)} после фиксинга`;
  }

  return "Соседние валютные пары потеряли общий ритм";
}

function buildCryptoFallbackTitle(
  signals: CryptoFallbackSignal[],
  rawFacts: string[],
): string {
  const leader = rawFacts
    .map((fact) =>
      fact.match(
        /^([A-Za-z0-9 .+-]+) outperformed the other major coin by about ([0-9.]+) percentage points over the last 24 hours\.$/u,
      ),
    )
    .find(Boolean);

  if (leader?.[1]) {
    return `${leader[1].trim()} держится тверже рынка`;
  }

  const primary = signals[0];
  if (!primary) {
    return "Крипторынок распался на разные скорости";
  }

  const bias = mapCryptoChangeToBias(primary.change);
  if (bias === "up") {
    return `${primary.asset} идет выше остальных`;
  }

  if (bias === "down") {
    return `${primary.asset} проседает заметнее рынка`;
  }

  return `${primary.asset} сбивает общий строй`;
}

function localizeMarketFallbackFact(fact: string): string {
  const frankfurterDirect = fact.match(/^Frankfurter (\d{4}-\d{2}-\d{2}): (.+)\.$/u);
  if (frankfurterDirect) {
    return `Курс Frankfurter на ${frankfurterDirect[1]}: ${frankfurterDirect[2]}.`;
  }

  const reservePairs = fact.match(
    /^Major reserve pairs on (\d{4}-\d{2}-\d{2}): (.+)\.$/u,
  );
  if (reservePairs) {
    return `Основные резервные пары на ${reservePairs[1]}: ${reservePairs[2]}.`;
  }

  const unchangedPair = fact.match(
    /^USD\/([A-Z]{3}) was nearly unchanged versus the previous fixing, ending at ([0-9.]+) on (\d{4}-\d{2}-\d{2})\.$/u,
  );
  if (unchangedPair) {
    return `USD/${unchangedPair[1]} почти не изменился к предыдущему фиксингу и закрылся на ${unchangedPair[2]} ${unchangedPair[3]}.`;
  }

  const movedPair = fact.match(
    /^USD\/([A-Z]{3}) (rose|fell) by ([^ ]+) versus the previous fixing, ending at ([0-9.]+) on (\d{4}-\d{2}-\d{2})\.$/u,
  );
  if (movedPair) {
    const verb = movedPair[2] === "rose" ? "вырос" : "снизился";
    return `USD/${movedPair[1]} ${verb} на ${movedPair[3]} к предыдущему фиксингу и закрылся на ${movedPair[4]} ${movedPair[5]}.`;
  }

  const tradedNear = fact.match(
    /^([A-Za-z0-9 .+-]+) traded near (.+) with a 24h move of ([^ ]+)\.$/u,
  );
  if (tradedNear) {
    return `${tradedNear[1]} торговался около ${tradedNear[2]} при изменении за 24 часа ${tradedNear[3]}.`;
  }

  const outperformed = fact.match(
    /^([A-Za-z0-9 .+-]+) outperformed the other major coin by about ([0-9.]+) percentage points over the last 24 hours\.$/u,
  );
  if (outperformed) {
    return `${outperformed[1]} опередил другую крупную монету примерно на ${outperformed[2]} п.п. за последние 24 часа.`;
  }

  return fact;
}

function getMarketObservedFactPriority(fact: string): number {
  if (/^USD\/[A-Z]{3}\s/u.test(fact)) {
    return 0;
  }

  if (/торговал(?:ся|ась)\s+около/u.test(fact)) {
    return 1;
  }

  if (/опередил|обогнал/u.test(fact)) {
    return 1;
  }

  if (/^Курс Frankfurter/u.test(fact)) {
    return 3;
  }

  if (/^Основные резервные пары/u.test(fact)) {
    return 4;
  }

  return 2;
}

async function buildMarketTimeoutFallbackPost(
  topic: "markets_fx" | "markets_crypto",
  payload: MiroFactsPayload,
): Promise<PersistedMiroPost | null> {
  const fxSignals =
    topic === "markets_fx" ? parseFxFallbackSignals(payload.facts) : [];
  const cryptoSignals =
    topic === "markets_crypto" ? parseCryptoFallbackSignals(payload.facts) : [];
  const deterministicFacts = payload.facts
    .map(localizeMarketFallbackFact)
    .map(normalizeFact)
    .filter(Boolean);

  const observed = deterministicFacts.some(needsRussianLocalization)
    ? await localizeFactsToRussian(deterministicFacts, payload.source)
    : deterministicFacts;
  if (observed.length === 0) {
    return null;
  }

  const prioritizedObserved =
    topic === "markets_fx"
      ? [...observed].sort(
          (left, right) =>
            getMarketObservedFactPriority(left) - getMarketObservedFactPriority(right),
        )
      : observed;

  const lead = prioritizedObserved[0];
  const secondary = prioritizedObserved[1] ?? prioritizedObserved[0];
  const title =
    topic === "markets_fx"
      ? buildFxFallbackTitle(fxSignals)
      : buildCryptoFallbackTitle(cryptoSignals, payload.facts);
  const inferred = buildFallbackLongformArticle({
    topic,
    lead,
    secondary,
    source: payload.source,
  });

  return withPayloadSourceMetadata({
    title,
    source: payload.source,
    observed: prioritizedObserved,
    inferred,
    opinion:
      topic === "markets_fx"
        ? `${lead} Поэтому важен не один курс, а момент, когда соседние пары расходятся по темпу.`
        : `${lead} Поэтому это не общее движение рынка: уже видно, какие активы держатся сильнее, а какие быстрее отходят от общей линии.`,
    cross_signal:
      topic === "markets_fx"
        ? "Для валют важна не только цифра курса, но и момент, когда близкие пары перестают идти синхронно."
        : "Для крипты важен не общий цвет экрана, а то, какая монета первой выходит из общей линии.",
    hypothesis:
      topic === "markets_fx"
        ? "Если этот разный темп сохранится еще на цикл, локальное давление проявится раньше, чем общий валютный разворот."
        : "Если выборочный импульс не погаснет, следующая сессия станет тестом уже не для рынка целиком, а для отдельных лидеров.",
    telegram_text:
      topic === "markets_fx"
        ? (() => {
            const rub = fxSignals.find((signal) => signal.quote === "RUB");
            const byn = fxSignals.find((signal) => signal.quote === "BYN");
            if (rub && byn) {
              return `USD/RUB уже ${mapFxDirectionToSentenceVerb(rub.direction)}, а USD/BYN еще держит паузу. Здесь интересна не одна цифра курса, а разная скорость соседних пар.`;
            }

            return "Соседние валютные пары уже идут на разной скорости. Такой день интересен не таблицей курсов, а местом, где темп расходится.";
          })()
        : (() => {
            const primary = cryptoSignals[0];
            const secondarySignal = cryptoSignals[1];
            if (primary && secondarySignal) {
              return `${primary.asset} и ${secondarySignal.asset} уже движутся по-разному. Здесь интересна не цена сама по себе, а разный темп крупных активов.`;
            }

            return "Крипта снова идет не строем, а по одиночке. В такие дни полезнее смотреть на различие между крупными активами, а не на общий цвет рынка.";
          })(),
    reasoning:
      "Даже без длинной генерации здесь остался конкретный рыночный перекос, а не сухая таблица с курсами.",
    confidence: "medium",
    category: "Markets",
  }, payload);
}

async function buildTopicFallbackPost(
  topic: MiroTopic,
  payload: MiroFactsPayload,
): Promise<PersistedMiroPost | null> {
  const focusedPayload = focusPayloadForGeneration(payload, topic, "retry");
  const observed = await localizeFactsToRussian(
    focusedPayload.facts,
    focusedPayload.source,
  );
  if (observed.length === 0) {
    return null;
  }

  const lead = observed[0];
  const secondary = topic === "sports" ? lead : observed[1] ?? lead;
  const telegramHook = createTelegramFactHook(lead);

  if (topic === "tech_world") {
    return withPayloadSourceMetadata({
      title: createTopicFallbackTitle(topic, lead, payload.source),
      source: payload.source,
      observed,
      inferred: buildFallbackLongformArticle({
        topic,
        lead,
        secondary,
        source: payload.source,
      }),
      opinion:
        `${lead} Поэтому технологический материал становится заметным там, где меняется способ проверки, а не только тон анонса.`,
      cross_signal:
        "В технологии важна не громкость анонса, а проверяемая деталь и ее применение.",
      hypothesis:
        "Если эта линия подтвердится в следующих материалах, ее будут читать уже не как отдельную новость, а как новый рабочий ориентир.",
      telegram_text: buildFallbackTelegramText({
        topic,
        hook: telegramHook,
        source: payload.source,
      }),
      reasoning:
        "В фактах есть конкретная проверяемая деталь, а не пересказ релиза.",
      confidence: "medium",
      category: "Tech",
    }, focusedPayload);
  }

  if (topic === "sports") {
    return withPayloadSourceMetadata({
      title: createTopicFallbackTitle(topic, lead, payload.source),
      source: payload.source,
      observed,
      inferred: buildFallbackLongformArticle({
        topic,
        lead,
        secondary,
        source: payload.source,
      }),
      opinion:
        `${lead} Поэтому спортивный факт важен там, где результат меняет форму, роль или давление перед следующей проверкой.`,
      cross_signal:
        "В спорте важнее не новость как факт, а точка, где результат начинает менять следующий матч.",
      hypothesis:
        "Если эта линия подтвердится в следующей игре, разговор быстро уйдет от единичного результата к новой роли или новой серии.",
      telegram_text: buildFallbackTelegramText({
        topic,
        hook: telegramHook,
        source: payload.source,
      }),
      reasoning:
        "В фактах есть результат, роль или давление, а не пустая календарная строка.",
      confidence: "medium",
      category: "Sports",
    }, focusedPayload);
  }

  if (topic === "world") {
    return withPayloadSourceMetadata({
      title: createTopicFallbackTitle(topic, lead, payload.source),
      source: payload.source,
      observed,
      inferred: buildFallbackLongformArticle({
        topic,
        lead,
        secondary,
        source: payload.source,
      }),
      opinion:
        `${lead} Поэтому неполитическое изменение среды важно там, где видно конкретную перемену, а не только общий фон.`,
      cross_signal:
        "Для мировой ленты важнее не масштаб заголовка, а неполитическая перемена, которую можно объяснить через факт.",
      hypothesis:
        "Если похожие факты начнут повторяться, это станет не случайной заметкой, а более широким изменением среды.",
      telegram_text: buildFallbackTelegramText({
        topic,
        hook: telegramHook,
        source: payload.source,
      }),
      reasoning:
        "В фактах есть неполитическая перемена, которая держится на конкретном событии.",
      confidence: "medium",
      category: "World",
    }, focusedPayload);
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
): Promise<{ post: PersistedMiroPost; payload: MiroFactsPayload } | null> {
  const payload =
    topic === "markets_fx"
      ? await fetchCurrencyFacts({ requestTimeoutMs: 3_500 })
      : await fetchCryptoFacts({ requestTimeoutMs: 3_500 });

  const post = await buildMarketTimeoutFallbackPost(topic, payload);
  return post ? { post, payload } : null;
}

async function verifySavedPostReaderVisible(postId: string): Promise<void> {
  const publicSupabase = getPublicSupabaseClient();
  const { data, error } = await publicSupabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .not("source", "is", null)
    .neq("confidence", "low")
    .maybeSingle();

  if (error) {
    throw new Error(`post persisted but not publicly visible: ${error.message}`);
  }

  if (!data) {
    throw new Error("post persisted but not publicly visible: public read returned no row");
  }

  const publicBlockReason = getPublicPostBlockReason(data);
  if (publicBlockReason) {
    throw new Error(`post persisted but not publicly visible: ${publicBlockReason}`);
  }
}

async function deletePersistedPostAfterVisibilityFailure(
  postId: string,
  reason: unknown,
): Promise<never> {
  const adminSupabase = getAdminSupabaseClient();
  const { error } = await adminSupabase.from("posts").delete().eq("id", postId);
  const message =
    reason instanceof Error
      ? reason.message
      : "post persisted but not publicly visible";

  if (error) {
    throw new Error(`${message}; rollback delete failed: ${error.message}`);
  }

  throw new Error(`${message}; rolled back saved post`);
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

  const insertCandidate = async (candidate: PostInsert) =>
    args.postsTable
      .insert(candidate)
      .select("id, created_at")
      .single();

  let { data: savedPost, error: insertError } = await insertCandidate(
    args.candidateInsert,
  );

  if (
    insertError?.message?.includes("source_url") ||
    insertError?.message?.includes("source_published_at") ||
    insertError?.message?.includes("event_date") ||
    insertError?.message?.includes("corroborating_sources")
  ) {
    const {
      source_url,
      source_published_at,
      event_date,
      corroborating_sources,
      ...legacyInsert
    } = args.candidateInsert;
    console.warn("[MiroCron] Source metadata columns missing; retrying legacy insert", {
      trace_id: args.traceId,
      topic: args.topic,
      missing_column_error: insertError.message,
      source_url,
      source_published_at,
      event_date,
      corroborating_sources_count: Array.isArray(corroborating_sources)
        ? corroborating_sources.length
        : 0,
    });
    ({ data: savedPost, error: insertError } = await insertCandidate(legacyInsert));
  }

  if (insertError || !savedPost) {
    throw new Error(
      `Supabase insert failed: ${insertError?.message ?? "No row returned."}`,
    );
  }

  try {
    await verifySavedPostReaderVisible(savedPost.id);
  } catch (error) {
    await deletePersistedPostAfterVisibilityFailure(savedPost.id, error);
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

async function completeSuccessfulRun(args: {
  supabase: ReturnType<typeof getAdminSupabaseClient> | null;
  routeStartedAt: number;
  previewMode: boolean;
  postsTable: PostsInsertQuery;
  candidateInsert: PostInsert;
  post: MiroPost;
  request: Request;
  traceId: string;
  topic: MiroTopic;
  attemptedTopics: AttemptedTopic[];
  evidence: MiroEvidenceRecord[];
  categoryBalance?: CronCategoryBalance;
  mode?: "editorial_fallback" | "timeout_fallback";
  simulatedAt?: string;
  scheduledSlot?: MiroScheduleSlot;
}): Promise<Response> {
  const publicBlockReason = getPublicPostBlockReason({
    ...args.candidateInsert,
    telegram_text: args.post.telegram_text,
  });
  const sourceBlockReason = getPrePublishSourceBlockReason(
    {
      ...args.candidateInsert,
      telegram_text: args.post.telegram_text,
    },
    args.simulatedAt ? new Date(args.simulatedAt) : new Date(),
  );
  const blockReason = publicBlockReason ?? sourceBlockReason;

  if (blockReason) {
    args.attemptedTopics.push({
      topic: args.topic,
      status: "skipped",
      reason: blockReason,
    });

    return jsonWithRunHistory({
      supabase: args.supabase,
      previewMode: args.previewMode,
      routeStartedAt: args.routeStartedAt,
      body: buildCronJsonResponse({
        status: "skipped",
        traceId: args.traceId,
        reason: blockReason,
        topic: args.topic,
        attempts: args.attemptedTopics,
        evidence: args.evidence,
        categoryBalance: args.categoryBalance,
        preview: args.previewMode,
        simulatedAt: args.simulatedAt,
      }),
    });
  }

  if (args.previewMode) {
    return jsonWithRunHistory({
      supabase: args.supabase,
      previewMode: args.previewMode,
      routeStartedAt: args.routeStartedAt,
      body: buildCronJsonResponse({
        status: "success",
        traceId: args.traceId,
        topic: args.topic,
        attempts: args.attemptedTopics,
        evidence: args.evidence,
        categoryBalance: args.categoryBalance,
        mode: args.mode,
        preview: true,
        simulatedAt: args.simulatedAt,
        scheduledSlot: args.scheduledSlot,
        previewPost: args.post,
      }),
    });
  }

  const { savedPost, telegram } = await persistAndPublishPost({
    postsTable: args.postsTable,
    candidateInsert: args.candidateInsert,
    post: args.post,
    request: args.request,
    traceId: args.traceId,
    topic: args.topic,
    attemptedTopics: args.attemptedTopics,
  });

  return jsonWithRunHistory({
    supabase: args.supabase,
    previewMode: args.previewMode,
    routeStartedAt: args.routeStartedAt,
    body: buildCronJsonResponse({
      status: "success",
      traceId: args.traceId,
      topic: args.topic,
      attempts: args.attemptedTopics,
      evidence: args.evidence,
      categoryBalance: args.categoryBalance,
      postId: savedPost.id,
      createdAt: savedPost.created_at,
      mode: args.mode,
      telegram,
    }),
  });
}

async function tryEditorialFallbacks(args: {
  supabase: ReturnType<typeof getAdminSupabaseClient>;
  routeStartedAt: number;
  recentPostsQuery: RecentPostsQuery;
  fallbackCandidates: FallbackCandidate[];
  request: Request;
  result: MiroAgentSkippedResult;
  attemptedTopics: AttemptedTopic[];
  previewMode: boolean;
  effectiveNow: Date;
  categoryBalance?: CronCategoryBalance;
  simulatedAt?: string;
  scheduledSlot?: MiroScheduleSlot;
}): Promise<Response | null> {
  for (const candidate of args.fallbackCandidates) {
    try {
      if (!isEditorialFallbackAllowed(candidate, args.categoryBalance)) {
        args.attemptedTopics.push({
          topic: candidate.topic,
          status: "skipped",
          reason: getEditorialFallbackBlockedReason(
            candidate,
            args.categoryBalance,
          ),
        });
        continue;
      }

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

      const qualityConflict =
        detectAssistantTone(fallbackPost) ??
        validatePostQuality(
          fallbackPost,
          candidate.payload,
          candidate.topic,
        );

      if (qualityConflict) {
        args.attemptedTopics.push({
          topic: candidate.topic,
          status: "skipped",
          reason: qualityConflict,
        });
        continue;
      }

      const fallbackInsert = mapPostToInsert(fallbackPost);
      const noveltyConflict = await findNoveltyConflict(
        args.recentPostsQuery,
        fallbackInsert,
        args.effectiveNow,
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
      return completeSuccessfulRun({
        supabase: args.supabase,
        routeStartedAt: args.routeStartedAt,
        previewMode: args.previewMode,
        postsTable,
        candidateInsert: fallbackInsert,
        post: fallbackPost,
        request: args.request,
        traceId,
        topic: candidate.topic,
        attemptedTopics: args.attemptedTopics,
        evidence: args.result.evidence,
        categoryBalance: args.categoryBalance,
        mode: "editorial_fallback",
        simulatedAt: args.simulatedAt,
        scheduledSlot: args.scheduledSlot,
      });
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
        gatekeeper_provider:
          process?.env?.MIRO_GATEKEEPER_PROVIDER === "nvidia"
            ? "nvidia"
            : process?.env?.MIRO_GATEKEEPER_PROVIDER === "openrouter"
              ? "openrouter"
              : process?.env?.MIRO_LLM_PROVIDER === "nvidia"
                ? "nvidia"
                : process?.env?.MIRO_LLM_PROVIDER === "openrouter"
                  ? "openrouter"
                  : "groq",
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
  let categoryBalance: CronCategoryBalance | undefined;
  let supabase: ReturnType<typeof getAdminSupabaseClient> | null = null;
  let previewMode = false;
  let effectiveNow = new Date();

  try {
    ensureCronAuthorized(request);

    const forcedTopic = getForcedTopic(request);
    const selectionStrategy = getSelectionStrategy(request);
    previewMode = isPreviewRequest(request);
    const simulatedDate = getSimulatedDate(request);
    effectiveNow = simulatedDate ?? new Date();
    supabase = getAdminSupabaseClient();
    const recentPostsQuery = supabase.from("posts") as unknown as RecentPostsQuery;
    categoryBalance = await tryLoadCategoryBalance(
      recentPostsQuery,
      routeTraceId,
    );
    const memoryContext = await tryLoadMemoryContext(
      recentPostsQuery,
      routeTraceId,
    );
    const agent = new MiroAgent();
    const fallbackCandidates: FallbackCandidate[] = [];
    let scheduledSlot: MiroScheduleSlot | undefined;
    let result;
    const autonomousTopicOrder =
      !forcedTopic && selectionStrategy === "autonomous"
        ? getAutonomousTopicOrder(categoryBalance)
        : [];
    const attemptedTopicSet = new Set<MiroTopic>();
    const getRouteFallbackTopics = (primaryTopic?: MiroTopic): MiroTopic[] => {
      if (autonomousTopicOrder.length > 0) {
        return autonomousTopicOrder.filter(
          (topic) => topic !== primaryTopic && !attemptedTopicSet.has(topic),
        );
      }

      return getFallbackTopics(primaryTopic, categoryBalance);
    };

    if (!forcedTopic && selectionStrategy === "autonomous") {
      const urgentStatus = getMiroUrgentWindowStatus(effectiveNow);
      if (!urgentStatus.is_open) {
        return jsonWithRunHistory({
          supabase,
          previewMode,
          routeStartedAt,
          body: buildCronJsonResponse({
            status: "skipped",
            traceId: routeTraceId,
            reason: urgentStatus.reason,
            attempts: attemptedTopics,
            categoryBalance,
            preview: previewMode ? true : undefined,
            simulatedAt: previewMode ? effectiveNow.toISOString() : undefined,
          }),
        });
      }
    }

    if (!forcedTopic && selectionStrategy === "editorial_schedule") {
      if (previewMode) {
        const scheduleDecision = getMiroScheduleDecision(effectiveNow);
        if (scheduleDecision.kind === "publish") {
          scheduledSlot = scheduleDecision.slot;
        } else {
          const reason = `${scheduleDecision.reason} Следующее окно: ${scheduleDecision.next_slot.weekday_label} ${scheduleDecision.next_slot.local_time} (${scheduleDecision.next_slot.topic}).`;
          return jsonWithRunHistory({
            supabase,
            previewMode,
            routeStartedAt,
            body: buildCronJsonResponse({
              status: "skipped",
              traceId: routeTraceId,
              reason,
              attempts: attemptedTopics,
              categoryBalance,
              preview: true,
              simulatedAt: effectiveNow.toISOString(),
            }),
          });
        }
      } else {
        const pendingSchedule = await getPendingScheduledSlot(
          recentPostsQuery,
          effectiveNow,
        );

        if (pendingSchedule.pendingSlot) {
          scheduledSlot = pendingSchedule.pendingSlot;
        } else {
          const scheduleDecision = getMiroScheduleDecision(effectiveNow);
          const reason =
            !pendingSchedule.activeSlot
              ? scheduleDecision.kind === "quiet"
                ? scheduleDecision.reason
                : `Активный слот уже определен scheduler-логикой: ${scheduleDecision.slot.weekday_label} ${scheduleDecision.slot.local_time} (${scheduleDecision.slot.topic}).`
              : `Текущий слот уже закрыт сегодняшней публикацией. Следующее окно: ${pendingSchedule.nextSlot.weekday_label} ${pendingSchedule.nextSlot.local_time} (${pendingSchedule.nextSlot.topic}).`;

          return jsonWithRunHistory({
            supabase,
            previewMode,
            routeStartedAt,
            body: buildCronJsonResponse({
              status: "skipped",
              traceId: routeTraceId,
              reason,
              attempts: attemptedTopics,
              categoryBalance,
            }),
          });
        }
      }
    }

    const initialAgentBudget = getAgentBudgetForRoute(routeStartedAt);
    if (!initialAgentBudget) {
      return jsonWithRunHistory({
        supabase,
        previewMode,
        routeStartedAt,
        body: buildCronJsonResponse({
          status: "skipped",
          traceId: routeTraceId,
          reason: "Route budget exhausted before primary topic execution.",
          attempts: attemptedTopics,
          categoryBalance,
        }),
      });
    }

    const autonomousPrimaryTopic = autonomousTopicOrder[0];
    const requestedPrimaryTopic =
      forcedTopic ?? scheduledSlot?.topic ?? autonomousPrimaryTopic;
    const balancedPrimaryTopic =
      !forcedTopic &&
      requestedPrimaryTopic &&
      selectionStrategy !== "autonomous"
        ? getBalancedPrimaryTopic(requestedPrimaryTopic, categoryBalance)
        : requestedPrimaryTopic;

    if (
      requestedPrimaryTopic &&
      balancedPrimaryTopic &&
      requestedPrimaryTopic !== balancedPrimaryTopic
    ) {
      attemptedTopics.push({
        topic: requestedPrimaryTopic,
        status: "skipped",
        reason: `category balance rerouted primary topic to ${balancedPrimaryTopic}`,
      });
    }

    if (balancedPrimaryTopic) {
      attemptedTopicSet.add(balancedPrimaryTopic);
    }

    result = await safeRunAgent(agent, {
      forcedTopic: balancedPrimaryTopic,
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
      for (const fallbackTopic of getRouteFallbackTopics(primaryTopic)) {
        const fallbackBudget = getAgentBudgetForRoute(routeStartedAt);
        if (!fallbackBudget) {
          attemptedTopics.push({
            topic: fallbackTopic,
            status: "skipped",
            reason: "route budget exhausted before fallback execution",
          });
          break;
        }

        attemptedTopicSet.add(fallbackTopic);
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
        effectiveNow,
        supabase
      );

      if (noveltyConflict && !forcedTopic) {
        attemptedTopics.push({
          topic: candidateResult.topic,
          status: "skipped",
          reason: noveltyConflict,
        });

        for (const fallbackTopic of getRouteFallbackTopics(candidateResult.topic)) {
          const fallbackBudget = getAgentBudgetForRoute(routeStartedAt);
          if (!fallbackBudget) {
            attemptedTopics.push({
              topic: fallbackTopic,
              status: "skipped",
              reason: "route budget exhausted before novelty fallback execution",
            });
            break;
          }

          attemptedTopicSet.add(fallbackTopic);
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
            effectiveNow,
            supabase,
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

        return jsonWithRunHistory({
          supabase,
          previewMode,
          routeStartedAt,
          body: buildCronJsonResponse({
            status: "skipped",
            traceId: candidateResult.trace_id,
            reason: noveltyConflict,
            topic: candidateResult.topic,
            attempts: attemptedTopics,
            evidence: candidateResult.evidence,
            categoryBalance,
          }),
        });
      }

      return completeSuccessfulRun({
        supabase,
        routeStartedAt,
        previewMode,
        postsTable,
        candidateInsert,
        post: result.post,
        request,
        traceId: result.trace_id,
        topic: result.topic,
        attemptedTopics,
        evidence: result.evidence,
        categoryBalance,
        simulatedAt: previewMode ? effectiveNow.toISOString() : undefined,
        scheduledSlot,
      });
    }

    const editorialFallbackResponse = await tryEditorialFallbacks({
      supabase,
      routeStartedAt,
      recentPostsQuery,
      fallbackCandidates,
      request,
      result,
      attemptedTopics,
      previewMode,
      effectiveNow,
      categoryBalance,
      simulatedAt: previewMode ? effectiveNow.toISOString() : undefined,
      scheduledSlot,
    });
    if (editorialFallbackResponse) {
      return editorialFallbackResponse;
    }

    const latestPostAgeHours = await tryGetLatestPostAgeHours(
      recentPostsQuery,
      activeTraceId,
      effectiveNow,
    );
    const recoverableMarketTopic = getRecoverableMarketTopic(attemptedTopics, {
      allowSilenceRescue:
        latestPostAgeHours !== undefined &&
        latestPostAgeHours >= SILENCE_RESCUE_THRESHOLD_HOURS,
    });
    if (
      recoverableMarketTopic &&
      !isMarketRescueAllowed(categoryBalance)
    ) {
      attemptedTopics.push({
        topic: recoverableMarketTopic,
        status: "skipped",
        reason:
          categoryBalance
            ? "market timeout rescue blocked because visible feed is already market-heavy"
            : "market timeout rescue blocked because category balance is unavailable",
      });
    }
    const timedOutMarketTopic =
      isMarketRescueAllowed(categoryBalance)
        ? recoverableMarketTopic
        : undefined;
    if (timedOutMarketTopic) {
      try {
        const postsTable = supabase.from("posts") as unknown as PostsInsertQuery;
        const timeoutFallback = await buildTimedOutMarketFallbackPost(
          timedOutMarketTopic,
        );

        if (timeoutFallback) {
          const { post: fallbackPost, payload: fallbackPayload } = timeoutFallback;
          const languageLeak = findRussianLanguageLeak(fallbackPost);
          if (languageLeak) {
            attemptedTopics.push({
              topic: timedOutMarketTopic,
              status: "skipped",
              reason: languageLeak,
            });
          } else {
            const qualityConflict =
              detectAssistantTone(fallbackPost) ??
              validatePostQuality(
                fallbackPost,
                fallbackPayload,
                timedOutMarketTopic,
              );

            if (qualityConflict) {
              attemptedTopics.push({
                topic: timedOutMarketTopic,
                status: "skipped",
                reason: qualityConflict,
              });
            } else {
              const fallbackInsert = mapPostToInsert(fallbackPost);
              const noveltyConflict = await findNoveltyConflict(
                recentPostsQuery,
                fallbackInsert,
                effectiveNow,
                supabase,
              );

              if (!noveltyConflict) {
                attemptedTopics.push({
                  topic: timedOutMarketTopic,
                  status: "generated",
                });

                return completeSuccessfulRun({
                  supabase,
                  routeStartedAt,
                  previewMode,
                  postsTable,
                  candidateInsert: fallbackInsert,
                  post: fallbackPost,
                  request,
                  traceId: `${result.trace_id}_timeout_fallback`,
                  topic: timedOutMarketTopic,
                  attemptedTopics,
                  evidence: result.evidence,
                  categoryBalance,
                  mode: "timeout_fallback",
                  simulatedAt: previewMode ? effectiveNow.toISOString() : undefined,
                  scheduledSlot,
                });
              }

              attemptedTopics.push({
                topic: timedOutMarketTopic,
                status: "skipped",
                reason: noveltyConflict,
              });
            }
          }
        }
      } catch (error) {
        console.error("[MiroCron] Timeout fallback failed", {
          topic: timedOutMarketTopic,
          error: normalizeErrorMessage(error),
        });
      }
    }

    const finalSkipReason =
      [...attemptedTopics]
        .reverse()
        .find((attempt) => attempt.status === "skipped" && attempt.reason)
        ?.reason ?? result.reason;

    console.log("[MiroCron] Generation skipped", {
      trace_id: result.trace_id,
      topic: result.topic,
      reason: finalSkipReason,
      gatekeeper: result.gatekeeper,
    });

    return jsonWithRunHistory({
      supabase,
      previewMode,
      routeStartedAt,
      body: buildCronJsonResponse({
        status: "skipped",
        traceId: result.trace_id,
        reason: finalSkipReason,
        topic: result.topic,
        attempts: attemptedTopics,
        evidence: result.evidence,
        categoryBalance,
        preview: previewMode,
        simulatedAt: previewMode ? effectiveNow.toISOString() : undefined,
        scheduledSlot,
      }),
    });
  } catch (error) {
    const reason = normalizeErrorMessage(error);
    if (error instanceof CronUnauthorizedError) {
      return jsonWithRunHistory({
        supabase,
        previewMode,
        routeStartedAt,
        body: buildCronJsonResponse({
          status: "failed",
          traceId: activeTraceId,
          reason,
          topic: activeTopic,
          attempts: attemptedTopics,
          evidence: activeEvidence,
          categoryBalance,
          preview: previewMode,
          simulatedAt: previewMode ? effectiveNow.toISOString() : undefined,
        }),
        status: error.statusCode,
      });
    }

    console.error("[MiroCron] Unhandled route error", {
      trace_id: activeTraceId,
      topic: activeTopic,
      reason,
      attempts: attemptedTopics,
    });

    return jsonWithRunHistory({
      supabase,
      previewMode,
      routeStartedAt,
      body: buildCronJsonResponse({
        status: "failed",
        traceId: activeTraceId,
        reason: `unhandled_error: ${reason}`,
        topic: activeTopic,
        attempts: attemptedTopics,
        evidence: activeEvidence,
        categoryBalance,
        preview: previewMode,
        simulatedAt: previewMode ? effectiveNow.toISOString() : undefined,
      }),
    });
  }
}
