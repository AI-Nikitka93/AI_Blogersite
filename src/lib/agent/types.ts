import type { MiroCategoryHint, MiroFactsPayload } from "../connectors";
import type { MiroEmotionAppraisal, MiroMemoryContext } from "./appraisal";

export type MiroTopic =
  | "sports"
  | "markets_fx"
  | "markets_crypto"
  | "tech_world"
  | "world";

export type MiroSelectionStrategy =
  | "editorial_schedule"
  | "random"
  | "round_robin"
  | "urgent_override";

export type MiroLlmProvider = "groq" | "nvidia" | "openrouter";
export type MiroAgentRole = "research" | "writer" | "review";

export type MiroTrustConfidence = "high" | "medium" | "low";

export interface MiroGatekeeperResult {
  is_safe: boolean;
  reason: string;
}

export interface MiroPost {
  title: string;
  source: string;
  observed: string[];
  inferred: string;
  opinion: string;
  cross_signal: string;
  hypothesis: string;
  telegram_text?: string;
  reasoning: string;
  confidence: MiroTrustConfidence;
  category: MiroCategoryHint;
}

export interface MiroEvidenceRecord {
  trace_id: string;
  agent_id: string;
  action: string;
  input_summary: string;
  output_summary: string;
  timestamp: string;
  status: "success" | "failed" | "skipped";
  verifier_result?: string;
}

export interface MiroAgentRunOptions {
  forcedTopic?: MiroTopic;
  selectionStrategy?: MiroSelectionStrategy;
  targetLanguage?: "ru" | "en";
  totalTimeoutMs?: number;
  memoryContext?: MiroMemoryContext;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export interface MiroAgentRuntimeSummary {
  llm_provider: MiroLlmProvider;
  research_provider: MiroLlmProvider;
  research_model: string;
  writer_provider: MiroLlmProvider;
  writer_model: string;
  review_provider: MiroLlmProvider;
  review_model: string;
  gatekeeper_model: string;
  generator_model: string;
  selection_strategy: MiroSelectionStrategy;
  max_iterations: number;
  timeout_ms: number;
  elapsed_ms: number;
}

export interface MiroResearchBrief {
  focus: string;
  selected_facts: string[];
  why_it_matters: string;
  pressure: string;
  risks: string[];
  editorial_note: string;
  confidence: MiroTrustConfidence;
}

export interface MiroDraftReview {
  approved: boolean;
  issues: string[];
  rewrite_note: string;
}

export interface MiroAgentGeneratedResult {
  status: "generated";
  trace_id: string;
  topic: MiroTopic;
  payload: MiroFactsPayload;
  gatekeeper: MiroGatekeeperResult;
  post: MiroPost;
  evidence: MiroEvidenceRecord[];
  runtime: MiroAgentRuntimeSummary;
}

export interface MiroAgentSkippedResult {
  status: "skipped";
  trace_id: string;
  topic?: MiroTopic;
  payload?: MiroFactsPayload;
  gatekeeper?: MiroGatekeeperResult;
  reason: string;
  evidence: MiroEvidenceRecord[];
  runtime: MiroAgentRuntimeSummary;
}

export type MiroAgentResult = MiroAgentGeneratedResult | MiroAgentSkippedResult;

export interface MiroChatClientLike {
  chat: {
    completions: {
      create(params: Record<string, unknown>): Promise<{
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      }>;
    };
  };
}

export type GroqChatClientLike = MiroChatClientLike;

export interface MiroAgentConstructorOptions {
  provider?: MiroLlmProvider;
  apiKey?: string;
  baseUrl?: string;
  researchProvider?: MiroLlmProvider;
  researchModel?: string;
  reviewProvider?: MiroLlmProvider;
  reviewModel?: string;
  gatekeeperModel?: string;
  generatorModel?: string;
  selectionStrategy?: MiroSelectionStrategy;
  chatClient?: MiroChatClientLike;
  groqClient?: GroqChatClientLike;
}

export interface TopicDefinition {
  topic: MiroTopic;
  categoryLabel: string;
  fetchPayload: (requestTimeoutMs: number) => Promise<MiroFactsPayload>;
}

export interface TopicTimeoutProfile {
  totalTimeoutMs: number;
  connectorReserveMs: number;
  connectorCapMs: number;
  gatekeeperCapMs: number;
  generatorCapMs: number;
  generatorMaxTokens: number;
}

export interface GeneratorRunOptions {
  client: MiroChatClientLike;
  model: string;
  payload: MiroFactsPayload;
  targetLanguage: "ru" | "en";
  timeoutMs: number;
  maxTokens: number;
  emotionalAppraisal: MiroEmotionAppraisal;
  memoryContext: MiroMemoryContext;
  fallbackReasoning: string;
  fallbackConfidence: MiroTrustConfidence;
  generationNote?: string;
  researchBrief?: MiroResearchBrief;
  reviewNote?: string;
}

export interface GeneratedDraftAssessment {
  reason: string | null;
}
