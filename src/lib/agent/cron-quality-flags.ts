import type { MiroTopic } from "./types";

export const MAX_PERSISTED_ROUTE_ATTEMPTS = 25;
const MAX_PERSISTED_REASON_LENGTH = 240;

export type RouteAttemptTraceInput = {
  topic?: MiroTopic;
  status: "generated" | "skipped";
  reason?: string;
};

type PersistedRouteAttempt = {
  index: number;
  topic?: MiroTopic;
  status: RouteAttemptTraceInput["status"];
  reason?: string;
};

export type RouteAttemptsQualityEvent = {
  code: "route_attempts";
  severity: "info";
  message: string;
  details: {
    attempt_count: number;
    truncated: boolean;
    attempts: PersistedRouteAttempt[];
  };
};

function clipReason(reason: string | undefined): string | undefined {
  const normalized = reason?.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= MAX_PERSISTED_REASON_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_PERSISTED_REASON_LENGTH)}...`;
}

export function buildRouteAttemptsQualityEvent(
  attempts: readonly RouteAttemptTraceInput[] | undefined,
): RouteAttemptsQualityEvent | undefined {
  if (!attempts?.length) {
    return undefined;
  }

  const truncated = attempts.length > MAX_PERSISTED_ROUTE_ATTEMPTS;
  const visibleAttempts = truncated
    ? attempts.slice(-MAX_PERSISTED_ROUTE_ATTEMPTS)
    : attempts;
  const firstVisibleIndex = attempts.length - visibleAttempts.length + 1;
  const persistedAttempts = visibleAttempts.map((attempt, index) => {
    const reason = clipReason(attempt.reason);

    return {
      index: firstVisibleIndex + index,
      ...(attempt.topic ? { topic: attempt.topic } : {}),
      status: attempt.status,
      ...(reason ? { reason } : {}),
    };
  });

  return {
    code: "route_attempts",
    severity: "info",
    message: truncated
      ? `Route attempted ${attempts.length} topic paths; persisted last ${MAX_PERSISTED_ROUTE_ATTEMPTS}.`
      : `Route attempted ${attempts.length} topic paths.`,
    details: {
      attempt_count: attempts.length,
      truncated,
      attempts: persistedAttempts,
    },
  };
}
