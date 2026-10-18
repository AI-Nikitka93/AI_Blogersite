import {
  buildGenerationNote,
  type MiroEmotionAppraisal,
  type MiroMemoryContext,
} from "./appraisal";
import { ensurePostShape, parseJsonObject, stripThinkBlocks } from "./parsing";
import { 
  FEW_SHOT_MESSAGES, 
  GENERATOR_SYSTEM_PROMPT, 
  COMPACT_GENERATOR_SYSTEM_PROMPT, 
  LONGFORM_JSON_WRAPPER_SYSTEM_PROMPT, 
  SINGLE_FACT_GENERATOR_SYSTEM_PROMPT,
  LONGFORM_ARTICLE_SYSTEM_PROMPT,
  SPORTS_LONGFORM_SYSTEM_PROMPT 
} from "./prompts";
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
    normalized.includes("qwen") ||
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
  const normalized = model.trim().toLowerCase();
  return (
    normalized !== "openai/gpt-oss-120b" &&
    !normalized.includes("qwen")
  );
}

function shouldUseFewShotMessages(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    !normalized.includes("qwen") &&
    normalized !== "openai/gpt-oss-120b" &&
    normalized !== "openai/gpt-oss-20b"
  );
}

function isLongformGeneration(model: string, payload: any): boolean {
  if (shouldUseCompactGeneratorPrompt(model)) return false;

  const factCount = payload.facts?.length || 0;
  if (factCount <= 1) return false;

  if (payload.category_hint === "Sports" || payload.category === "Sports") return true;

  const sourcesCount = (payload.corroborating_sources || []).length;
  return sourcesCount > 2 || model.trim().toLowerCase() === "openai/gpt-oss-120b";
}

function getSystemPrompt(model: string, payload: any, isLongform: boolean): string {
  if (isLongform) {
    return LONGFORM_JSON_WRAPPER_SYSTEM_PROMPT;
  }
  if (shouldUseCompactGeneratorPrompt(model)) {
    return COMPACT_GENERATOR_SYSTEM_PROMPT;
  }
  const factCount = payload.facts?.length || 0;
  if (factCount <= 1) {
    return SINGLE_FACT_GENERATOR_SYSTEM_PROMPT;
  }
  return GENERATOR_SYSTEM_PROMPT;
}

export async function runGenerator(
  options: GeneratorRunOptions,
): Promise<MiroPost> {
  const isLongform = isLongformGeneration(options.model, options.payload);
  const systemPrompt = getSystemPrompt(options.model, options.payload, isLongform);
  const useJsonMode = shouldUseProviderJsonMode(options.model);
  const useFewShot = shouldUseFewShotMessages(options.model);
  const compactInputEnvelope = shouldUseCompactInputEnvelope(options.model);
  const fewShotMessages = useFewShot ? FEW_SHOT_MESSAGES : [];

  const memoryContext = compactInputEnvelope
    ? {
        recent_titles: options.memoryContext.recent_titles.slice(0, 10),
        recent_categories: options.memoryContext.recent_categories.slice(0, 8),
      }
    : shouldUseCompactGeneratorPrompt(options.model)
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

  let preGeneratedArticle = "";
  if (isLongform) {
    console.log("[Generator] Initiating Step 1: Raw Markdown Longform Generation");
    const rawCompletion = await withDeadline(
      (signal) =>
        options.client.chat.completions.create(
          {
            model: options.model,
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 6000,
            messages: [
              {
                role: "system",
                content:
                  options.payload.category_hint === "Sports"
                    ? SPORTS_LONGFORM_SYSTEM_PROMPT
                    : LONGFORM_ARTICLE_SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: JSON.stringify(
                  {
                    current_date: new Date().toISOString().split("T")[0],
                    target_language: options.targetLanguage,
                    generation_note:
                      options.generationNote ??
                      buildGenerationNote(options.emotionalAppraisal, options.memoryContext),
                    review_note: options.reviewNote ?? "",
                    research_brief: researchBrief,
                    emotional_appraisal: options.emotionalAppraisal,
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
      "generator raw markdown call",
    );
    preGeneratedArticle = rawCompletion.choices?.[0]?.message?.content || "";
  }

  const completion = await withDeadline(
    (signal) =>
      options.client.chat.completions.create(
        {
          model: options.model,
          temperature: 0.65,
          top_p: 0.9,
          max_tokens: options.maxTokens ?? 3000,
          ...(useJsonMode && { response_format: { type: "json_object" } }),
          ...(shouldUseLowReasoningEffort(options.model)
            ? { reasoning_effort: "low" }
            : {}),
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...(useFewShot ? fewShotMessages : []),
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
                  memory_context: compactInputEnvelope ? undefined : memoryContext,
                  raw_input: options.payload,
                  pre_generated_article: isLongform ? stripThinkBlocks(preGeneratedArticle) : undefined,
                },
                null,
                compactInputEnvelope ? 0 : 2,
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
  const parsed = parseJsonObject<MiroPost>(raw, "Generator model");

  if (isLongform && preGeneratedArticle) {
    parsed.inferred = stripThinkBlocks(preGeneratedArticle);
  }

  if (Array.isArray(parsed.inferred)) {
    parsed.inferred = parsed.inferred.join("\n\n");
  }
  if (typeof parsed.inferred === "string") {
    parsed.inferred = stripThinkBlocks(parsed.inferred);
  }

  if (Array.isArray(parsed.opinion)) {
    parsed.opinion = parsed.opinion.join("\n\n");
  }
  if (typeof parsed.opinion === "string") {
    parsed.opinion = stripThinkBlocks(parsed.opinion);
  }

  return ensurePostShape(
    parsed,
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
