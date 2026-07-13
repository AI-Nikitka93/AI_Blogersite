import { NextResponse } from "next/server";

import {
  getAdminSupabaseClient,
  getPublicSupabaseClient,
  type PostRow,
  type RunHistoryRow,
} from "../../../src/lib/supabase";
import { getPublicPostBlockReason } from "../../../src/lib/public-post-quality";
import {
  getMiroActiveSlot,
  getNextMiroScheduleSlot,
  type MiroScheduleSlot,
} from "../../../src/lib/miro-schedule";
import { assessSchedulerDelivery } from "../../../src/lib/scheduler-delivery";

const CORE_ENV_VARS = [
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MIRO_SITE_URL",
] as const;

const TELEGRAM_ENV_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHANNEL_USERNAME",
  "TELEGRAM_CHANNEL_ID",
] as const;

const ROLE_NAMES = ["writer", "research", "gatekeeper", "review"] as const;
const RECENT_PUBLISH_PASS_HOURS = 24;
const RECENT_PUBLISH_WARN_HOURS = 36;
const PUBLIC_POST_SELECT =
  "id, title, category, source, created_at, observed, inferred, opinion, cross_signal, hypothesis, reasoning, confidence";

type HealthCheckStatus = "pass" | "warn" | "fail";
type HealthStatus = "ok" | "degraded";
type LlmRoleName = (typeof ROLE_NAMES)[number];

type PublicPostProjection = Pick<
  PostRow,
  | "id"
  | "title"
  | "category"
  | "source"
  | "created_at"
  | "observed"
  | "inferred"
  | "opinion"
  | "cross_signal"
  | "hypothesis"
  | "reasoning"
  | "confidence"
>;

type RunHistoryProjection = Pick<
  RunHistoryRow,
  "trace_id" | "topic" | "status" | "reason" | "post_id" | "duration_ms" | "created_at"
>;

interface HealthChecks {
  env: HealthCheckStatus;
  llm_config: HealthCheckStatus;
  telegram_config: HealthCheckStatus;
  supabase_public: HealthCheckStatus;
  supabase_admin: HealthCheckStatus;
  scheduler_delivery: HealthCheckStatus;
  publish_freshness: HealthCheckStatus;
  reader_visibility: HealthCheckStatus;
}

interface RoleConfig {
  provider: string;
  model: string;
  secret_env: string | null;
  ready: boolean;
}

interface HealthPostSummary {
  id: string;
  title: string;
  category: string;
  source: string | null;
  created_at: string;
  age_hours: number;
}

interface HealthRunSummary {
  trace_id: string;
  topic: string | null;
  status: string;
  reason: string | null;
  post_id: string | null;
  duration_ms: number | null;
  created_at: string;
  age_hours: number;
}

interface HealthDbSnapshot {
  latestPost: HealthPostSummary | null;
  latestVisiblePost: HealthPostSummary | null;
  latestRun: HealthRunSummary | null;
  latestSuccessfulRun: HealthRunSummary | null;
  latestSuccessVisible: boolean;
  latestSuccessVisibilityReason: string | null;
  recentRuns: HealthRunSummary[] | null;
  recentRouteReasons: Array<Pick<HealthRunSummary, "trace_id" | "topic" | "status" | "reason" | "age_hours">>;
  publicStatus: HealthCheckStatus;
  adminStatus: HealthCheckStatus;
  errors: Partial<Record<"supabase_public" | "supabase_admin", string>>;
}

function getEnvValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function hasEnvValue(name: string): boolean {
  return getEnvValue(name).length > 0;
}

function getMissingEnvVars(names: readonly string[]): string[] {
  return names.filter((name) => !hasEnvValue(name));
}

function getRequestSecret(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret) {
    return headerSecret.trim();
  }

  return new URL(request.url).searchParams.get("token")?.trim() ?? null;
}

function shouldIncludeOpsDetails(request: Request): boolean {
  const wantsOpsView = new URL(request.url).searchParams.get("view") === "ops";
  if (!wantsOpsView) {
    return false;
  }

  const expectedSecret = getEnvValue("CRON_SECRET");
  if (!expectedSecret) {
    return false;
  }

  return getRequestSecret(request) === expectedSecret;
}

