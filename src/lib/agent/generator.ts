import {
  buildGenerationNote,
  type MiroEmotionAppraisal,
  type MiroMemoryContext,
} from "./appraisal";
import { ensurePostShape, parseJsonObject } from "./parsing";
import { FEW_SHOT_MESSAGES, GENERATOR_SYSTEM_PROMPT } from "./prompts";
import { withDeadline } from "./runtime";
import { detectAssistantTone } from "./quality";
import type {
  GeneratedDraftAssessment,
  GeneratorRunOptions,
  MiroPost,
} from "./types";

export async function runGenerator(
  options: GeneratorRunOptions,
): Promise<MiroPost> {
  const completion = await withDeadline(
    options.client.chat.completions.create({
      model: options.model,
      temperature: 0.55,
      top_p: 0.9,
      frequency_penalty: 0.35,
      presence_penalty: 0.1,
      max_tokens: options.maxTokens,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: GENERATOR_SYSTEM_PROMPT,
        },
        ...FEW_SHOT_MESSAGES,
        {
          role: "user",
          content: JSON.stringify(
            {
              target_language: options.targetLanguage,
              generation_note:
                options.generationNote ??
                buildGenerationNote(
                  options.emotionalAppraisal,
                  options.memoryContext,
                ),
              review_note: options.reviewNote ?? "",
              research_brief: options.researchBrief ?? null,
              emotional_appraisal: options.emotionalAppraisal,
              memory_context: options.memoryContext,
              raw_input: options.payload,
            },
            null,
            2,
          ),
        },
      ],
    }),
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
