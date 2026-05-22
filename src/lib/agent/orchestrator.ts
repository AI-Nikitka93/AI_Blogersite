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
import {
  createMiroChatClient,
  inferProviderFromModel,
  resolveMiroLlmProvider,
} from "./clients";
import { assessGeneratedDraft, runGenerator } from "./generator";
import { runResearch } from "./research";
import { runDraftReview } from "./review";
import {
  focusPayloadForGeneration,
  validatePostQuality,
  looksLikeRawEnglishSentence,
} from "./quality";
import {
  createTraceId,
  DEFAULT_TOTAL_TIMEOUT_MS,
  ensureRemainingBudget,
  FINAL_RESPONSE_RESERVE_MS,
  GATEKEEPER_RESERVE_MS,
  MIN_LLM_PIPELINE_BUDGET_MS,
  MAX_ITERATIONS,
  pushEvidence,
  remainingBudget,
  withDeadline,
} from "./runtime";
import {
  getGeneratorModelForTopic,
  getTopicTimeoutProfile,
  pickTopic,
} from "./topics";
import type {
  MiroAgentConstructorOptions,
  MiroAgentGeneratedResult,
  MiroAgentResult,
  MiroAgentRunOptions,
  MiroAgentRuntimeSummary,
  MiroAgentSkippedResult,
  MiroDraftReview,
  MiroLlmProvider,
  MiroEvidenceRecord,
  MiroPost,
  MiroResearchBrief,
  MiroTopic,
  GroqChatClientLike,
} from "./types";
import { getMiroScheduleDecision, getMiroUrgentWindowStatus } from "../miro-schedule";
import type { MiroFactsPayload } from "../connectors";
import { coerceEnglishFactToRussianFallback } from "../fact-localization";

const DEFAULT_SELECTION_STRATEGY =
  process?.env?.MIRO_TOPIC_STRATEGY === "random"
    ? "random"
    : process?.env?.MIRO_TOPIC_STRATEGY === "round_robin"
      ? "round_robin"
      : process?.env?.MIRO_TOPIC_STRATEGY === "urgent_override"
        ? "urgent_override"
        : "editorial_schedule";

function getDefaultGatekeeperModel(provider: MiroLlmProvider): string {
  if (provider === "nvidia") {
    return (
      process?.env?.MIRO_NVIDIA_GATEKEEPER_MODEL ??
      process?.env?.MIRO_NVIDIA_MODEL ??
      "openai/gpt-oss-20b"
    );
  }

  if (provider === "openrouter") {
    return (
      process?.env?.MIRO_OPENROUTER_GATEKEEPER_MODEL ??
      process?.env?.MIRO_OPENROUTER_MODEL ??
      "qwen/qwen3-next-80b-a3b-instruct:free"
    );
  }

  return process?.env?.MIRO_GATEKEEPER_MODEL ?? "llama-3.3-70b-versatile";
}

function getDefaultGeneratorModel(provider: MiroLlmProvider): string {
  if (provider === "nvidia") {
    return process?.env?.MIRO_NVIDIA_MODEL ?? "openai/gpt-oss-20b";
  }

  if (provider === "openrouter") {
    return (
      process?.env?.MIRO_OPENROUTER_MODEL ??
      "qwen/qwen3-next-80b-a3b-instruct:free"
    );
  }

  return (
    process?.env?.MIRO_WRITER_MODEL ??
    process?.env?.MIRO_GENERATOR_MODEL ??
    "llama-3.3-70b-versatile"
  );
}

