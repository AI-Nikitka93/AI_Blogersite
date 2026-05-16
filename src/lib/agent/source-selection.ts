import type { MiroFactsPayload } from "../connectors";
import {
  rankSourceCandidates,
  type SourceCandidate,
  type SourceKind,
} from "./source-ranking";

const SOURCE_ROTATION_MIN_BUDGET_MS = 450;
const SOURCE_ROTATION_RESERVE_MS = 180;

export type RankedFetchSource = {
  label: string;
  sourceKind?: SourceKind;
  priority?: number;
  fetchPayload: (requestTimeoutMs: number) => Promise<MiroFactsPayload>;
};

export type SourceFetchAttempt = {
  label: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  error?: string;
};

export type RankedSourceSelectionResult = {
  payload: MiroFactsPayload;
  selected: string;
  attempts: SourceFetchAttempt[];
};

type SourceSelectionOptions = {
  rotationBudgetMs: number;
  failurePrefix: string;
  now?: Date;
};

function toSourceCandidate(
  source: RankedFetchSource,
  payload: MiroFactsPayload,
): SourceCandidate {
  const candidate: SourceCandidate = {
    label: source.label,
    payload,
  };

  if (source.sourceKind) {
    candidate.sourceKind = source.sourceKind;
  }

  if (source.priority !== undefined) {
    candidate.priority = source.priority;
  }

  return candidate;
}

export async function fetchRankedSuccessfulSource(
  sources: readonly RankedFetchSource[],
  options: SourceSelectionOptions,
): Promise<RankedSourceSelectionResult> {
  const attempts: SourceFetchAttempt[] = [];
  const startedAt = Date.now();

  const candidatePromises: Array<Promise<SourceCandidate | null>> = sources.map(
    async (source) => {
      const attemptStartedAt = Date.now();
      const remainingBudget = options.rotationBudgetMs - (Date.now() - startedAt);
      if (remainingBudget < SOURCE_ROTATION_MIN_BUDGET_MS) {
        attempts.push({
          label: source.label,
          status: "skipped",
          durationMs: Date.now() - attemptStartedAt,
          error: "rotation budget exhausted",
        });
        return null;
      }

      const sourceBudget = Math.max(
        SOURCE_ROTATION_MIN_BUDGET_MS,
        remainingBudget - SOURCE_ROTATION_RESERVE_MS,
      );

      try {
        const payload = await source.fetchPayload(sourceBudget);
        attempts.push({
          label: source.label,
          status: "success",
          durationMs: Date.now() - attemptStartedAt,
        });
        return toSourceCandidate(source, payload);
      } catch (error) {
        attempts.push({
          label: source.label,
          status: "failed",
          durationMs: Date.now() - attemptStartedAt,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
  );

  const candidates = (await Promise.all(candidatePromises)).filter(
    (candidate): candidate is SourceCandidate => candidate !== null,
  );

  if (candidates.length === 0) {
    const errors = attempts
      .map((attempt) => `${attempt.label}: ${attempt.error ?? attempt.status}`)
      .join(" | ");
    throw new Error(`${options.failurePrefix}. ${errors}`);
  }

  const selected = rankSourceCandidates(candidates, options.now)[0];
  if (!selected) {
    throw new Error(`${options.failurePrefix}. No ranked source candidate.`);
  }

  return {
    payload: {
      ...selected.payload,
      source: selected.payload.source,
      corroborating_sources: selected.payload.corroborating_sources,
    },
    selected: selected.label,
    attempts,
  };
}
