import Groq from "groq-sdk";

import {
  buildMiroEmotionAppraisal,
  buildTrustReasoning,
  confidenceFromAppraisal,
  summarizeEmotionAppraisal,
  summarizeMemoryContext,
  type MiroMemoryContext,
} from "./appraisal";
import {
  evaluateGatekeeperTimeoutFallback,
  evaluateHeuristicGatekeeper,
  runGatekeeper,
} from "./gatekeeper";
import { assessGeneratedDraft, runGenerator } from "./generator";
import { GATEKEEPER_RESERVE_MS, MAX_ITERATIONS, DEFAULT_TOTAL_TIMEOUT_MS, FINAL_RESPONSE_RESERVE_MS, createTraceId, pushEvidence, remainingBudget, withDeadline } from "./runtime";
import { focusPayloadForGeneration, validatePostQuality } from "./quality";
import { getGeneratorModelForTopic, getTopicTimeoutProfile, pickTopic } from "./topics";
import type {
  GroqChatClientLike,
  MiroAgentConstructorOptions,
  MiroAgentResult,
  MiroAgentRunOptions,
  MiroSelectionStrategy,
} from "./types";
import { getDefaultTopicForSchedule, getMiroScheduleDecision, getMiroUrgentWindowStatus } from "../miro-schedule";
import type { MiroFactsPayload } from "../connectors";

const DEFAULT_GATEKEEPER_MODEL =
  process?.env?.MIRO_GATEKEEPER_MODEL ?? "llama-3.1-8b-instant";
const DEFAULT_GENERATOR_MODEL =
  process?.env?.MIRO_GENERATOR_MODEL ?? "llama-3.3-70b-versatile";

const DEFAULT_SELECTION_STRATEGY: MiroSelectionStrategy =
  process?.env?.MIRO_TOPIC_STRATEGY === "random"
    ? "random"
    : process?.env?.MIRO_TOPIC_STRATEGY === "round_robin"
      ? "round_robin"
      : process?.env?.MIRO_TOPIC_STRATEGY === "urgent_override"
        ? "urgent_override"
        : "editorial_schedule";

function summarizeFacts(payload: MiroFactsPayload): string {
  return `${payload.source} -> ${payload.facts.slice(0, 2).join(" | ")}`;
}

function createEmptyMemoryContext(): MiroMemoryContext {
  return {
    recent_titles: [],
    active_motifs: [],
    active_fascinations: [],
    active_aversions: [],
    recent_categories: [],
  };
}

function buildRetryNote(rejectionReason: string, extraContext: string): string {
  const framing = rejectionReason.includes("voice consistency")
    ? "Previous draft slipped into assistant voice. Remove any helpful-assistant phrasing and keep the tone cold, specific, and self-possessed."
    : "Previous draft sounded generic, synthetic, or too cautious.";

  return `${framing} ${extraContext} Focus on one dominant detail only. If the facts do not belong to the same story, ignore the weaker ones. Keep the first sentence concrete, use a real first-person anchor, and end with a sharper forward line. If the facts show momentum, divergence, repetition, or pressure, hypothesis should not be empty.`;
}

export class MiroAgent {
  private readonly client: GroqChatClientLike;
  private readonly gatekeeperModel: string;
  private readonly generatorModel: string;
  private readonly defaultSelectionStrategy: MiroSelectionStrategy;

  constructor(options: MiroAgentConstructorOptions = {}) {
    const apiKey = options.apiKey ?? process?.env?.GROQ_API_KEY;
    if (!apiKey && !options.groqClient) {
      throw new Error("GROQ_API_KEY is required to run MiroAgent.");
    }

    this.client =
      options.groqClient ??
      (new Groq({ apiKey }) as unknown as GroqChatClientLike);
    this.gatekeeperModel = options.gatekeeperModel ?? DEFAULT_GATEKEEPER_MODEL;
    this.generatorModel = options.generatorModel ?? DEFAULT_GENERATOR_MODEL;
    this.defaultSelectionStrategy =
      options.selectionStrategy ?? DEFAULT_SELECTION_STRATEGY;
  }

