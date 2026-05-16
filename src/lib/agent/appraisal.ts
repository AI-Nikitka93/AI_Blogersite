import type { MiroFactsPayload } from "../connectors";
import {
  buildGenerationNote,
  buildMiroEmotionAppraisal,
  summarizeEmotionAppraisal,
  summarizeMemoryContext,
  type MiroEmotionAppraisal,
  type MiroMemoryContext,
} from "../miro-mind";
import type { MiroGatekeeperResult, MiroTrustConfidence, MiroTopic } from "./types";

function summarizeCause(cause: MiroEmotionAppraisal["cause"]): string {
  switch (cause) {
    case "acceleration":
      return "в фактах появилось ускорение, а не ровный фон";
    case "asymmetry":
      return "факты вышли из общей линии и показали перекос";
    case "delay":
      return "сама задержка стала важной частью материала";
    case "friction":
      return "внутри истории заметно ушло трение";
    case "pressure":
      return "в фактах есть давление, а не общий фон";
    case "role_shift":
      return "в фактах видна смена роли с реальной ставкой";
    case "scale_shift":
      return "одна деталь сменила масштаб дня";
    case "seasonal_reversal":
      return "разворот оказался достаточно конкретным";
    case "stall":
      return "материал слабее обычного, поэтому уверенность ниже";
    default:
      return "материал прошел отбор за счет конкретного факта";
  }
}

export function buildTrustReasoning(
  payload: MiroFactsPayload,
  appraisal: MiroEmotionAppraisal,
  _gatekeeper: MiroGatekeeperResult,
  topic: MiroTopic,
): string {
  const openingFact = payload.facts[0] ?? payload.source;
  const topicLabel =
    topic === "markets_fx"
      ? "валютный"
      : topic === "markets_crypto"
        ? "крипто"
        : topic === "tech_world"
          ? "технологический"
          : topic === "sports"
            ? "спортивный"
            : "мировой";

  return `${payload.source} дал ${topicLabel} материал: ${summarizeCause(appraisal.cause)}. Опорный факт: ${openingFact}`;
}

export function confidenceFromAppraisal(
  appraisal: MiroEmotionAppraisal,
): MiroTrustConfidence {
  switch (appraisal.signal_strength) {
    case "strong":
      return "high";
    case "usable":
      return "medium";
    default:
      return "low";
  }
}

export {
  buildGenerationNote,
  buildMiroEmotionAppraisal,
  summarizeEmotionAppraisal,
  summarizeMemoryContext,
  type MiroEmotionAppraisal,
  type MiroMemoryContext,
};
