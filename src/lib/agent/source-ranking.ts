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

const PUBLICATION_SIGNAL_PATTERNS: Record<MiroCategoryHint, readonly RegExp[]> = {
  Sports: [
    /\b(score|won|win over|beat|final|playoff|series|game|goal|takeaways|streak)\b/iu,
    /\b(счет|обыграл|побед|финал|серия|матч|гол)\b/iu,
  ],
  Markets: [
    /\b(outperformed|rose by|fell by|24h move|spread|divergence)\b/iu,
    /\b(опередил|вырос|сниз|упал|расхожд|спред)\b/iu,
  ],
  Tech: [
    /\b(released|launched|introduced|benchmark|model|agent|inference|training|research|open-source|database|vector search|chip|robot|quantum)\b/iu,
    /\b(релиз|запуст|представ|бенчмарк|модель|агент|инференс|обучен|исследован|робот|квант)\b/iu,
  ],
  World: [
    /\b(atlas|reveals|biodiversity|rare earth|eclipse|mission|discovered|record|new species|study finds|researchers|rainforest)\b/iu,
    /\b(атлас|биоразнообраз|редкозем|затмен|мисси|обнаруж|рекорд|исследовател|тропическ)\b/iu,
  ],
};

const LOW_PUBLICATION_SIGNAL_PATTERNS: Record<MiroCategoryHint, readonly RegExp[]> = {
  Sports: [
    /\b(preview|where to watch|transfer|signed|quote|said)\b/iu,
    /\b(превью|где смотреть|трансляц|переход|подписал|заявил|сказал)\b/iu,
  ],
  Markets: [
    /\b(nearly unchanged|holding its breath)\b/iu,
    /\b(почти не измен|таблица|без изменений)\b/iu,
  ],
  Tech: [
    /\b(partnership|customer story|webinar|conference|celebrity|actor|lawsuit|police|law-crime|manipulated by ai)\b/iu,
    /\b(партнерств|клиентск|вебинар|конференц|знаменит|актер|суд|полици)\b/iu,
  ],
  World: [
    /\b(weekend|festival|premiere|book review|culture guide|where to go)\b/iu,
    /\b(выходн|фестивал|премьера|книжн|куда сходить|афиша)\b/iu,
  ],
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

function getSignalText(payload: MiroFactsPayload): string {
  return [
    payload.source,
    payload.source_url,
    ...payload.facts,
    ...(payload.corroborating_sources ?? []).map((source) =>
      [source.title, source.url].filter(Boolean).join(" "),
    ),
  ]
    .filter(Boolean)
    .join(" ");
}

function calculatePublicationSignalScore(
  category: MiroCategoryHint,
  payload: MiroFactsPayload,
  reasons: string[],
): number {
  const signalText = getSignalText(payload);
  let score = 0;

  if (PUBLICATION_SIGNAL_PATTERNS[category].some((pattern) => pattern.test(signalText))) {
    score += 16;
    reasons.push("publishable-signal");
  }

  if (LOW_PUBLICATION_SIGNAL_PATTERNS[category].some((pattern) => pattern.test(signalText))) {
    score -= 32;
    reasons.push("low-publication-signal");
  }

  return score;
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
  score += calculatePublicationSignalScore(payload.category_hint, payload, reasons);
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
