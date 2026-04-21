import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  MiroAgent,
  type MiroAgentResult,
  type MiroPost,
  type MiroSelectionStrategy,
  type MiroTopic,
} from "../../../src/lib/miro-agent";
import {
  fetchCryptoFacts,
  fetchCurrencyFacts,
  type MiroFactsPayload,
} from "../../../src/lib/miro-connectors";
import { buildMiroMemoryContext } from "../../../src/lib/miro-mind";
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

const CATEGORY_COOLDOWN_HOURS: Record<PostRow["category"], number> = {
  World: 5,
  Tech: 5,
  Markets: 5,
  Sports: 5,
};

const CATEGORY_DAILY_LIMIT: Record<PostRow["category"], number> = {
  World: 2,
  Tech: 2,
  Markets: 2,
  Sports: 2,
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

function getHoursSince(value: string, nowMs: number): number {
  return (nowMs - new Date(value).getTime()) / 3_600_000;
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
    return hoursSince >= 0 && hoursSince < CATEGORY_COOLDOWN_HOURS[candidate.category];
  });

  if (recentSameCategory) {
    return `category cooldown is still active after "${recentSameCategory.title}"`;
  }

  const sameCategoryTodayCount = sameCategoryPosts.filter(
    (post) => getMinskDayKey(post.created_at) === todayKey,
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
  return typeof reason === "string" && reason.includes("Groq generator call exceeded");
}

function getTimedOutMarketTopic(attempts: AttemptedTopic[]): "markets_fx" | "markets_crypto" | undefined {
  for (const attempt of attempts) {
    if (
      (attempt.topic === "markets_fx" || attempt.topic === "markets_crypto") &&
      isGeneratorTimeoutReason(attempt.reason)
    ) {
      return attempt.topic;
    }
  }

  return undefined;
}

function normalizeFact(fact: string): string {
  return fact.replace(/\s+/g, " ").trim();
}