function resolveRoleProvider(
  explicitProvider: MiroLlmProvider | undefined,
  fallbackProvider: MiroLlmProvider,
  roleEnvKey:
    | "MIRO_GATEKEEPER_PROVIDER"
    | "MIRO_RESEARCH_PROVIDER"
    | "MIRO_WRITER_PROVIDER"
    | "MIRO_REVIEW_PROVIDER",
  configuredModel?: string,
): MiroLlmProvider {
  const fromEnv = process?.env?.[roleEnvKey]?.trim();
  const inferredProvider = inferProviderFromModel(configuredModel);
  const requestedProvider =
    fromEnv === "groq" || fromEnv === "nvidia" || fromEnv === "openrouter"
      ? fromEnv
      : explicitProvider ?? inferredProvider ?? fallbackProvider;

  return resolveMiroLlmProvider(requestedProvider);
}

function isModelCompatibleWithProvider(
  provider: MiroLlmProvider,
  model: string | undefined,
): boolean {
  const normalized = model?.trim();

  if (!normalized) {
    return false;
  }

  if (provider === "groq") {
    return (
      normalized.startsWith("llama-") ||
      normalized.startsWith("openai/gpt-oss-") ||
      !normalized.includes("/")
    );
  }

  if (provider === "nvidia") {
    return normalized.includes("/") || normalized.startsWith("meta/");
  }

  return true;
}

function resolveConfiguredModel(
  provider: MiroLlmProvider,
  configuredModel: string | undefined,
  defaultModel: string,
): string {
  return isModelCompatibleWithProvider(provider, configuredModel)
    ? configuredModel!.trim()
    : defaultModel.trim();
}

function getDefaultResearchModel(provider: MiroLlmProvider): string {
  if (provider === "nvidia") {
    return process?.env?.MIRO_NVIDIA_MODEL ?? "openai/gpt-oss-20b";
  }

  if (provider === "openrouter") {
    return (
      process?.env?.MIRO_OPENROUTER_MODEL ??
      "qwen/qwen3-next-80b-a3b-instruct:free"
    );
  }

  return process?.env?.MIRO_RESEARCH_MODEL ?? "llama-3.3-70b-versatile";
}

function getDefaultReviewModel(provider: MiroLlmProvider): string {
  if (provider === "nvidia") {
    return process?.env?.MIRO_REVIEW_MODEL ?? process?.env?.MIRO_NVIDIA_GATEKEEPER_MODEL ?? process?.env?.MIRO_NVIDIA_MODEL ?? "openai/gpt-oss-20b";
  }

  if (provider === "openrouter") {
    return process?.env?.MIRO_REVIEW_MODEL ?? process?.env?.MIRO_OPENROUTER_GATEKEEPER_MODEL ?? process?.env?.MIRO_OPENROUTER_MODEL ?? "qwen/qwen3-next-80b-a3b-instruct:free";
  }

  return process?.env?.MIRO_REVIEW_MODEL ?? process?.env?.MIRO_GATEKEEPER_MODEL ?? "llama-3.3-70b-versatile";
}

function buildRuntimeSummary(input: {
  startedAt: number;
  llmProvider: MiroLlmProvider;
  researchProvider: MiroLlmProvider;
  researchModel: string;
  gatekeeperProvider: MiroLlmProvider;
  writerProvider: MiroLlmProvider;
  writerModel: string;
  reviewProvider: MiroLlmProvider;
  reviewModel: string;
  gatekeeperModel: string;
  generatorModel: string;
  selectionStrategy: MiroAgentRuntimeSummary["selection_strategy"];
  timeoutMs: number;
}): MiroAgentRuntimeSummary {
  return {
    llm_provider: input.llmProvider,
    research_provider: input.researchProvider,
    research_model: input.researchModel,
    gatekeeper_provider: input.gatekeeperProvider,
    writer_provider: input.writerProvider,
    writer_model: input.writerModel,
    review_provider: input.reviewProvider,
    review_model: input.reviewModel,
    gatekeeper_model: input.gatekeeperModel,
    generator_model: input.generatorModel,
    selection_strategy: input.selectionStrategy,
    max_iterations: MAX_ITERATIONS,
    timeout_ms: input.timeoutMs,
    elapsed_ms: Date.now() - input.startedAt,
  };
}

