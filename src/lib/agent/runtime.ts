import type { MiroEvidenceRecord } from "./types";

export const AGENT_ID = "miro-agent";
export const MAX_ITERATIONS = 4;
export const DEFAULT_TOTAL_TIMEOUT_MS = 9_500;
export const GATEKEEPER_RESERVE_MS = 2_000;
export const FINAL_RESPONSE_RESERVE_MS = 300;
export const MIN_LLM_PIPELINE_BUDGET_MS = 3_000;

export function timestamp(): string {
  return new Date().toISOString();
}

export function createTraceId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `miro_${Date.now()}_${random}`;
}

export function withDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${stage} exceeded the ${timeoutMs}ms deadline.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function remainingBudget(
  startedAt: number,
  totalTimeoutMs: number,
  reserveMs: number,
  stage: string,
): number {
  const elapsed = Date.now() - startedAt;
  const remaining = totalTimeoutMs - elapsed - reserveMs;

  if (remaining <= 250) {
    throw new Error(`Time budget exhausted before ${stage}.`);
  }

  return remaining;
}

export function ensureRemainingBudget(
  startedAt: number,
  totalTimeoutMs: number,
  requiredMs: number,
  stage: string,
): number {
  const remaining = totalTimeoutMs - (Date.now() - startedAt);

  if (remaining < requiredMs) {
    throw new Error(
      `Time budget exhausted before ${stage}. Remaining ${remaining}ms is below the required ${requiredMs}ms.`,
    );
  }

  return remaining;
}

export function pushEvidence(
  evidence: MiroEvidenceRecord[],
  traceId: string,
  action: string,
  inputSummary: string,
  outputSummary: string,
  status: MiroEvidenceRecord["status"],
  verifierResult?: string,
): void {
  evidence.push({
    trace_id: traceId,
    agent_id: AGENT_ID,
    action,
    input_summary: inputSummary,
    output_summary: outputSummary,
    timestamp: timestamp(),
    status,
    verifier_result: verifierResult,
  });
}