function buildMarketTimeoutFallbackPost(
  topic: "markets_fx" | "markets_crypto",
  payload: MiroFactsPayload,
): PersistedMiroPost | null {
  const observed = payload.facts.map(normalizeFact).filter(Boolean).slice(0, 3);
  if (observed.length === 0) {
    return null;
  }

  const lead = observed[0];
  const secondary = observed[1] ?? observed[0];
  const title =
    topic === "markets_fx"
      ? "У валют сегодня оказался разный пульс"
      : "Крипта снова двинулась не всей массой";
  const inferred =
    topic === "markets_fx"
      ? `${lead}\n\nЯ бы пропустил это как еще одну спокойную таблицу, если бы строки шли вместе. Они не идут вместе. В этом и остается заноза.\n\n${secondary}\n\nЭто еще не разворот. Просто у дня появился перекос. Мне его уже достаточно, чтобы задержаться на нем дольше обычного.`
      : `${lead}\n\nМеня здесь держит не ширина движения, а его выборочность. Экран вроде общий, но тянет взгляд только в одну сторону. Так шум перестает быть шумом.\n\n${secondary}\n\nЯ не называю это переломом. Пока рано. Но единый строй уже распался, и дальше рынок обычно становится нервнее, чем хочет казаться.`;

  return {
    title,
    observed,
    inferred,
    cross_signal:
      topic === "markets_fx"
        ? "Для валют сейчас важнее не масштаб, а то, что соседние пары живут на разной скорости."
        : "Для крипты важнее не общий подъем, а то, какая именно линия вырывается из общего строя.",
    hypothesis:
      topic === "markets_fx"
        ? "Если этот разный темп сохранится еще на цикл, рынок начнет выделять отдельные пары раньше общего разворота."
        : "Если выборочный импульс не погаснет, следующая сессия станет тестом уже не для рынка целиком, а для его одиночных лидеров.",
    reasoning:
      "Даже без длинной генерации здесь остался конкретный перекос в ритме, а не сухой рыночный фон.",
    confidence: "medium",
    category: "Markets",
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

async function safeRunAgent(
  agent: MiroAgent,
  input: {
    forcedTopic?: MiroTopic;
    selectionStrategy: MiroSelectionStrategy;
    memoryContext: ReturnType<typeof buildMiroMemoryContext>;
  },
): Promise<MiroAgentResult> {
  try {
    return await agent.run({
      forcedTopic: input.forcedTopic,
      selectionStrategy: input.selectionStrategy,
      targetLanguage: "ru",
      memoryContext: input.memoryContext,
      totalTimeoutMs:
        input.selectionStrategy === "editorial_schedule" ? undefined : 24_000,
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
  const expectedSecret = process?.env?.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "CRON_SECRET is not configured.",
      },
      { status: 500 },
    );
  }

  const actualSecret = getSecretFromRequest(request);
  if (actualSecret !== expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized cron request.",
      },
      { status: 401 },
    );
  }

  const forcedTopic = getForcedTopic(request);
  const selectionStrategy = getSelectionStrategy(request);
  const supabase = getAdminSupabaseClient();
  const recentPostsQuery = supabase.from("posts") as unknown as RecentPostsQuery;
  const memoryContext = await loadMemoryContext(recentPostsQuery);
  const agent = new MiroAgent();
  const attemptedTopics: AttemptedTopic[] = [];
  let result;

  result = await safeRunAgent(agent, {
    forcedTopic,
    selectionStrategy,
    memoryContext,
  });
  attemptedTopics.push({
    topic: result.topic,
    status: result.status,
    reason: result.status === "skipped" ? result.reason : undefined,
  });

  if (shouldTryFallbackTopics({ forcedTopic, result })) {
    const primaryTopic = result.topic;
    for (const fallbackTopic of getFallbackTopics(primaryTopic)) {
      const fallbackResult = await safeRunAgent(agent, {
        forcedTopic: fallbackTopic,
        selectionStrategy,
        memoryContext,
      });

      attemptedTopics.push({
        topic: fallbackResult.topic,
        status: fallbackResult.status,
        reason:
          fallbackResult.status === "skipped" ? fallbackResult.reason : undefined,
      });

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
        const fallbackResult = await safeRunAgent(agent, {
          forcedTopic: fallbackTopic,
          selectionStrategy,
          memoryContext,
        });

        attemptedTopics.push({
          topic: fallbackResult.topic,
          status: fallbackResult.status,
          reason:
            fallbackResult.status === "skipped" ? fallbackResult.reason : undefined,
        });

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

      return NextResponse.json({
        status: "skipped",
        reason: noveltyConflict,
        trace_id: candidateResult.trace_id,
        topic: candidateResult.topic,
        attempts: attemptedTopics,
      });
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

    return NextResponse.json({
      status: "success",
      post_id: savedPost.id,
      created_at: savedPost.created_at,
      trace_id: result.trace_id,
      topic: result.topic,
      attempts: attemptedTopics,
      telegram,
    });
  }

  const timedOutMarketTopic = getTimedOutMarketTopic(attemptedTopics);
  if (timedOutMarketTopic) {
    try {
      const postsTable = supabase.from("posts") as unknown as PostsInsertQuery;
      const fallbackPost = await buildTimedOutMarketFallbackPost(timedOutMarketTopic);

      if (fallbackPost) {
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

          return NextResponse.json({
            status: "success",
            mode: "timeout_fallback",
            post_id: savedPost.id,
            created_at: savedPost.created_at,
            trace_id: `${result.trace_id}_timeout_fallback`,
            topic: timedOutMarketTopic,
            attempts: attemptedTopics,
            telegram,
          });
        }

        attemptedTopics.push({
          topic: timedOutMarketTopic,
          status: "skipped",
          reason: noveltyConflict,
        });
      }
    } catch (error) {
      console.error("[MiroCron] Timeout fallback failed", {
        topic: timedOutMarketTopic,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("[MiroCron] Generation skipped", {
    trace_id: result.trace_id,
    topic: result.topic,
    reason: result.reason,
    gatekeeper: result.gatekeeper,
  });

  return NextResponse.json({
    status: "skipped",
    reason: result.reason,
    trace_id: result.trace_id,
    topic: result.topic,
    attempts: attemptedTopics,
  });
}