function summarizeFacts(payload: MiroFactsPayload): string {
  return `${payload.source} (${payload.category_hint}) :: ${payload.facts.join(" | ")}`;
}

function buildRetryInstruction(
  memoryContext: MiroMemoryContext,
  rejectionReason?: string,
): string {
  const memorySummary = summarizeMemoryContext(memoryContext);
  return [
    "Previous draft sounded generic, synthetic, too cautious, or too service-like.",
    rejectionReason ? `Fix this rejection exactly: ${rejectionReason}.` : "",
    "Focus on one dominant concrete detail only.",
    "If the facts do not belong to the same story, ignore the weaker lines.",
    "The inferred field must read as a publication-ready news article: lead, consequence, context, limits, and next check.",
    "Do not use first person or self-process language: no я, мне, меня, для меня, я бы, or меня здесь.",
    "For market posts, do not use investor, advice, or trading language: no инвестор, инвестировать, инвесторы должны, вход, позиция, портфель, покупать, продавать, держать, сделка, ставка, стоит обратить внимание, or наблюдайте за.",
    "Keep the first sentence factual and narrow.",
    "End with a sharper forward line when the signal shows pressure, divergence, repetition, or acceleration.",
    memorySummary ? `Memory pressure: ${memorySummary}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function combineQualityOutcome(
  assessmentReason: string | null,
  qualityReason: string | null,
): string | null {
  return assessmentReason ?? qualityReason;
}

function summarizeResearchBrief(brief: MiroResearchBrief): string {
  return `${brief.focus} :: ${brief.confidence} :: ${brief.selected_facts.join(" | ")}`;
}

function summarizeReview(review: MiroDraftReview): string {
  return `${review.approved ? "approved" : "rejected"} :: ${review.issues.join(" | ") || "no issues"}`;
}

function buildFallbackResearchBrief(
  payload: MiroFactsPayload,
  topic: MiroTopic,
): MiroResearchBrief {
  const selectedFacts = payload.facts.slice(0, topic === "world" ? 1 : 3);
  const firstFact = selectedFacts[0] ?? payload.facts[0] ?? payload.source;

  return {
    focus: `${payload.category_hint} signal from ${payload.source}`,
    selected_facts: selectedFacts,
    why_it_matters: `The signal stays narrow enough to publish because it still points at ${firstFact}.`,
    pressure:
      topic === "sports"
        ? "The pressure comes from result, streak, or role change inside the match."
        : topic === "markets_fx" || topic === "markets_crypto"
          ? "The pressure comes from asymmetry in the movement, not from the level alone."
          : "The pressure comes from a concrete technical or world event rather than a broad trend.",
    risks: [
      "Research model timed out, so the brief fell back to deterministic fact selection.",
    ],
    editorial_note: "Fallback research brief built from connector facts.",
    confidence: topic === "world" ? "low" : "medium",
  };
}

export class MiroAgent {
  private readonly client: GroqChatClientLike;
  private readonly provider: MiroLlmProvider;
  private readonly gatekeeperProvider: MiroLlmProvider;
  private readonly gatekeeperClient: GroqChatClientLike;
  private readonly researchProvider: MiroLlmProvider;
  private readonly researchClient: GroqChatClientLike;
  private readonly researchModel: string;
  private readonly writerProvider: MiroLlmProvider;
  private readonly writerClient: GroqChatClientLike;
  private readonly writerModel: string;
  private readonly reviewProvider: MiroLlmProvider;
  private readonly reviewClient: GroqChatClientLike;
  private readonly reviewModel: string;
  private readonly gatekeeperModel: string;
  private readonly generatorModel: string;
  private readonly defaultSelectionStrategy: MiroAgentRuntimeSummary["selection_strategy"];

  constructor(options: MiroAgentConstructorOptions = {}) {
    this.provider = resolveMiroLlmProvider(options.provider);
    this.writerProvider = resolveRoleProvider(
      options.provider,
      this.provider,
      "MIRO_WRITER_PROVIDER",
      options.generatorModel ?? process?.env?.MIRO_WRITER_MODEL,
    );
    this.writerModel = resolveConfiguredModel(
      this.writerProvider,
      options.generatorModel ?? process?.env?.MIRO_WRITER_MODEL,
      getDefaultGeneratorModel(this.writerProvider),
    );
    this.client = createMiroChatClient({
      provider: this.writerProvider,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      chatClient: options.chatClient,
      groqClient: options.groqClient,
    }) as GroqChatClientLike;
    this.writerClient = this.client;
    this.gatekeeperProvider = resolveRoleProvider(
      options.gatekeeperProvider,
      this.provider,
      "MIRO_GATEKEEPER_PROVIDER",
      options.gatekeeperModel ?? process?.env?.MIRO_GATEKEEPER_MODEL,
    );
    this.gatekeeperModel = resolveConfiguredModel(
      this.gatekeeperProvider,
      options.gatekeeperModel ?? process?.env?.MIRO_GATEKEEPER_MODEL,
      getDefaultGatekeeperModel(this.gatekeeperProvider),
    );
    this.gatekeeperClient = createMiroChatClient({
      provider: this.gatekeeperProvider,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      chatClient: options.chatClient,
      groqClient: options.groqClient,
    }) as GroqChatClientLike;
    this.researchProvider = resolveRoleProvider(
      options.researchProvider,
      this.writerProvider,
      "MIRO_RESEARCH_PROVIDER",
      options.researchModel ?? process?.env?.MIRO_RESEARCH_MODEL,
    );
    this.researchModel = resolveConfiguredModel(
      this.researchProvider,
      options.researchModel ?? process?.env?.MIRO_RESEARCH_MODEL,
      getDefaultResearchModel(this.researchProvider),
    );
    this.researchClient = createMiroChatClient({
      provider: this.researchProvider,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      chatClient: options.chatClient,
      groqClient: options.groqClient,
      preserveReasoning: true,
    }) as GroqChatClientLike;
    this.reviewProvider = resolveRoleProvider(
      options.reviewProvider,
      this.writerProvider,
      "MIRO_REVIEW_PROVIDER",
      options.reviewModel ?? process?.env?.MIRO_REVIEW_MODEL,
    );
    this.reviewModel = resolveConfiguredModel(
      this.reviewProvider,
      options.reviewModel ?? process?.env?.MIRO_REVIEW_MODEL,
      getDefaultReviewModel(this.reviewProvider),
    );
    this.reviewClient = createMiroChatClient({
      provider: this.reviewProvider,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      chatClient: options.chatClient,
      groqClient: options.groqClient,
    }) as GroqChatClientLike;
    this.generatorModel = this.writerModel;
    this.defaultSelectionStrategy =
      options.selectionStrategy ?? DEFAULT_SELECTION_STRATEGY;
  }

  async run(options: MiroAgentRunOptions = {}): Promise<MiroAgentResult> {
    const startedAt = Date.now();
    const traceId = createTraceId();
    const evidence: MiroEvidenceRecord[] = [];
    const logger = options.logger ?? console;
    const requestedTotalTimeoutMs =
      options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
    const selectionStrategy =
      options.selectionStrategy ?? this.defaultSelectionStrategy;
    const memoryContext = options.memoryContext ?? {
      recent_titles: [],
      active_motifs: [],
      active_fascinations: [],
      active_aversions: [],
      recent_categories: [],
    };
    let iterations = 0;
    const buildStructuredSkip = (input: {
      topic: MiroTopic;
      payload: MiroFactsPayload;
      gatekeeper?: MiroAgentSkippedResult["gatekeeper"];
      reason: string;
      generatorModel?: string;
    }): MiroAgentSkippedResult => ({
      status: "skipped",
      trace_id: traceId,
      topic: input.topic,
      payload: input.payload,
      gatekeeper: input.gatekeeper,
      reason: input.reason,
      evidence,
      runtime: buildRuntimeSummary({
        startedAt,
        llmProvider: this.writerProvider,
        researchProvider: this.researchProvider,
        researchModel: this.researchModel,
        gatekeeperProvider: this.gatekeeperProvider,
        writerProvider: this.writerProvider,
        writerModel: this.writerModel,
        reviewProvider: this.reviewProvider,
        reviewModel: this.reviewModel,
        gatekeeperModel: this.gatekeeperModel,
        generatorModel: input.generatorModel ?? this.generatorModel,
        selectionStrategy,
        timeoutMs: requestedTotalTimeoutMs,
      }),
    });

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
          runtime: buildRuntimeSummary({
            startedAt,
            llmProvider: this.writerProvider,
            researchProvider: this.researchProvider,
            researchModel: this.researchModel,
            gatekeeperProvider: this.gatekeeperProvider,
            writerProvider: this.writerProvider,
            writerModel: this.writerModel,
            reviewProvider: this.reviewProvider,
            reviewModel: this.reviewModel,
            gatekeeperModel: this.gatekeeperModel,
            generatorModel: this.generatorModel,
            selectionStrategy,
            timeoutMs: requestedTotalTimeoutMs,
          }),
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
          runtime: buildRuntimeSummary({
            startedAt,
            llmProvider: this.writerProvider,
            researchProvider: this.researchProvider,
            researchModel: this.researchModel,
            gatekeeperProvider: this.gatekeeperProvider,
            writerProvider: this.writerProvider,
            writerModel: this.writerModel,
            reviewProvider: this.reviewProvider,
            reviewModel: this.reviewModel,
            gatekeeperModel: this.gatekeeperModel,
            generatorModel: this.generatorModel,
            selectionStrategy,
            timeoutMs: requestedTotalTimeoutMs,
          }),
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
      this.writerProvider,
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

    ensureRemainingBudget(
      startedAt,
      totalTimeoutMs,
      MIN_LLM_PIPELINE_BUDGET_MS,
      "LLM pipeline after connector rotation",
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
          this.gatekeeperClient,
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
        runtime: buildRuntimeSummary({
          startedAt,
          llmProvider: this.writerProvider,
          researchProvider: this.researchProvider,
          researchModel: this.researchModel,
          gatekeeperProvider: this.gatekeeperProvider,
          writerProvider: this.writerProvider,
          writerModel: this.writerModel,
          reviewProvider: this.reviewProvider,
          reviewModel: this.reviewModel,
          gatekeeperModel: this.gatekeeperModel,
          generatorModel,
          selectionStrategy,
          timeoutMs: totalTimeoutMs,
        }),
      };
    }

    iterations += 1;
    if (iterations > MAX_ITERATIONS) {
      throw new Error("MAX_ITERATIONS exceeded before post generation.");
    }

    const generatorBudget = remainingBudget(
      startedAt,
      totalTimeoutMs,
      FINAL_RESPONSE_RESERVE_MS,
      "post generation",
    );

    const generationPayload = focusPayloadForGeneration(payload, topic.topic);
    const emotionalAppraisal = buildMiroEmotionAppraisal(
      generationPayload,
      topic.topic,
    );
    const fallbackReasoning = buildTrustReasoning(
      generationPayload,
      emotionalAppraisal,
      gatekeeper,
      topic.topic,
    );
    const fallbackConfidence = confidenceFromAppraisal(emotionalAppraisal);

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
        runtime: buildRuntimeSummary({
          startedAt,
          llmProvider: this.writerProvider,
          researchProvider: this.researchProvider,
          researchModel: this.researchModel,
          gatekeeperProvider: this.gatekeeperProvider,
          writerProvider: this.writerProvider,
          writerModel: this.writerModel,
          reviewProvider: this.reviewProvider,
          reviewModel: this.reviewModel,
          gatekeeperModel: this.gatekeeperModel,
          generatorModel,
          selectionStrategy,
          timeoutMs: totalTimeoutMs,
        }),
      };
    }

    let researchBrief: MiroResearchBrief;
    try {
      const researchBudget = Math.min(
        remainingBudget(
          startedAt,
          totalTimeoutMs,
          2_200,
          "research synthesis",
        ),
        Math.min(timeoutProfile.gatekeeperCapMs, 3_200),
      );

      researchBrief = await runResearch({
        client: this.researchClient,
        model: this.researchModel,
        payload: generationPayload,
        targetLanguage: options.targetLanguage ?? "ru",
        timeoutMs: researchBudget,
        memoryContext,
        emotionalAppraisal,
      });

      pushEvidence(
        evidence,
        traceId,
        "research_synthesized",
        summarizeFacts(generationPayload),
        summarizeResearchBrief(researchBrief),
        "success",
        researchBrief.editorial_note,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      researchBrief = buildFallbackResearchBrief(generationPayload, topic.topic);

      pushEvidence(
        evidence,
        traceId,
        "research_synthesized",
        summarizeFacts(generationPayload),
        `${summarizeResearchBrief(researchBrief)} :: fallback after ${reason}`,
        "failed",
        reason,
      );
    }

    const writerBudget = Math.min(
      remainingBudget(
        startedAt,
        totalTimeoutMs,
        FINAL_RESPONSE_RESERVE_MS + 900,
        "post generation",
      ),
      timeoutProfile.generatorCapMs,
    );

    let qualityPayload = generationPayload;
    let qualityAppraisal = emotionalAppraisal;

    let post: MiroPost;
    try {
      post = await runGenerator({
        client: this.writerClient,
        model: generatorModel,
        payload: generationPayload,
        targetLanguage: options.targetLanguage ?? "ru",
        timeoutMs: writerBudget,
        maxTokens: timeoutProfile.generatorMaxTokens,
        emotionalAppraisal,
        memoryContext,
        fallbackReasoning,
        fallbackConfidence,
        researchBrief,
      });
      await localizePostObserved(
        post,
        this.writerClient,
        generatorModel,
        options.targetLanguage ?? "ru"
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      pushEvidence(
        evidence,
        traceId,
        "post_generation_failed",
        summarizeFacts(generationPayload),
        reason,
        "failed",
        "initial generator call",
      );
      return buildStructuredSkip({
        topic: topic.topic,
        payload,
        gatekeeper,
        reason,
        generatorModel,
      });
    }

    let reviewResult: MiroDraftReview | null = null;
    try {
      const reviewBudget = Math.min(
        remainingBudget(startedAt, totalTimeoutMs, FINAL_RESPONSE_RESERVE_MS, "draft review"),
        2_500,
      );

      reviewResult = await runDraftReview({
        client: this.reviewClient,
        model: this.reviewModel,
        payload: generationPayload,
        post,
        targetLanguage: options.targetLanguage ?? "ru",
        timeoutMs: reviewBudget,
        memoryContext,
        emotionalAppraisal,
        researchBrief,
      });

      pushEvidence(
        evidence,
        traceId,
        "draft_reviewed",
        post.title,
        summarizeReview(reviewResult),
        reviewResult.approved ? "success" : "skipped",
        reviewResult.rewrite_note,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      pushEvidence(
        evidence,
        traceId,
        "draft_reviewed",
        post.title,
        `review unavailable: ${reason}`,
        "failed",
        reason,
      );
    }

    if (reviewResult && !reviewResult.approved) {
      iterations += 1;
      if (iterations > MAX_ITERATIONS) {
        throw new Error("MAX_ITERATIONS exceeded before post revision.");
      }

      pushEvidence(
        evidence,
        traceId,
        "post_revision_requested",
        post.title,
        reviewResult.rewrite_note,
        "skipped",
        reviewResult.issues.join(" | "),
      );

      const revisionPayload = focusPayloadForGeneration(payload, topic.topic, "retry");
      const revisionAppraisal = buildMiroEmotionAppraisal(
        revisionPayload,
        topic.topic,
      );
      const revisionReasoning = buildTrustReasoning(
        revisionPayload,
        revisionAppraisal,
        gatekeeper,
        topic.topic,
      );
      const revisionConfidence = confidenceFromAppraisal(revisionAppraisal);
      const revisionBudget = remainingBudget(
        startedAt,
        totalTimeoutMs,
        FINAL_RESPONSE_RESERVE_MS,
        "post revision",
      );

      try {
        post = await runGenerator({
          client: this.writerClient,
          model: generatorModel,
          payload: revisionPayload,
          targetLanguage: options.targetLanguage ?? "ru",
          timeoutMs: Math.min(revisionBudget, timeoutProfile.generatorCapMs),
          maxTokens: timeoutProfile.generatorMaxTokens,
          emotionalAppraisal: revisionAppraisal,
          memoryContext,
          fallbackReasoning: revisionReasoning,
          fallbackConfidence: revisionConfidence,
          generationNote: buildRetryInstruction(memoryContext, reviewResult.rewrite_note),
          researchBrief,
          reviewNote: reviewResult.rewrite_note,
        });
        await localizePostObserved(
          post,
          this.writerClient,
          generatorModel,
          options.targetLanguage ?? "ru"
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        pushEvidence(
          evidence,
          traceId,
          "post_generation_failed",
          summarizeFacts(revisionPayload),
          reason,
          "failed",
          "revision generator call",
        );
        return buildStructuredSkip({
          topic: topic.topic,
          payload,
          gatekeeper,
          reason,
          generatorModel,
        });
      }

      qualityPayload = revisionPayload;
      qualityAppraisal = revisionAppraisal;
      reviewResult = null;
    }

    let qualityFailure = combineQualityOutcome(
      assessGeneratedDraft(post).reason,
      validatePostQuality(post, qualityPayload, topic.topic, qualityAppraisal),
    );

    if (qualityFailure) {
      pushEvidence(
        evidence,
        traceId,
        "post_quality_rejected",
        summarizeFacts(generationPayload),
        `${post.title}: ${qualityFailure}`,
        "skipped",
        "retrying with tighter focus",
      );

      iterations += 1;
      if (iterations > MAX_ITERATIONS) {
        throw new Error("MAX_ITERATIONS exceeded before post regeneration.");
      }

      const retryPayload = focusPayloadForGeneration(payload, topic.topic, "retry");
      const retryAppraisal = buildMiroEmotionAppraisal(retryPayload, topic.topic);
      const retryGeneratorBudget = remainingBudget(
        startedAt,
        totalTimeoutMs,
        FINAL_RESPONSE_RESERVE_MS,
        "post regeneration",
      );
      const retryReasoning = buildTrustReasoning(
        retryPayload,
        retryAppraisal,
        gatekeeper,
        topic.topic,
      );
      const retryConfidence = confidenceFromAppraisal(retryAppraisal);

      try {
        post = await runGenerator({
          client: this.writerClient,
          model: generatorModel,
          payload: retryPayload,
          targetLanguage: options.targetLanguage ?? "ru",
          timeoutMs: Math.min(
            retryGeneratorBudget,
            timeoutProfile.generatorCapMs,
          ),
          maxTokens: timeoutProfile.generatorMaxTokens,
          emotionalAppraisal: retryAppraisal,
          memoryContext,
          fallbackReasoning: retryReasoning,
          fallbackConfidence: retryConfidence,
          generationNote: buildRetryInstruction(memoryContext, qualityFailure),
        });
        await localizePostObserved(
          post,
          this.writerClient,
          generatorModel,
          options.targetLanguage ?? "ru"
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        pushEvidence(
          evidence,
          traceId,
          "post_generation_failed",
          summarizeFacts(retryPayload),
          reason,
          "failed",
          "retry generator call",
        );
        return buildStructuredSkip({
          topic: topic.topic,
          payload,
          gatekeeper,
          reason,
          generatorModel,
        });
      }

      qualityFailure = combineQualityOutcome(
        assessGeneratedDraft(post).reason,
        validatePostQuality(post, retryPayload, topic.topic, retryAppraisal),
      );

      if (qualityFailure) {
        pushEvidence(
          evidence,
          traceId,
          "post_quality_rejected",
          summarizeFacts(retryPayload),
          `${post.title}: ${qualityFailure}`,
          "skipped",
          "quality gate after retry",
        );

        return {
          status: "skipped",
          trace_id: traceId,
          topic: topic.topic,
          payload,
          gatekeeper,
          reason: qualityFailure,
          evidence,
          runtime: buildRuntimeSummary({
            startedAt,
            llmProvider: this.writerProvider,
            researchProvider: this.researchProvider,
            researchModel: this.researchModel,
            gatekeeperProvider: this.gatekeeperProvider,
            writerProvider: this.writerProvider,
            writerModel: this.writerModel,
            reviewProvider: this.reviewProvider,
            reviewModel: this.reviewModel,
            gatekeeperModel: this.gatekeeperModel,
            generatorModel,
            selectionStrategy,
            timeoutMs: totalTimeoutMs,
          }),
        };
      }
    }

    pushEvidence(
      evidence,
      traceId,
      "post_generated",
      summarizeFacts(generationPayload),
      `${post.category}: ${post.title}`,
      "success",
      "json_object parsed and normalized",
    );

    logger.log(
      `[MiroAgent] trace=${traceId} topic=${topic.topic} generated post="${post.title}"`,
    );

    return {
      status: "generated",
      trace_id: traceId,
      topic: topic.topic,
      payload,
      gatekeeper,
      post,
      evidence,
      runtime: buildRuntimeSummary({
        startedAt,
        llmProvider: this.writerProvider,
        researchProvider: this.researchProvider,
        researchModel: this.researchModel,
        gatekeeperProvider: this.gatekeeperProvider,
        writerProvider: this.writerProvider,
        writerModel: this.writerModel,
        reviewProvider: this.reviewProvider,
        reviewModel: this.reviewModel,
        gatekeeperModel: this.gatekeeperModel,
        generatorModel,
        selectionStrategy,
        timeoutMs: totalTimeoutMs,
      }),
    };
  }
}

async function localizePostObserved(
  post: MiroPost,
  client: GroqChatClientLike,
  model: string,
  targetLanguage: string
): Promise<void> {
  if (targetLanguage !== "ru") {
    return;
  }
  post.observed = await Promise.all(
    post.observed.map(async (fact) => {
      if (looksLikeRawEnglishSentence(fact)) {
        const coerced = coerceEnglishFactToRussianFallback(fact);
        if (coerced) {
          return coerced;
        }
        try {
          const completion = await withDeadline(
            client.chat.completions.create({
              model,
              temperature: 0.1,
              max_tokens: 150,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a professional news translator. Translate the given English sentence into natural Russian news style. Do NOT add explanations, intro/outro, or markdown. Output ONLY the translated Russian sentence.",
                },
                {
                  role: "user",
                  content: fact,
                },
              ],
            }),
            4000,
            "observed fact translation",
          );
          const translated = completion.choices?.[0]?.message?.content?.trim();
          if (translated) {
            return translated;
          }
        } catch (error) {
          // Fallback to original fact
        }
      }
      return fact;
    })
  );
}

export type {
  MiroAgentGeneratedResult,
  MiroAgentResult,
  MiroAgentSkippedResult,
};