  async run(options: MiroAgentRunOptions = {}): Promise<MiroAgentResult> {
    const startedAt = Date.now();
    const traceId = createTraceId();
    const evidence: MiroAgentResult["evidence"] = [];
    const logger = options.logger ?? console;
    const requestedTotalTimeoutMs =
      options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
    const selectionStrategy =
      options.selectionStrategy ?? this.defaultSelectionStrategy;
    const memoryContext = options.memoryContext ?? createEmptyMemoryContext();
    let iterations = 0;

    if (!options.forcedTopic && selectionStrategy === "editorial_schedule") {
      const scheduleDecision = getMiroScheduleDecision();

      if (scheduleDecision.kind === "quiet") {
        pushEvidence(
          evidence,
          traceId,
          "schedule_checked",
          "editorial_schedule",
          `quiet -> next ${scheduleDecision.next_slot.weekday_label} ${scheduleDecision.next_slot.local_time} (${scheduleDecision.next_slot.topic})`,
          "skipped",
          "weekend quiet window",
        );

        logger.log(
          `[MiroAgent] trace=${traceId} strategy=${selectionStrategy} quiet day -> next=${scheduleDecision.next_slot.topic}`,
        );

        return {
          status: "skipped",
          trace_id: traceId,
          reason: scheduleDecision.reason,
          evidence,
          runtime: {
            gatekeeper_model: this.gatekeeperModel,
            generator_model: this.generatorModel,
            selection_strategy: selectionStrategy,
            max_iterations: MAX_ITERATIONS,
            timeout_ms: requestedTotalTimeoutMs,
            elapsed_ms: Date.now() - startedAt,
          },
        };
      }

      pushEvidence(
        evidence,
        traceId,
        "schedule_checked",
        "editorial_schedule",
        `${scheduleDecision.slot.weekday_label} ${scheduleDecision.slot.local_time} -> ${scheduleDecision.slot.topic}`,
        "success",
        scheduleDecision.slot.track_label,
      );
    }

    if (selectionStrategy === "urgent_override") {
      const urgentStatus = getMiroUrgentWindowStatus();

      if (!urgentStatus.is_open) {
        pushEvidence(
          evidence,
          traceId,
          "urgent_window_checked",
          "urgent_override",
          `closed -> next ${urgentStatus.next_slot.weekday_label} ${urgentStatus.next_slot.local_time} (${urgentStatus.next_slot.topic})`,
          "skipped",
          "night quiet window",
        );

        logger.warn(
          `[MiroAgent] trace=${traceId} strategy=${selectionStrategy} skipped by urgent window: ${urgentStatus.reason}`,
        );

        return {
          status: "skipped",
          trace_id: traceId,
          topic: options.forcedTopic,
          reason: urgentStatus.reason,
          evidence,
          runtime: {
            gatekeeper_model: this.gatekeeperModel,
            generator_model: this.generatorModel,
            selection_strategy: selectionStrategy,
            max_iterations: MAX_ITERATIONS,
            timeout_ms: requestedTotalTimeoutMs,
            elapsed_ms: Date.now() - startedAt,
          },
        };
      }

      pushEvidence(
        evidence,
        traceId,
        "urgent_window_checked",
        "urgent_override",
        `open -> suggested ${urgentStatus.suggested_topic}`,
        "success",
        urgentStatus.reason,
      );
    }

    const topic = pickTopic(selectionStrategy, options.forcedTopic);

    pushEvidence(
      evidence,
      traceId,
      "topic_selected",
      `strategy=${selectionStrategy}`,
      `${topic.topic} (${topic.categoryLabel})`,
      "success",
    );

    logger.log(
      `[MiroAgent] trace=${traceId} topic=${topic.topic} strategy=${selectionStrategy}`,
    );

    const timeoutProfile = getTopicTimeoutProfile(topic.topic);
    const generatorModel = getGeneratorModelForTopic(
      topic.topic,
      this.generatorModel,
    );
    const totalTimeoutMs = options.totalTimeoutMs ?? timeoutProfile.totalTimeoutMs;

    iterations += 1;
    if (iterations > MAX_ITERATIONS) {
      throw new Error("MAX_ITERATIONS exceeded before connector execution.");
    }

    const connectorBudget = Math.min(
      remainingBudget(
        startedAt,
        totalTimeoutMs,
        timeoutProfile.connectorReserveMs,
        "connector execution",
      ),
      timeoutProfile.connectorCapMs,
    );

    const payload = await withDeadline(
      topic.fetchPayload(connectorBudget),
      connectorBudget,
      `${topic.topic} connector`,
    );

    pushEvidence(
      evidence,
      traceId,
      "facts_collected",
      topic.topic,
      summarizeFacts(payload),
      "success",
      `facts=${payload.facts.length}`,
    );

    pushEvidence(
      evidence,
      traceId,
      "memory_loaded",
      topic.topic,
      summarizeMemoryContext(memoryContext),
      "success",
      `recent_titles=${memoryContext.recent_titles.length}`,
    );

    iterations += 1;
    if (iterations > MAX_ITERATIONS) {
      throw new Error("MAX_ITERATIONS exceeded before gatekeeper execution.");
    }

    const heuristicGatekeeper = evaluateHeuristicGatekeeper(payload);
    let gatekeeperVerifier = heuristicGatekeeper
      ? "heuristic gatekeeper"
      : "json_object parsed";
    let gatekeeper = heuristicGatekeeper;

    if (!gatekeeper) {
      try {
        gatekeeper = await runGatekeeper(
          this.client,
          this.gatekeeperModel,
          payload,
          Math.min(
            remainingBudget(
              startedAt,
              totalTimeoutMs,
              GATEKEEPER_RESERVE_MS,
              "gatekeeper execution",
            ),
            timeoutProfile.gatekeeperCapMs,
          ),
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const timeoutFallback = evaluateGatekeeperTimeoutFallback(payload, reason);

        if (!timeoutFallback) {
          throw error;
        }

        gatekeeper = timeoutFallback;
        gatekeeperVerifier = "timeout fallback";
      }
    }

    pushEvidence(
      evidence,
      traceId,
      "gatekeeper_evaluated",
      summarizeFacts(payload),
      `${gatekeeper.is_safe ? "safe" : "blocked"}: ${gatekeeper.reason}`,
      gatekeeper.is_safe ? "success" : "skipped",
      gatekeeperVerifier,
    );

    if (!gatekeeper.is_safe) {
      logger.warn(
        `[MiroAgent] trace=${traceId} topic=${topic.topic} skipped by gatekeeper: ${gatekeeper.reason}`,
      );

      return {
        status: "skipped",
        trace_id: traceId,
        topic: topic.topic,
        payload,
        gatekeeper,
        reason: gatekeeper.reason,
        evidence,
        runtime: {
          gatekeeper_model: this.gatekeeperModel,
          generator_model: generatorModel,
          selection_strategy: selectionStrategy,
          max_iterations: MAX_ITERATIONS,
          timeout_ms: totalTimeoutMs,
          elapsed_ms: Date.now() - startedAt,
        },
      };
    }

    iterations += 1;
    if (iterations > MAX_ITERATIONS) {
      throw new Error("MAX_ITERATIONS exceeded before post generation.");
    }

    const generationPayload = focusPayloadForGeneration(payload, topic.topic);
    const emotionalAppraisal = buildMiroEmotionAppraisal(
      generationPayload,
      topic.topic,
    );

    pushEvidence(
      evidence,
      traceId,
      "emotion_appraised",
      summarizeFacts(generationPayload),
      summarizeEmotionAppraisal(emotionalAppraisal),
      emotionalAppraisal.should_publish ? "success" : "skipped",
      emotionalAppraisal.voice_notes.join(" | "),
    );

    if (!emotionalAppraisal.should_publish) {
      logger.warn(
        `[MiroAgent] trace=${traceId} topic=${topic.topic} skipped by silence gate: ${emotionalAppraisal.silence_reason}`,
      );

      return {
        status: "skipped",
        trace_id: traceId,
        topic: topic.topic,
        payload,
        gatekeeper,
        reason:
          emotionalAppraisal.silence_reason ??
          "signal too weak for a real Miro thought",
        evidence,
        runtime: {
          gatekeeper_model: this.gatekeeperModel,
          generator_model: generatorModel,
          selection_strategy: selectionStrategy,
          max_iterations: MAX_ITERATIONS,
          timeout_ms: totalTimeoutMs,
          elapsed_ms: Date.now() - startedAt,
        },
        };
    }

    logger.log("Post passed gatekeeper, generating...");
    logger.log(
      `[MiroAgent] trace=${traceId} topic=${topic.topic} passed gatekeeper and silence gate`,
    );

    const draftBudget = Math.min(
      remainingBudget(
        startedAt,
        totalTimeoutMs,
        FINAL_RESPONSE_RESERVE_MS,
        "post generation",
      ),
      timeoutProfile.generatorCapMs,
    );

    let fallbackReasoning = buildTrustReasoning(
      generationPayload,
      emotionalAppraisal,
      gatekeeper,
      topic.topic,
    );
    let fallbackConfidence = confidenceFromAppraisal(emotionalAppraisal);

    let post = await runGenerator({
      client: this.client,
      model: generatorModel,
      payload: generationPayload,
      targetLanguage: options.targetLanguage ?? "ru",
      timeoutMs: draftBudget,
      maxTokens: timeoutProfile.generatorMaxTokens,
      emotionalAppraisal,
      memoryContext,
      fallbackReasoning,
      fallbackConfidence,
    });

    let draftAssessment = assessGeneratedDraft(post);
    let rejectionReason =
      draftAssessment.reason ??
      validatePostQuality(post, generationPayload, topic.topic, emotionalAppraisal);

    if (rejectionReason) {
      pushEvidence(
        evidence,
        traceId,
        draftAssessment.reason
          ? "voice_consistency_rejected"
          : "post_quality_rejected",
        summarizeFacts(generationPayload),
        `${post.title}: ${rejectionReason}`,
        "skipped",
        "retrying with tighter focus",
      );

      iterations += 1;
      if (iterations > MAX_ITERATIONS) {
        throw new Error("MAX_ITERATIONS exceeded before post regeneration.");
      }

      const retryPayload = focusPayloadForGeneration(payload, topic.topic, "retry");
      const retryGeneratorBudget = Math.min(
        remainingBudget(
          startedAt,
          totalTimeoutMs,
          FINAL_RESPONSE_RESERVE_MS,
          "post regeneration",
        ),
        timeoutProfile.generatorCapMs,
      );

      fallbackReasoning = buildTrustReasoning(
        retryPayload,
        emotionalAppraisal,
        gatekeeper,
        topic.topic,
      );
      fallbackConfidence = confidenceFromAppraisal(emotionalAppraisal);

      post = await runGenerator({
        client: this.client,
        model: generatorModel,
        payload: retryPayload,
        targetLanguage: options.targetLanguage ?? "ru",
        timeoutMs: retryGeneratorBudget,
        maxTokens: timeoutProfile.generatorMaxTokens,
        emotionalAppraisal,
        memoryContext,
        fallbackReasoning,
        fallbackConfidence,
        generationNote: buildRetryNote(
          rejectionReason,
          summarizeMemoryContext(memoryContext),
        ),
      });

      draftAssessment = assessGeneratedDraft(post);
      rejectionReason =
        draftAssessment.reason ??
        validatePostQuality(post, retryPayload, topic.topic, emotionalAppraisal);

      if (rejectionReason) {
        pushEvidence(
          evidence,
          traceId,
          draftAssessment.reason
            ? "voice_consistency_rejected"
            : "post_quality_rejected",
          summarizeFacts(retryPayload),
          `${post.title}: ${rejectionReason}`,
          "skipped",
          "quality gate after retry",
        );

        return {
          status: "skipped",
          trace_id: traceId,
          topic: topic.topic,
          payload,
          gatekeeper,
          reason: rejectionReason,
          evidence,
          runtime: {
            gatekeeper_model: this.gatekeeperModel,
            generator_model: generatorModel,
            selection_strategy: selectionStrategy,
            max_iterations: MAX_ITERATIONS,
            timeout_ms: totalTimeoutMs,
            elapsed_ms: Date.now() - startedAt,
          },
        };
      }
    }

    pushEvidence(
      evidence,
      traceId,
      "post_generated",
      summarizeFacts(generationPayload),
      `${post.category}: ${post.title} [${post.confidence}]`,
      "success",
      "json_object parsed and normalized",
    );

    logger.log(
      `[MiroAgent] trace=${traceId} topic=${topic.topic} generated post="${post.title}" confidence=${post.confidence}`,
    );

    return {
      status: "generated",
      trace_id: traceId,
      topic: topic.topic,
      payload,
      gatekeeper,
      post,
      evidence,
      runtime: {
        gatekeeper_model: this.gatekeeperModel,
        generator_model: generatorModel,
        selection_strategy: selectionStrategy,
        max_iterations: MAX_ITERATIONS,
        timeout_ms: totalTimeoutMs,
        elapsed_ms: Date.now() - startedAt,
      },
    };
  }
}