function getRoleProvider(role: LlmRoleName): string {
  return (
    getEnvValue(`MIRO_${role.toUpperCase()}_PROVIDER`) ||
    getEnvValue("MIRO_LLM_PROVIDER") ||
    "groq"
  );
}

function getRoleModel(role: LlmRoleName): string {
  if (role === "writer") {
    return (
      getEnvValue("MIRO_WRITER_MODEL") ||
      getEnvValue("MIRO_GENERATOR_MODEL")
    );
  }

  return getEnvValue(`MIRO_${role.toUpperCase()}_MODEL`);
}

function getProviderSecretEnv(provider: string): string | null {
  switch (provider) {
    case "groq":
      return "GROQ_API_KEY";
    case "openrouter":
      return "OPENROUTER_API_KEY";
    case "nvidia":
      return "NVIDIA_API_KEY";
    default:
      return null;
  }
}

function getRoleConfig(role: LlmRoleName): RoleConfig {
  const provider = getRoleProvider(role);
  const model = getRoleModel(role);
  const secretEnv = getProviderSecretEnv(provider);
  const ready = Boolean(model) && (!secretEnv || hasEnvValue(secretEnv));

  return {
    provider,
    model,
    secret_env: secretEnv,
    ready,
  };
}

function getRoleConfigs(): Record<LlmRoleName, RoleConfig> {
  return {
    writer: getRoleConfig("writer"),
    research: getRoleConfig("research"),
    gatekeeper: getRoleConfig("gatekeeper"),
    review: getRoleConfig("review"),
  };
}

function getConfigMissingEnv(configs: Record<LlmRoleName, RoleConfig>): string[] {
  const missing = new Set<string>();

  for (const [roleName, config] of Object.entries(configs) as Array<
    [LlmRoleName, RoleConfig]
  >) {
    if (!config.model) {
      missing.add(`MIRO_${roleName.toUpperCase()}_MODEL`);
    }

    if (config.secret_env && !hasEnvValue(config.secret_env)) {
      missing.add(config.secret_env);
    }
  }

  return [...missing];
}

function getTelegramConfigStatus(): {
  status: HealthCheckStatus;
  issues: string[];
} {
  const issues: string[] = [];
  const username = getEnvValue("TELEGRAM_CHANNEL_USERNAME");
  const channelId = getEnvValue("TELEGRAM_CHANNEL_ID");

  if (getMissingEnvVars(TELEGRAM_ENV_VARS).length > 0) {
    issues.push("missing required Telegram env vars");
  }

  if (username && !username.startsWith("@")) {
    issues.push("channel username should start with @");
  }

  if (channelId && !/^-100\d{6,}$/.test(channelId)) {
    issues.push("channel id should look like a Telegram channel id");
  }

  return {
    status: issues.length === 0 ? "pass" : "fail",
    issues,
  };
}

function getAgeHours(createdAt: string, now = new Date()): number {
  return Number(
    ((now.getTime() - new Date(createdAt).getTime()) / 3_600_000).toFixed(2),
  );
}

function summarizePost(
  post: PublicPostProjection | null,
  now = new Date(),
): HealthPostSummary | null {
  if (!post) {
    return null;
  }

  return {
    id: post.id,
    title: post.title,
    category: post.category,
    source: post.source,
    created_at: post.created_at,
    age_hours: getAgeHours(post.created_at, now),
  };
}

function isReaderVisiblePost(post: PublicPostProjection): boolean {
  return getPublicPostBlockReason(post) === null;
}

async function loadPublicPostById(postId: string): Promise<{
  post: PublicPostProjection | null;
  error: string | null;
}> {
  const publicSupabase = getPublicSupabaseClient();
  const { data, error } = await publicSupabase
    .from("posts")
    .select(PUBLIC_POST_SELECT)
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    return { post: null, error: error.message };
  }

  return {
    post: (data as PublicPostProjection | null) ?? null,
    error: null,
  };
}

function summarizeRun(
  run: RunHistoryProjection | null,
  now = new Date(),
): HealthRunSummary | null {
  if (!run) {
    return null;
  }

  return {
    trace_id: run.trace_id,
    topic: run.topic,
    status: run.status,
    reason: run.reason,
    post_id: run.post_id,
    duration_ms: run.duration_ms,
    created_at: run.created_at,
    age_hours: getAgeHours(run.created_at, now),
  };
}

