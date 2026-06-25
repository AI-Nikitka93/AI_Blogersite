import type { MiroCategoryHint, MiroFactsPayload } from "../connectors";
import type {
  MiroDraftReview,
  MiroGatekeeperResult,
  MiroPost,
  MiroResearchBrief,
  MiroTrustConfidence,
} from "./types";

const MIXED_CYRILLIC_HOMOGLYPHS: Record<string, string> = {
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
};

function normalizeMixedCyrillicHomoglyphs(value: string): string {
  return value.replace(/[A-Za-zА-Яа-яЁёІіЎў]+/gu, (token) => {
    if (!/[A-Za-z]/.test(token) || !/[А-Яа-яЁёІіЎў]/u.test(token)) {
      return token;
    }

    return token.replace(
      /[ABCEHKMOPTXYaceopxy]/g,
      (char) => MIXED_CYRILLIC_HOMOGLYPHS[char] ?? char,
    );
  });
}

export function sanitizeText(value: unknown): string {
  return typeof value === "string"
    ? normalizeMixedCyrillicHomoglyphs(value.trim())
    : "";
}

export function sanitizeOptionalText(value: unknown): string {
  const normalized = sanitizeText(value);
  return normalized === '""' ? "" : normalized;
}

function stripMarkdownCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();
}

function stripThinkBlocks(value: string): string {
  return value.replace(/<think\b[^>]*>[\s\S]*?<\/think>/giu, "").trim();
}

function extractAfterLeadingThinkBlock(value: string): string {
  const normalized = value.trim();

  if (!/^<think\b/iu.test(normalized)) {
    return normalized;
  }

  const closingTag = normalized.toLowerCase().lastIndexOf("</think>");
  if (closingTag === -1) {
    return "";
  }

  return normalized.slice(closingTag + "</think>".length).trim();
}

function extractBalancedJsonObject(value: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (start === -1) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(start, index + 1);
      }
    }
  }

  return null;
}

function buildJsonParseCandidates(raw: string): string[] {
  const normalized = raw.replace(/^\uFEFF/u, "").trim();
  const hasThinkTag = /<think\b/iu.test(normalized);
  const afterLeadingThinkBlock = extractAfterLeadingThinkBlock(normalized);
  const thinkSafeSource = afterLeadingThinkBlock
    ? afterLeadingThinkBlock
    : hasThinkTag && /^<think\b/iu.test(normalized)
      ? ""
      : stripThinkBlocks(normalized);
  const thinkSafeNormalized = stripMarkdownCodeFence(thinkSafeSource);
  const regexCandidate = thinkSafeNormalized.match(/\{[\s\S]*\}/u)?.[0] ?? "";
  const balancedCandidate = extractBalancedJsonObject(thinkSafeNormalized) ?? "";
  const rawRegexCandidate = hasThinkTag
    ? ""
    : normalized.match(/\{[\s\S]*\}/u)?.[0] ?? "";
  const rawBalancedCandidate = hasThinkTag
    ? ""
    : extractBalancedJsonObject(normalized) ?? "";

  return Array.from(
    new Set(
      [
        normalized,
        stripMarkdownCodeFence(normalized),
        thinkSafeNormalized,
        regexCandidate,
        balancedCandidate,
        rawRegexCandidate,
        rawBalancedCandidate,
      ].filter(Boolean),
    ),
  );
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

  const candidates = buildJsonParseCandidates(raw);
  const failures: string[] = [];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "unknown parse error";
      failures.push(`${reason} :: ${candidate.slice(0, 120)}`);
    }
  }

  throw new Error(
    `${stage} returned invalid JSON after sanitization. Raw: ${raw.slice(0, 320)}. Attempts: ${failures.slice(0, 3).join(" | ")}`,
  );
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
  const payloadFacts = fallbackPayload.facts
    .map((fact) => fact.trim())
    .filter(Boolean)
    .slice(0, 4);

  const minimumObserved = fallbackPayload.category_hint === "Markets" ? 2 : 1;
  const normalizedObserved =
    payloadFacts.length === 1
      ? (observed[0] ? [observed[0]] : payloadFacts)
      : observed.length >= minimumObserved
      ? observed
      : payloadFacts;

  if (normalizedObserved.length < minimumObserved) {
    throw new Error("Generator response did not contain enough supported facts.");
  }

  return {
    title:
      sanitizeText(candidate.title) ||
      "Сегодняшний материал оказался точнее общего фона",
    source: sanitizeText(candidate.source) || fallbackPayload.source,
    source_url: sanitizeOptionalText(fallbackPayload.source_url),
    source_published_at: sanitizeOptionalText(fallbackPayload.source_published_at),
    event_date: sanitizeOptionalText(fallbackPayload.event_date),
    corroborating_sources: fallbackPayload.corroborating_sources,
    observed: normalizedObserved,
    inferred:
      sanitizeText(candidate.inferred) ||
      "Фактов пока немного, но этого достаточно для короткой записи с ясной границей вывода.",
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
  const approved = Boolean(candidate.approved);
  let rewriteNote = sanitizeText(candidate.rewrite_note);

  if (!rewriteNote) {
    if (approved) {
      rewriteNote = "Approved without changes.";
    } else {
      throw new Error("Review response is missing rewrite_note.");
    }
  }

  return {
    approved,
    issues,
    rewrite_note: rewriteNote,
  };
}
