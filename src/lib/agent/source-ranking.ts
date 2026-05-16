import type { MiroCategoryHint, MiroFactsPayload } from "../connectors";
import { getSameStoryCorroboratingSources } from "./source-story-validation";

export type SourceKind = "official" | "primary" | "api" | "expert" | "media" | "community";

export type SourceCandidate = {
  label: string;
  sourceKind?: SourceKind;
  priority?: number;
  payload: MiroFactsPayload;
};

export type RankedSourceCandidate = SourceCandidate & {
  score: number;
  ageDays: number | null;
  reasons: string[];
};

const SOURCE_KIND_SCORE: Record<SourceKind, number> = {
  official: 28,
  primary: 24,
  api: 22,
  expert: 18,
  media: 12,
  community: 4,
};

const MAX_FRESH_SOURCE_AGE_DAYS: Record<MiroCategoryHint, number> = {
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

function getCandidateDate(payload: MiroFactsPayload): Date | null {
  return parseDate(payload.source_published_at) ?? parseDate(payload.event_date);
}

function calculateAgeDays(candidateDate: Date | null, now: Date): number | null {
  if (!candidateDate) {
    return null;
  }

  return (now.getTime() - candidateDate.getTime()) / (24 * 60 * 60 * 1000);
}

function countDistinctCorroboratingSources(payload: MiroFactsPayload): number {
  const sources = new Set<string>();
  for (const source of getSameStoryCorroboratingSources(payload)) {
    const key = `${source.source}|${source.url ?? ""}`.trim();
    if (key) {
      sources.add(key);
    }
  }

  return sources.size;
}

function calculateFreshnessScore(
  category: MiroCategoryHint,
  ageDays: number | null,
  reasons: string[],
): number {
  if (ageDays === null) {
    reasons.push("missing-date");
    return -30;
  }

  if (ageDays < -1.5) {
    reasons.push("future-date");
    return -60;
  }

  const maxAgeDays = MAX_FRESH_SOURCE_AGE_DAYS[category];
  if (ageDays > maxAgeDays) {
    reasons.push(`stale:${ageDays.toFixed(1)}d`);
    return -80 - Math.min(ageDays, 120);
  }

  const normalizedAge = Math.max(ageDays, 0);
  reasons.push(`fresh:${normalizedAge.toFixed(1)}d`);
  return Math.max(0, 42 - (normalizedAge / maxAgeDays) * 30);
}

function calculateCandidateScore(candidate: SourceCandidate, now: Date): RankedSourceCandidate {
  const reasons: string[] = [];
  const payload = candidate.payload;
  const ageDays = calculateAgeDays(getCandidateDate(payload), now);
  const corroboratingCount = countDistinctCorroboratingSources(payload);
  const factsCount = payload.facts.filter((fact) => fact.trim()).length;

  const sourceKind = candidate.sourceKind ?? "media";
  let score = 0;
  score += SOURCE_KIND_SCORE[sourceKind];
  score += candidate.priority ?? 0;
  score += calculateFreshnessScore(payload.category_hint, ageDays, reasons);
  score += Math.min(factsCount, 5) * 3;
  score += Math.min(corroboratingCount, 4) * 7;

  if (payload.source_url?.trim()) {
    score += 8;
  } else {
    score -= 18;
    reasons.push("missing-url");
  }

  if (corroboratingCount >= 2) {
    reasons.push(`corroborated:${corroboratingCount}`);
  }

  return {
    ...candidate,
    score,
    ageDays,
    reasons,
  };
}

export function rankSourceCandidates(
  candidates: readonly SourceCandidate[],
  now = new Date(),
): RankedSourceCandidate[] {
  return candidates
    .map((candidate) => calculateCandidateScore(candidate, now))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftAge = left.ageDays ?? Number.POSITIVE_INFINITY;
      const rightAge = right.ageDays ?? Number.POSITIVE_INFINITY;
      return leftAge - rightAge;
    });
}
