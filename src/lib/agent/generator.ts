import {
  buildGenerationNote,
  type MiroEmotionAppraisal,
  type MiroMemoryContext,
} from "./appraisal";
import { ensurePostShape, parseJsonObject } from "./parsing";
import { FEW_SHOT_MESSAGES, GENERATOR_SYSTEM_PROMPT, COMPACT_GENERATOR_SYSTEM_PROMPT, LONGFORM_GENERATOR_SYSTEM_PROMPT, SINGLE_FACT_GENERATOR_SYSTEM_PROMPT } from "./prompts";
import { withDeadline } from "./runtime";
import { detectAssistantTone } from "./quality";
import type {
  GeneratedDraftAssessment,
  GeneratorRunOptions,
  MiroPost,
} from "./types";

function shouldUseCompactGeneratorPrompt(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    normalized === "llama-3.1-8b-instant" ||
    normalized === "openai/gpt-oss-20b" ||
    normalized.includes("deepseek") ||
    normalized.includes("minimax") ||
    normalized.endsWith(":free")
  );
}

function shouldUseLowReasoningEffort(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    normalized.startsWith("openai/gpt-oss-") ||
    normalized.includes("deepseek") ||
    normalized.includes("minimax")
  );
}

function shouldUseCompactInputEnvelope(model: string): boolean {
  return model.trim().toLowerCase() === "openai/gpt-oss-120b";
}

function shouldUseProviderJsonMode(model: string): boolean {
  return model.trim().toLowerCase() !== "openai/gpt-oss-120b";
}

function shouldUseFewShotMessages(model: string): boolean {
  return model.trim().toLowerCase() !== "openai/gpt-oss-120b";
}

function getSystemPrompt(model: string, factCount: number): string {
  if (factCount <= 1) {
    return SINGLE_FACT_GENERATOR_SYSTEM_PROMPT;
  }

  const normalized = model.trim().toLowerCase();
  if (normalized === "openai/gpt-oss-120b") {
    return LONGFORM_GENERATOR_SYSTEM_PROMPT;
  }

  return shouldUseCompactGeneratorPrompt(model)
    ? COMPACT_GENERATOR_SYSTEM_PROMPT
    : GENERATOR_SYSTEM_PROMPT;
}

export async function runGenerator(
  options: GeneratorRunOptions,
): Promise<MiroPost> {
  const compactPrompt = shouldUseCompactGeneratorPrompt(options.model);
  const compactInputEnvelope = shouldUseCompactInputEnvelope(options.model);
  const fewShotMessages = shouldUseFewShotMessages(options.model)
    ? FEW_SHOT_MESSAGES
    : [];
  const memoryContext = compactInputEnvelope
    ? {
        recent_titles: options.memoryContext.recent_titles.slice(0, 10),
        recent_categories: options.memoryContext.recent_categories.slice(0, 8),
      }
    : compactPrompt
      ? {
          recent_titles: options.memoryContext.recent_titles.slice(0, 10),
          recent_categories: options.memoryContext.recent_categories.slice(0, 8),
        }
      : options.memoryContext;
  const researchBrief = compactInputEnvelope
    ? options.researchBrief
      ? {
          focus: options.researchBrief.focus,
          pressure: options.researchBrief.pressure,
          editorial_note: options.researchBrief.editorial_note,
          confidence: options.researchBrief.confidence,
          selected_facts: options.researchBrief.selected_facts.slice(0, 2),
        }
      : null
    : options.researchBrief ?? null;
  const completion = await withDeadline(
    (signal) =>
      options.client.chat.completions.create(
        {
          model: options.model,
          temperature: 0.55,
          top_p: 0.9,
          frequency_penalty: 0.35,
          presence_penalty: 0.1,
          max_tokens: options.maxTokens,
          ...(shouldUseProviderJsonMode(options.model)
            ? {
                response_format: {
                  type: "json_object",
                },
              }
            : {}),
          ...(shouldUseLowReasoningEffort(options.model)
            ? { reasoning_effort: "low" }
            : {}),
          messages: [
            {
              role: "system",
              content: getSystemPrompt(
                options.model,
                options.payload.facts.length,
              ),
            },
            ...(compactPrompt ? [] : fewShotMessages),
            {
              role: "user",
              content: JSON.stringify(
                {
                  current_date: new Date().toISOString().split("T")[0],
                  target_language: options.targetLanguage,
                  generation_note:
                    options.generationNote ??
                    buildGenerationNote(
                      options.emotionalAppraisal,
                      options.memoryContext,
                    ),
                  review_note: options.reviewNote ?? "",
                  research_brief: researchBrief,
                  emotional_appraisal: options.emotionalAppraisal,
                  memory_context: memoryContext,
                  raw_input: options.payload,
                },
                null,
                2,
              ),
            },
          ],
        },
        { signal },
      ),
    options.timeoutMs,
    "generator model call",
  );

  const raw = completion.choices?.[0]?.message?.content;
  return ensurePostShape(
    parseJsonObject<MiroPost>(raw, "Generator model"),
    options.payload,
    options.fallbackReasoning,
    options.fallbackConfidence,
  );
}

export function assessGeneratedDraft(post: MiroPost): GeneratedDraftAssessment {
  return {
    reason: detectAssistantTone(post),
  };
}
