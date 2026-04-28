import type { MiroCategoryHint, MiroFactsPayload } from "../connectors";
import type {
  MiroDraftReview,
  MiroGatekeeperResult,
  MiroPost,
  MiroResearchBrief,
  MiroTrustConfidence,
} from "./types";

export function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function sanitizeOptionalText(value: unknown): string {
  const normalized = sanitizeText(value);
  return normalized === '""' ? "" : normalized;
}

function normalizeCategory(
  value: unknown,
  fallback: MiroCategoryHint,
): MiroCategoryHint {
  const normalized = sanitizeText(value);
  if (
    normalized === "Sports" ||
    normalized === "Markets" ||
    normalized === "Tech" ||
    normalized === "World"
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeConfidence(
  value: unknown,
  fallback: MiroTrustConfidence,
): MiroTrustConfidence {
  const normalized = sanitizeText(value).toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  return fallback;
}

export function parseJsonObject<T>(
  raw: string | null | undefined,
  stage: string,
): T {
  if (!raw) {
    throw new Error(`${stage} returned an empty body.`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "unknown parse error";
    throw new Error(
      `${stage} returned invalid JSON: ${reason}. Raw: ${raw.slice(0, 320)}`,
    );
  }
}

export function ensureGatekeeperResult(value: unknown): MiroGatekeeperResult {
  const candidate = value as Partial<MiroGatekeeperResult> | null | undefined;
  if (
    !candidate ||
    typeof candidate.is_safe !== "boolean" ||
    typeof candidate.reason !== "string"
  ) {
    throw new Error("Gatekeeper response does not match { is_safe, reason }.");
  }

  return {
    is_safe: candidate.is_safe,
    reason: candidate.reason.trim() || "No reason provided.",
  };
}

export function ensurePostShape(
  value: unknown,
  fallbackPayload: MiroFactsPayload,
  fallbackReasoning: string,
  fallbackConfidence: MiroTrustConfidence,
): MiroPost {
  const candidate = value as Partial<MiroPost> | null | undefined;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Generator response is not a JSON object.");
  }

  const observed = Array.isArray(candidate.observed)
    ? candidate.observed
        .map((item) => sanitizeText(item))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const minimumObserved = fallbackPayload.category_hint === "World" ? 1 : 2;
  const normalizedObserved =
    observed.length >= minimumObserved
      ? observed
      : fallbackPayload.facts
          .map((fact) => fact.trim())
          .filter(Boolean)
          .slice(0, 4);

  if (normalizedObserved.length < minimumObserved) {
    throw new Error("Generator response did not contain enough supported facts.");
  }

  return {
    title:
      sanitizeText(candidate.title) ||
      "Сегодняшний сдвиг оказался уже, чем шум вокруг него",
    source: sanitizeText(candidate.source) || fallbackPayload.source,
    observed: normalizedObserved,
    inferred:
      sanitizeText(candidate.inferred) ||
      "Фактов пока немного, но даже такой короткий сигнал уже задает настроение дня.",
    opinion:
      sanitizeOptionalText(candidate.opinion) ||
      sanitizeOptionalText(candidate.cross_signal) ||
      sanitizeText(candidate.reasoning) ||
      fallbackReasoning,
    cross_signal: sanitizeOptionalText(candidate.cross_signal),
    hypothesis: sanitizeOptionalText(candidate.hypothesis),
    telegram_text: sanitizeOptionalText(
      (candidate as { telegram_text?: unknown }).telegram_text,
    ),
    reasoning: sanitizeText(candidate.reasoning) || fallbackReasoning,
    confidence: normalizeConfidence(candidate.confidence, fallbackConfidence),
    category: normalizeCategory(candidate.category, fallbackPayload.category_hint),
  };
}

function normalizeStringList(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

export function ensureResearchBrief(value: unknown): MiroResearchBrief {
  const candidate = value as Partial<MiroResearchBrief> | null | undefined;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Research response is not a JSON object.");
  }

  const selectedFacts = normalizeStringList(candidate.selected_facts, 4);
  const risks = normalizeStringList(candidate.risks, 4);
  const confidence = normalizeConfidence(candidate.confidence, "medium");
  const focus = sanitizeText(candidate.focus);
  const whyItMatters = sanitizeText(candidate.why_it_matters);
  const pressure = sanitizeText(candidate.pressure);
  const editorialNote = sanitizeText(candidate.editorial_note);

  if (!focus || !whyItMatters || !pressure || !editorialNote || selectedFacts.length === 0) {
    throw new Error("Research response is missing required fields.");
  }

  return {
    focus,
    selected_facts: selectedFacts,
    why_it_matters: whyItMatters,
    pressure,
    risks,
    editorial_note: editorialNote,
    confidence,
  };
}

export function ensureDraftReview(value: unknown): MiroDraftReview {
  const candidate = value as Partial<MiroDraftReview> | null | undefined;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Review response is not a JSON object.");
  }

  const issues = normalizeStringList(candidate.issues, 5);
  const rewriteNote = sanitizeText(candidate.rewrite_note);
  const approved = Boolean(candidate.approved);

  if (!rewriteNote) {
    throw new Error("Review response is missing rewrite_note.");
  }

  return {
    approved,
    issues,
    rewrite_note: rewriteNote,
  };
}
