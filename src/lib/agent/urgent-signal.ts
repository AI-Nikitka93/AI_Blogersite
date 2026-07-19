import type { MiroFactsPayload } from "../connectors";
import type { MiroTopic } from "./types";

export const URGENT_SIGNAL_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type UrgentSignalAssessment = {
  isUrgent: boolean;
  reason: string;
};

function getPayloadTimestamp(payload: MiroFactsPayload): number | null {
  const raw = payload.source_published_at ?? payload.event_date;
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isFreshEnough(payload: MiroFactsPayload, now: Date): boolean {
  const publishedAt = getPayloadTimestamp(payload);
  if (publishedAt === null) {
    return false;
  }

  const age = now.getTime() - publishedAt;
  return age >= -15 * 60 * 1000 && age <= URGENT_SIGNAL_MAX_AGE_MS;
}

const MAJOR_SPORTS_EVENT = /(?:world\s+cup|fifa|чм(?:-?20\d{2})?|чемпионат\s+мира)/iu;
const DECISIVE_SPORTS_RESULT = /(?:финал|полуфинал|1\/2|матч\s+за\s+3|score\s+was|счет(?:ом)?\s+\d|обыграл|победил|won|beat)/iu;
const CRITICAL_TECH_INCIDENT = /(?:critical\s+vulnerabilit|zero-?day|major\s+outage|service\s+disruption|security\s+incident|критическ\p{L}*\s+уязвим|нулевого\s+дня|масштабн\p{L}*\s+сбо|недоступн\p{L}*\s+сервис|инцидент\s+безопасност)/iu;
const HIGH_IMPACT_WORLD_EVENT = /(?:tsunami|volcanic\s+eruption|earthquake\s+(?:of|magnitude)|asteroid\s+(?:alert|impact)|solar\s+storm|цунами|извержени\p{L}*\s+вулкан|землетрясени\p{L}*\s+(?:магнитуд|сил)|астероид\p{L}*\s+(?:угроз|сближ)|солнечн\p{L}*\s+бур)/iu;

export function assessUrgentSignal(
  topic: MiroTopic,
  payload: MiroFactsPayload,
  now = new Date(),
): UrgentSignalAssessment {
  if (!isFreshEnough(payload, now)) {
    return {
      isUrgent: false,
      reason: "urgent scan skipped: source event is missing a fresh timestamp",
    };
  }

  const text = [payload.source, ...payload.facts].join(" ");

  if (
    topic === "sports" &&
    MAJOR_SPORTS_EVENT.test(text) &&
    DECISIVE_SPORTS_RESULT.test(text)
  ) {
    return {
      isUrgent: true,
      reason: "fresh decisive result from a major sports tournament",
    };
  }

  if (topic === "tech_world" && CRITICAL_TECH_INCIDENT.test(text)) {
    return {
      isUrgent: true,
      reason: "fresh critical technology incident",
    };
  }

  if (topic === "world" && HIGH_IMPACT_WORLD_EVENT.test(text)) {
    return {
      isUrgent: true,
      reason: "fresh high-impact non-political world event",
    };
  }

  return {
    isUrgent: false,
    reason: "urgent scan skipped: no high-confidence urgent signal",
  };
}
