import { getTopicSourceRegistry } from "../src/lib/agent/topics";
import type { MiroCategoryHint } from "../src/lib/connectors";

const SOURCE_FRESHNESS_MAX_AGE_DAYS: Record<MiroCategoryHint, number> = {
  Sports: 4,
  Markets: 3,
  Tech: 14,
  World: 14,
};

function parseDate(value: string | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function ageDays(value: string | undefined, now: Date): number | null {
  const parsed = parseDate(value);
  if (!parsed) {
    return null;
  }

  return (now.getTime() - parsed.getTime()) / (24 * 60 * 60 * 1000);
}

const requestTimeoutMs = Number(process.env.SOURCE_AUDIT_TIMEOUT_MS ?? 5_000);
const now = new Date();
const registry = getTopicSourceRegistry();

const rows = await Promise.all(
  registry.map(async (entry) => {
    const startedAt = Date.now();
    try {
      const payload = await entry.fetchPayload(requestTimeoutMs);
      const sourceDate = payload.source_published_at ?? payload.event_date;
      const sourceAgeDays = ageDays(sourceDate, now);
      const maxAgeDays = SOURCE_FRESHNESS_MAX_AGE_DAYS[payload.category_hint];

      return {
        topic: entry.topic,
        label: entry.label,
        source_kind: entry.sourceKind ?? "media",
        status: "ok" as const,
        duration_ms: Date.now() - startedAt,
        source: payload.source,
        source_url: payload.source_url ?? null,
        source_published_at: payload.source_published_at ?? null,
        event_date: payload.event_date ?? null,
        facts: payload.facts.length,
        corroborating_sources: payload.corroborating_sources?.length ?? 0,
        stale: sourceAgeDays === null ? null : sourceAgeDays > maxAgeDays,
        age_days:
          sourceAgeDays === null ? null : Number(sourceAgeDays.toFixed(2)),
      };
    } catch (error) {
      return {
        topic: entry.topic,
        label: entry.label,
        source_kind: entry.sourceKind ?? "media",
        status: "failed" as const,
        duration_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }),
);

const ok = rows.filter((row) => row.status === "ok").length;
const failed = rows.length - ok;
const stale = rows.filter(
  (row) => row.status === "ok" && row.stale === true,
).length;

console.log(
  JSON.stringify(
    {
      checked_at: now.toISOString(),
      request_timeout_ms: requestTimeoutMs,
      attempted_sources: rows.length,
      ok,
      failed,
      stale,
      rows,
    },
    null,
    2,
  ),
);