function serializeSlot(slot?: MiroScheduleSlot) {
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

function buildScheduleSummary(now = new Date()) {
  return {
    active_slot: serializeSlot(getMiroActiveSlot(now)),
    next_slot: serializeSlot(getNextMiroScheduleSlot(now))!,
  };
}

function getPublishFreshnessStatus(
  latestSuccessfulRun: HealthRunSummary | null,
  latestPost: HealthPostSummary | null,
): { status: HealthCheckStatus; reason: string } {
  if (latestSuccessfulRun) {
    if (latestSuccessfulRun.age_hours <= RECENT_PUBLISH_PASS_HOURS) {
      return {
        status: "pass",
        reason: "latest successful run is fresh",
      };
    }

    if (latestSuccessfulRun.age_hours <= RECENT_PUBLISH_WARN_HOURS) {
      return {
        status: "warn",
        reason: "latest successful run is getting stale",
      };
    }

    return {
      status: "fail",
      reason: "latest successful run is stale",
    };
  }

  if (latestPost) {
    return {
      status: "warn",
      reason: "latest post exists, but no successful run is visible in run_history",
    };
  }

  return {
    status: "warn",
    reason: "no published posts or successful runs found",
  };
}

function getReaderVisibilityStatus(input: {
  latestSuccessfulRun: HealthRunSummary | null;
  latestVisiblePost: HealthPostSummary | null;
  latestSuccessVisible: boolean;
  latestSuccessVisibilityReason: string | null;
}): { status: HealthCheckStatus; reason: string } {
  if (input.latestSuccessfulRun?.post_id) {
    if (input.latestSuccessVisible) {
      return {
        status: "pass",
        reason: "latest successful run post is visible on reader surfaces",
      };
    }

    if (
      input.latestVisiblePost &&
      new Date(input.latestVisiblePost.created_at).getTime() >
        new Date(input.latestSuccessfulRun.created_at).getTime()
    ) {
      return {
        status: "pass",
        reason:
          "a newer reader-visible post exists after the latest successful run post",
      };
    }

    return {
      status: "fail",
      reason:
        input.latestSuccessVisibilityReason ??
        "latest successful run post is not visible on reader surfaces",
    };
  }

  if (input.latestVisiblePost) {
    return {
      status: "warn",
      reason: "reader-visible post exists, but no successful run is visible",
    };
  }

  return {
    status: "warn",
    reason: "no reader-visible post found",
  };
}

async function loadDbSnapshot(includeOpsDetails: boolean): Promise<HealthDbSnapshot> {
  const errors: Partial<Record<"supabase_public" | "supabase_admin", string>> = {};
  const now = new Date();
  let publicPosts: PublicPostProjection[] = [];
  let latestPost: HealthPostSummary | null = null;
  let latestVisiblePost: HealthPostSummary | null = null;
  let latestRun: HealthRunSummary | null = null;
  let latestSuccessfulRun: HealthRunSummary | null = null;
  let latestSuccessVisible = false;
  let latestSuccessVisibilityReason: string | null = null;
  let recentRuns: HealthRunSummary[] | null = null;
  let recentRouteReasons: HealthDbSnapshot["recentRouteReasons"] = [];
  let publicStatus: HealthCheckStatus = "fail";
  let adminStatus: HealthCheckStatus = "fail";

  try {
    const publicSupabase = getPublicSupabaseClient();
    const { data, error } = await publicSupabase
      .from("posts")
      .select(PUBLIC_POST_SELECT)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      errors.supabase_public = error.message;
    } else {
      publicPosts = (data ?? []) as PublicPostProjection[];
      latestPost = summarizePost(
        publicPosts[0] ?? null,
        now,
      );
      latestVisiblePost = summarizePost(
        publicPosts.find(isReaderVisiblePost) ?? null,
        now,
      );
      publicStatus = "pass";
    }
  } catch (error) {
    errors.supabase_public =
      error instanceof Error ? error.message : String(error);
  }

  try {
    const adminSupabase = getAdminSupabaseClient();
    const [latestRunResponse, latestSuccessResponse, recentRunsResponse] =
      await Promise.all([
        adminSupabase
          .from("run_history")
          .select(
            "trace_id, topic, status, reason, post_id, duration_ms, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(1),
        adminSupabase
          .from("run_history")
          .select(
            "trace_id, topic, status, reason, post_id, duration_ms, created_at",
          )
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(1),
        adminSupabase
          .from("run_history")
          .select(
            "trace_id, topic, status, reason, post_id, duration_ms, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

    if (latestRunResponse.error) {
      errors.supabase_admin = latestRunResponse.error.message;
    } else if (latestSuccessResponse.error) {
      errors.supabase_admin = latestSuccessResponse.error.message;
    } else if (recentRunsResponse.error) {
      errors.supabase_admin = recentRunsResponse.error.message;
    } else {
      latestRun = summarizeRun(
        (latestRunResponse.data?.[0] as RunHistoryProjection | null) ?? null,
        now,
      );
      latestSuccessfulRun = summarizeRun(
        (latestSuccessResponse.data?.[0] as RunHistoryProjection | null) ?? null,
        now,
      );
      const summarizedRecentRuns = (recentRunsResponse.data ?? [])
        .map((run) => summarizeRun(run as RunHistoryProjection, now))
        .filter((run): run is HealthRunSummary => Boolean(run));
      recentRuns = includeOpsDetails ? summarizedRecentRuns : null;
      recentRouteReasons = summarizedRecentRuns.map((run) => ({
        trace_id: run.trace_id,
        topic: run.topic,
        status: run.status,
        reason: run.reason,
        age_hours: run.age_hours,
      }));
      adminStatus = "pass";
    }
  } catch (error) {
    errors.supabase_admin =
      error instanceof Error ? error.message : String(error);
  }

  if (latestSuccessfulRun?.post_id) {
    const { post: successPost, error } = await loadPublicPostById(
      latestSuccessfulRun.post_id,
    );
    latestSuccessVisibilityReason = error
      ? `latest successful run post public lookup failed: ${error}`
      : successPost
        ? getPublicPostBlockReason(successPost)
        : "latest successful run post is not readable through public post lookup";
    latestSuccessVisible = latestSuccessVisibilityReason === null;
  }

  return {
    latestPost,
    latestVisiblePost,
    latestRun,
    latestSuccessfulRun,
    latestSuccessVisible,
    latestSuccessVisibilityReason,
    recentRuns,
    recentRouteReasons,
    publicStatus,
    adminStatus,
    errors,
  };
}

function buildFreshnessIncident(input: {
  freshness: { status: HealthCheckStatus; reason: string };
  latestSuccessfulRun: HealthRunSummary | null;
  recentRouteReasons: HealthDbSnapshot["recentRouteReasons"];
}) {
  if (input.freshness.status === "pass") {
    return null;
  }

  return {
    type: "freshness_incident",
    status: input.freshness.status,
    reason: input.freshness.reason,
    latest_success_age_hours: input.latestSuccessfulRun?.age_hours ?? null,
    recent_route_reasons: input.recentRouteReasons,
  };
}

function buildReaderVisibilityIncident(input: {
  visibility: { status: HealthCheckStatus; reason: string };
  latestSuccessfulRun: HealthRunSummary | null;
  latestVisiblePost: HealthPostSummary | null;
}) {
  if (input.visibility.status === "pass") {
    return null;
  }

  return {
    type: "reader_visibility_incident",
    status: input.visibility.status,
    reason: input.visibility.reason,
    latest_success_post_id: input.latestSuccessfulRun?.post_id ?? null,
    latest_visible_post_id: input.latestVisiblePost?.id ?? null,
  };
}

function getOverallStatus(checks: HealthChecks): HealthStatus {
  return Object.values(checks).every((status) => status === "pass")
    ? "ok"
    : "degraded";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const includeOpsDetails = shouldIncludeOpsDetails(request);
  const roleConfigs = getRoleConfigs();
  const missingCoreEnv = getMissingEnvVars(CORE_ENV_VARS);
  const missingConfigEnv = getConfigMissingEnv(roleConfigs);
  const telegramConfig = getTelegramConfigStatus();
  const missingEnvVars = [
    ...new Set([
      ...missingCoreEnv,
      ...missingConfigEnv,
      ...getMissingEnvVars(TELEGRAM_ENV_VARS),
    ]),
  ];

  const envStatus: HealthCheckStatus =
    missingCoreEnv.length === 0 ? "pass" : "fail";
  const llmConfigStatus: HealthCheckStatus = Object.values(roleConfigs).every(
    (config) => config.ready,
  )
    ? "pass"
    : "fail";

  const canQueryPublic = !missingCoreEnv.some(
    (name) =>
      name === "NEXT_PUBLIC_SUPABASE_URL" || name === "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  const canQueryAdmin = !missingCoreEnv.some(
    (name) =>
      name === "NEXT_PUBLIC_SUPABASE_URL" || name === "SUPABASE_SERVICE_ROLE_KEY",
  );

  const dbSnapshot =
    canQueryPublic || canQueryAdmin
      ? await loadDbSnapshot(includeOpsDetails)
      : {
          latestPost: null,
        latestVisiblePost: null,
        latestRun: null,
        latestSuccessfulRun: null,
        latestSuccessVisible: false,
        latestSuccessVisibilityReason: null,
        recentRuns: null,
        recentRouteReasons: [],
        publicStatus: "fail" as HealthCheckStatus,
        adminStatus: "fail" as HealthCheckStatus,
        errors: {},
        };

  const publishFreshness = getPublishFreshnessStatus(
    dbSnapshot.latestSuccessfulRun,
    dbSnapshot.latestPost,
  );
  const readerVisibility = getReaderVisibilityStatus({
    latestSuccessfulRun: dbSnapshot.latestSuccessfulRun,
    latestVisiblePost: dbSnapshot.latestVisiblePost,
    latestSuccessVisible: dbSnapshot.latestSuccessVisible,
    latestSuccessVisibilityReason: dbSnapshot.latestSuccessVisibilityReason,
  });
  const schedulerDelivery = assessSchedulerDelivery({
    latestAttemptAt: dbSnapshot.latestRun?.created_at,
  });

  const checks: HealthChecks = {
    env: envStatus,
    llm_config: llmConfigStatus,
    telegram_config: telegramConfig.status,
    supabase_public: canQueryPublic ? dbSnapshot.publicStatus : "fail",
    supabase_admin: canQueryAdmin ? dbSnapshot.adminStatus : "fail",
    scheduler_delivery: schedulerDelivery.status,
    publish_freshness: publishFreshness.status,
    reader_visibility: readerVisibility.status,
  };

  const responseBody = {
    status: getOverallStatus(checks),
    service: "ai-blogersite",
    checks,
    missing_env: missingEnvVars,
    runtime: roleConfigs,
    schedule: buildScheduleSummary(),
    latest_post: dbSnapshot.latestPost,
    latest_visible_post: dbSnapshot.latestVisiblePost,
    latest_success_visible: dbSnapshot.latestSuccessVisible,
    latest_successful_run: dbSnapshot.latestSuccessfulRun,
    recent_route_reasons: dbSnapshot.recentRouteReasons,
    freshness_incident: buildFreshnessIncident({
      freshness: publishFreshness,
      latestSuccessfulRun: dbSnapshot.latestSuccessfulRun,
      recentRouteReasons: dbSnapshot.recentRouteReasons,
    }),
    reader_visibility_incident: buildReaderVisibilityIncident({
      visibility: readerVisibility,
      latestSuccessfulRun: dbSnapshot.latestSuccessfulRun,
      latestVisiblePost: dbSnapshot.latestVisiblePost,
    }),
    notes: {
      publish_freshness: publishFreshness.reason,
      reader_visibility: readerVisibility.reason,
      scheduler_delivery: schedulerDelivery.reason,
      telegram_config:
        telegramConfig.issues.length > 0
          ? telegramConfig.issues.join("; ")
          : "telegram target is configured",
    },
    errors:
      Object.keys(dbSnapshot.errors).length > 0 ? dbSnapshot.errors : undefined,
    ops:
      includeOpsDetails
        ? {
            latest_run: dbSnapshot.latestRun,
            recent_runs: dbSnapshot.recentRuns,
          }
        : undefined,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(responseBody, {
    status: responseBody.status === "ok" ? 200 : 503,
  });
}
